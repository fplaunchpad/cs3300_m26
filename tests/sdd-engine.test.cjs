// Run with: node --test tests/sdd-engine.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/sdd-engine.js');
const compile = (name, input, source) => S.compile(source || S.presets[name].source, input ?? S.presets[name].input, S.presets[name].output);
function evaluateAST(node, vars) {
  if (!node.children.length) return /^\d/.test(node.label) ? Number(node.label) : vars[node.label];
  const [a,b] = node.children.map(n => evaluateAST(n,vars));
  return ({ '+': () => a+b, '-': () => a-b, '*': () => a*b })[node.label]();
}

test('lecture ASTs preserve precedence and left associativity across both grammars', () => {
  const cases = new Map([
    ['x - 2 * y', '-(x, *(2, y))'],
    ['x - y - z', '-(-(x, y), z)'],
    ['x * y * z', '*(*(x, y), z)'],
    ['x + y * z - 4', '-(+(x, *(y, z)), 4)'],
    ['(x + y) * (z - 2)', '*(+(x, y), -(z, 2))'],
    ['42', '42']
  ]);
  for (const [input, expected] of cases) for (const mode of ['ast','inherited']) assert.equal(S.format(compile(mode,input).result),expected);
});

test('every trace is a valid dependency order and each attribute is evaluated once', () => {
  for (const mode of Object.keys(S.presets)) {
    const run = compile(mode), ready = new Set(run.initial.keys());
    for (const {eq} of run.trace) {
      assert.ok(eq.deps.every(d => ready.has(d)), eq.key);
      assert.ok(!ready.has(eq.key), eq.key); ready.add(eq.key);
    }
    assert.ok(ready.has(run.resultKey));
    assert.equal(run.trace.length,run.equations.length);
  }
  assert.ok(compile('inherited').trace.some(t => t.eq.kind === 'inherited'));
});

test('arithmetic IR agrees with independent AST evaluation over expressions and environments', () => {
  const inputs = ['x - 2 * y', 'x - y - z', '(x + y) * (z - 2)', 'x * (y + z * 3) - 1.5', '42', 't1 + x'];
  for (const input of inputs) {
    const ast = compile('ast',input), ir = compile('arithmetic',input);
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) {
      const vars = { x, y, z:3, t1:100 };
      const actual = S.execute(ir.result,new Map(Object.entries(vars)),ir.values.get('n0.addr')).result;
      assert.equal(actual,evaluateAST(ast.result,vars), input);
    }
  }
});

test('boolean IR implements the slide example and visits only required comparisons', () => {
  const ir = compile('boolean');
  for (const [x,y,expected,count] of [[50,250,true,1],[150,250,false,2],[250,250,false,3],[250,0,true,3],[100,0,false,2],[200,0,false,2]]) {
    const result = S.execute(ir.result,`x=${x}, y=${y}`);
    assert.equal(result.result,expected);
    assert.equal(result.trace.filter(t => ir.result[t.index].kind === 'bin').length,count);
  }
});

test('boolean precedence, negation, constants, relation operators, and nested arithmetic', () => {
  const cases = [
    ['true || false && false',true], ['!true || false',false], ['!(false || true) && true',false],
    ['x + 2 * y >= z && !(x == y)',true], ['(x + y) * 2 < z || x <= y',false],
    ['false || x != y && z > 1',true], ['!!true',true], ['(x) < (y)',false]
  ];
  for (const [input,expected] of cases) assert.equal(S.execute(compile('boolean',input).result,'x=4, y=3, z=9').result,expected,input);
});

test('short circuit never reads variables in skipped branches', () => {
  for (const [input,expected] of [['true || missing > 0',true],['false && missing > 0',false]]) {
    assert.equal(S.execute(compile('boolean',input).result,'').result,expected);
  }
  assert.throws(() => S.execute(compile('boolean','false || missing > 0').result,''), /No value for missing/);
});

test('changing an equation changes executable semantics', () => {
  const source = S.presets.ast.source.replace('Node("-", left.node, right.node)', 'Node("-", right.node, left.node)');
  assert.equal(S.format(compile('ast','x - y',source).result),'-(y, x)');
});

test('editable grammar supports epsilon, left recursion, and independent nullable occurrences', () => {
  const source = `S -> A@left A@right
  left.in = Leaf("x")
  right.in = Leaf("y")
  self.node = Node("+", left.node, right.node)
A -> epsilon
  self.node = self.in`;
  const run = S.compile(source,'');
  assert.equal(S.format(run.result),'+(x, y)');
  assert.notEqual(run.root.children[0].id,run.root.children[1].id);
  assert.equal(S.format(S.compile('S -> S@left + id\n self.node = Node("+", left.node, Leaf(id.lexeme))\nS -> id\n self.node = Leaf(id.lexeme)','x + y + z').result),'+(+(x, y), z)');
});

test('reports cycles, missing definitions, duplicate assignments, and invalid helpers', () => {
  assert.throws(() => S.compile('S -> id\n self.node = self.node','x'),/Cyclic/);
  assert.throws(() => S.compile('S -> id\n self.node = self.missing','x'),/Missing definition/);
  assert.throws(() => S.compile('S -> id\n self.node = Leaf(id.lexeme)\n self.node = Leaf("a")','x'),/Multiple definitions/);
  assert.throws(() => S.compile('S -> id\n self.node = eval("alert(1)")','x'),/Unknown helper/);
  assert.throws(() => S.compile('S -> id\n self.node = Leaf(id.lexeme)\n id.lexeme = "a"','x'),/terminal attributes/);
  assert.throws(() => S.compile('S -> A A\n self.node = A.node\nA -> id\n self.node = Leaf(id.lexeme)','x x'),/repeated alias/);
  assert.throws(() => S.compile('S -> id\n self.node = Node("+", 1, 2)','x'),/AST operands/);
});

test('malformed inputs and ambiguous grammars are rejected', () => {
  for (const input of ['x +','(x + y','x y','x / y','', 'x; alert(1)']) assert.throws(() => compile('ast',input));
  const ambiguous = 'E -> E@left + E@right\n self.node = Node("+", left.node, right.node)\nE -> id\n self.node = Leaf(id.lexeme)';
  assert.throws(() => S.compile(ambiguous,'x + y + z'),/multiple parse trees/);
  assert.throws(() => compile('ast',Array(70).fill('x').join('+')),/at most 60 tokens/);
});

test('IR runtime diagnoses bad bindings, labels, and loops', () => {
  assert.throws(() => S.environment('x=alert(1)'),/Invalid variable binding/);
  assert.throws(() => S.environment('x=1, x=2'),/Duplicate binding/);
  assert.throws(() => S.execute([{kind:'jump',label:'missing'}],''),/Undefined label/);
  assert.throws(() => S.execute([{kind:'label',label:'L1'},{kind:'jump',label:'L1'}],''),/exceeded/);
});
