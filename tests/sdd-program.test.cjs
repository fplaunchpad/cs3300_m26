const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/sdd-engine.js');
const P = require('../assets/sdd-program.js');
const compile = input => S.compile(P.source,input,'code',P.limits);
const execute = (input,bindings='',options={}) => S.execute(compile(input).result,bindings,undefined,{maxSteps:10000,...options});

test('all whole-program examples translate and execute', () => {
  const expected = {sum:65,factorial:120,nested:25,gcd:6,guarded:-1};
  for (const [name,example] of Object.entries(P.examples)) {
    const model = compile(example.input), run = S.execute(model.result,example.env,undefined,{maxSteps:10000});
    assert.deepEqual(run.output,[expected[name]],name);
    const ready = new Set(model.initial.keys());
    for (const {eq} of model.trace) { assert.ok(eq.deps.every(d => ready.has(d))); ready.add(eq.key); }
    const labels = new Set(model.result.filter(i => i.kind==='label').map(i=>i.label));
    for (const i of model.result) if (i.kind==='jump'||i.kind==='branch') assert.ok(labels.has(i.label));
  }
});

test('if/else branches and while exits join the following statements correctly', () => {
  const code = `x = 0;
while (x < n) {
  if (x % 2 == 0) { y = y + 10; } else { y = y + 1; }
  x = x + 1;
}
if (x == 0) { y = 7; }
print(y); print(x);`;
  for(let n=0;n<=9;n++) {
    const expected=n===0?7:Math.ceil(n/2)*10+Math.floor(n/2);
    assert.deepEqual(execute(code,`n=${n}, y=0`).output,[expected,n]);
  }
  assert.deepEqual(execute('if (true) { if (false) { print(1); } else { print(2); } } else { print(3); } print(4);').output,[2,4]);
  assert.deepEqual(execute('while (false) { print(missing); } print(9);').output,[9]);
});

test('nested loops preserve independent test labels and mutable variable values', () => {
  const code = `i=0; s=0; while (i < n) { j=0; while (j < m) { s=s+i*j; j=j+1; } i=i+1; } print(s);`;
  for (let n=0;n<=5;n++) for (let m=0;m<=5;m++) {
    let expected=0; for(let i=0;i<n;i++) for(let j=0;j<m;j++) expected+=i*j;
    assert.deepEqual(execute(code,`n=${n}, m=${m}`).output,[expected]);
  }
});

test('arithmetic supports unary minus, real division, remainder, and comments', () => {
  assert.deepEqual(execute('// comment\nx = -(2 + 3) * 4; /* comment\n*/ print(x); print(7/2); print(-7%3); print(8/2*3);').output,[-20,3.5,-1,12]);
  assert.deepEqual(execute('{} /* empty block */').output,[]);
  assert.deepEqual(execute('// empty program').output,[]);
});

test('short-circuit program guards skip division and uninitialized variables', () => {
  assert.deepEqual(execute(P.examples.guarded.input,'x=0,y=12').output,[-1]);
  assert.deepEqual(execute(P.examples.guarded.input,'x=3,y=12').output,[4]);
  assert.deepEqual(execute('if (true || missing > 0) { print(1); }').output,[1]);
  assert.deepEqual(execute('if (false && 1 / 0 > 0) { print(1); } else { print(2); }').output,[2]);
});

test('source maps link generated instructions to their source and defining equation', () => {
  const model=compile('x = 2;\n// note\nprint(x + 1);');
  const copy=model.result.find(i=>i.kind==='copy'), print=model.result.find(i=>i.kind==='print');
  assert.equal(copy.origin.line,1); assert.equal(print.origin.line,3);
  assert.equal(model.input.slice(copy.origin.start,copy.origin.end),'x = 2;');
  for (const i of model.result) assert.ok(model.byKey.has(i.origin.equation));
});

test('runtime trace replays writes and output exactly, including repeat execution', () => {
  const run=execute('x=0; while(x < 4) { print(x); x=x+1; }');
  const values=new Map(run.initialValues), output=[];
  for(const entry of run.trace) {
    if(entry.write) values.set(...entry.write);
    if(entry.printed!==null) output.push(entry.printed);
  }
  assert.deepEqual(values,run.values); assert.deepEqual(output,[0,1,2,3]);
  assert.ok(run.trace.length>run.visited.size);
});

test('runtime errors preserve the completed trace and fail before corrupting state', () => {
  for(const source of ['x=2; print(x/0);','x=2; print(x%0);','x=2; print(missing);']) {
    const run=execute(source,'',{captureErrors:true});
    assert.ok(run.error); assert.equal(run.values.get('x'),2); assert.deepEqual(run.output,[]);
    assert.ok(run.trace.length>0);
  }
  const loop=execute('x=0; while(true) { x=x+1; }','',{maxSteps:100,captureErrors:true});
  assert.match(loop.error,/exceeded 100/); assert.equal(loop.trace.length,100);
  assert.throws(()=>execute('print(1/0);'),/zero/);
});

test('program parser diagnoses syntax errors and reserves keywords', () => {
  for(const source of ['x=1','while (x<3) x=x+1;','if (true) {print(1);','if (x) {print(1);}', 'print = 2;', 'if = 1;', 'true = 0;']) assert.throws(()=>compile(source));
  assert.throws(()=>compile('x=1;\nprint(@);'),/Unexpected character/);
  assert.throws(()=>compile('/* unclosed'),/Unterminated block comment/);
});

test('larger programs exceed the expression limit while remaining supported', () => {
  const source=Array.from({length:50},(_,i)=>`v${i}=${i};`).join('\n')+'\nprint(v49);';
  const model=compile(source); assert.ok(model.tokens.length>60);
  assert.deepEqual(S.execute(model.result,'').output,[49]);
  assert.throws(()=>compile(Array(130).fill('x=1;').join('')),/at most 500 tokens/);
});

test('editing a statement SDD equation changes program translation', () => {
  const source=P.source.replace('print(E.addr)','print("42")');
  const model=S.compile(source,'print(9);','code',P.limits);
  assert.deepEqual(S.execute(model.result,'').output,[42]);
});
