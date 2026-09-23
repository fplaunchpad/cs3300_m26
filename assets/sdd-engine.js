/* Dependency-driven SDD evaluator. No eval, Function, or runtime dependencies. */
(function (root) {
  "use strict";
  const fail = message => { throw new Error(message); };
  const LIMIT = 16000;
  const presets = {};
  const astFactors = `
F -> id
  self.node = Leaf(id.lexeme)
F -> num
  self.node = Leaf(num.lexeme)
F -> ( E )
  self.node = E.node`;
  presets.ast = {
    title: "AST · synthesized", input: "x - 2 * y", output: "node",
    note: "Example 1: attributes flow up the left-recursive parse tree. The AST keeps operators and operands, with multiplication nested under subtraction. Numbers and parentheses extend the slide grammar.",
    source: `E -> E@left + T@right
  self.node = Node("+", left.node, right.node)
E -> E@left - T@right
  self.node = Node("-", left.node, right.node)
E -> T
  self.node = T.node
T -> T@left * F@right
  self.node = Node("*", left.node, right.node)
T -> F
  self.node = F.node${astFactors}`
  };
  presets.inherited = {
    title: "AST · inherited", input: "x - 2 * y - z", output: "node",
    note: "Example 2: E′.in and T′.in carry the accumulated left operand into the right-recursive tails. The resulting AST is still left-associative. Subtraction, numbers, and parentheses extend the slide grammar.",
    source: `E -> T E'@tail
  tail.in = T.node
  self.node = tail.node
E' -> + T E'@tail
  tail.in = Node("+", self.in, T.node)
  self.node = tail.node
E' -> - T E'@tail
  tail.in = Node("-", self.in, T.node)
  self.node = tail.node
E' -> epsilon
  self.node = self.in
T -> F T'@tail
  tail.in = F.node
  self.node = tail.node
T' -> * F T'@tail
  tail.in = Node("*", self.in, F.node)
  self.node = tail.node
T' -> epsilon
  self.node = self.in${astFactors}`
  };
  const arithmetic = `E -> E@left + T@right
  self.temp = newTemp()
  self.addr = self.temp
  self.code = concat(left.code, right.code, bin(self.temp, "+", left.addr, right.addr))
E -> E@left - T@right
  self.temp = newTemp()
  self.addr = self.temp
  self.code = concat(left.code, right.code, bin(self.temp, "-", left.addr, right.addr))
E -> T
  self.addr = T.addr
  self.code = T.code
T -> T@left * F@right
  self.temp = newTemp()
  self.addr = self.temp
  self.code = concat(left.code, right.code, bin(self.temp, "*", left.addr, right.addr))
T -> F
  self.addr = F.addr
  self.code = F.code
F -> id
  self.addr = id.lexeme
  self.code = empty()
F -> num
  self.addr = num.lexeme
  self.code = empty()
F -> ( E )
  self.addr = E.addr
  self.code = E.code`;
  presets.arithmetic = {
    title: "IR · arithmetic", input: "x - 2 * y", output: "code", env: "x=10, y=3",
    note: "Synthesize .addr and .code to generate three-address code. Each operator allocates a fresh temporary; the root's .addr holds the result. Run the generated instructions with your own variable values.",
    source: arithmetic
  };
  const pass = child => `  ${child}.true = self.true
  ${child}.false = self.false
  self.code = ${child}.code`;
  presets.boolean = {
    title: "IR · short circuit", input: "x < 100 || (x > 200 && x != y)", output: "code", env: "x=50, y=250",
    note: "The slide's .true and .false destinations flow down; .code flows up. B, C, and D encode precedence (||, &&, !). Root supplies exit labels. Running the IR shows which comparisons short-circuit evaluation skips.",
    source: `Root -> B
  B.true = "L_true"
  B.false = "L_false"
  self.code = B.code
B -> B@left || C@right
  left.true = self.true
  left.false = newLabel()
  right.true = self.true
  right.false = self.false
  self.code = concat(left.code, label(left.false), right.code)
B -> C
${pass("C")}
C -> C@left && D@right
  left.true = newLabel()
  left.false = self.false
  right.true = self.true
  right.false = self.false
  self.code = concat(left.code, label(left.true), right.code)
C -> D
${pass("D")}
D -> ! D@child
  child.true = self.false
  child.false = self.true
  self.code = child.code
D -> ( B )
${pass("B")}
D -> E@left rel E@right
  self.temp = newTemp()
  self.code = concat(left.code, right.code, bin(self.temp, rel.lexeme, left.addr, right.addr), branch(self.temp, self.true, self.false))
D -> true
  self.code = jump(self.true)
D -> false
  self.code = jump(self.false)
${arithmetic}`
  };

  // Expressions deliberately support only literals, attribute references, and named helpers.
  const arities = { Leaf: 1, Node: 3, newTemp: 0, newLabel: 0, empty: 0, concat: -1, bin: 4, branch: 3, jump: 1, label: 1, copy: 2, print: 1 };
  function expression(source) {
    const tokens = []; let p = 0;
    while (p < source.length) {
      const m = /^(\s+|"(?:[^"\\]|\\.)*"|[A-Za-z_]\w*|-?\d+(?:\.\d+)?|[.,()])/.exec(source.slice(p));
      if (!m) fail(`Invalid rule expression near “${source.slice(p, p + 25)}”.`);
      if (!/^\s/.test(m[0])) tokens.push(m[0]);
      p += m[0].length;
    }
    let i = 0;
    const take = t => { if (tokens[i++] !== t) fail(`Expected “${t}” in ${source}.`); };
    function read() {
      const t = tokens[i++];
      if (!t) fail(`Incomplete expression: ${source}.`);
      if (t[0] === '"') { try { return { type: "literal", value: JSON.parse(t) }; } catch (_) { fail("Invalid quoted string."); } }
      if (/^-?\d/.test(t)) return { type: "literal", value: Number(t) };
      if (!/^[A-Za-z_]\w*$/.test(t)) fail(`Expected a helper or attribute, got ${t}.`);
      if (tokens[i] === ".") {
        i++; const attr = tokens[i++];
        if (!/^[A-Za-z_]\w*$/.test(attr || "")) fail("Expected an attribute name after '.'.");
        return { type: "ref", alias: t, attr };
      }
      take("("); const args = [];
      if (tokens[i] !== ")") { args.push(read()); while (tokens[i] === ",") { i++; args.push(read()); } }
      take(")");
      if (!Object.hasOwn(arities, t)) fail(`Unknown helper “${t}”.`);
      if (arities[t] >= 0 && args.length !== arities[t]) fail(`${t} expects ${arities[t]} arguments.`);
      return { type: "call", name: t, args };
    }
    const result = read();
    if (i !== tokens.length) fail(`Unexpected text in ${source}.`);
    return result;
  }
  function references(expr) {
    return expr.type === "ref" ? [expr] : expr.type === "call" ? expr.args.flatMap(references) : [];
  }
  function grammar(source) {
    if (source.length > 30000) fail("Keep the SDD under 30,000 characters.");
    const productions = []; let current;
    source.split(/\r?\n/).forEach((raw, index) => {
      const line = raw.trim();
      if (!line || line.startsWith("#")) return;
      const head = /^([A-Za-z_][\w']*)\s*->\s*(.*)$/.exec(line);
      if (head) {
        const parts = head[2] === "epsilon" || head[2] === "ε" || !head[2] ? [] : head[2].split(/\s+/);
        const rhs = parts.map(part => {
          const bits = part.split("@");
          if (bits.length > 2 || (bits[1] && !/^[A-Za-z_]\w*$/.test(bits[1]))) fail(`Line ${index + 1}: invalid symbol alias.`);
          return { symbol: bits[0], alias: bits[1] || bits[0].replace(/'/g, "_prime") };
        });
        current = { id: productions.length, lhs: head[1], rhs, rules: [], line: index + 1 };
        productions.push(current); return;
      }
      if (!current) fail(`Line ${index + 1}: start with a production, such as E -> T.`);
      const eq = /^([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(line);
      if (!eq) fail(`Line ${index + 1}: expected alias.attribute = expression.`);
      try { current.rules.push({ alias: eq[1], attr: eq[2], expr: expression(eq[3]), text: line, line: index + 1 }); }
      catch (error) { fail(`Line ${index + 1}: ${error.message}`); }
    });
    if (!productions.length) fail("Enter at least one production.");
    const nonterminals = new Set(productions.map(p => p.lhs));
    for (const prod of productions) {
      const aliases = new Map([["self", true]]);
      prod.rhs.forEach(part => aliases.set(part.alias, !aliases.has(part.alias)));
      for (const rule of prod.rules) {
        for (const ref of [rule, ...references(rule.expr)]) {
          if (!aliases.get(ref.alias)) fail(`Line ${rule.line}: unknown or repeated alias “${ref.alias}”; use distinct @aliases.`);
        }
        if (rule.alias !== "self" && !nonterminals.has(prod.rhs.find(p => p.alias === rule.alias).symbol)) {
          fail(`Line ${rule.line}: terminal attributes are supplied by the lexer.`);
        }
      }
    }
    return { productions, nonterminals, start: productions[0].lhs };
  }
  function tokenize(input, g, limits) {
    if (input.length > limits.chars) fail(`Keep the input under ${limits.chars} characters.`);
    const literals = [...new Set(g.productions.flatMap(p => p.rhs.map(s => s.symbol)))].filter(s => !g.nonterminals.has(s) && !["id", "num", "rel"].includes(s)).sort((a, b) => b.length - a.length);
    const tokens = []; let p = 0;
    while (p < input.length) {
      if (/\s/.test(input[p])) { p++; continue; }
      if (input.startsWith("//", p)) { const end = input.indexOf("\n", p); p = end < 0 ? input.length : end; continue; }
      if (input.startsWith("/*", p)) {
        const end = input.indexOf("*/", p + 2);
        if (end < 0) fail("Unterminated block comment; expected */.");
        p = end + 2; continue;
      }
      const text = input.slice(p);
      const word = /^[A-Za-z_]\w*/.exec(text), number = /^\d+(?:\.\d+)?/.exec(text);
      let lexeme, kind;
      if (word) { lexeme = word[0]; kind = literals.includes(lexeme) ? "literal" : "id"; }
      else if (number) { lexeme = number[0]; kind = "num"; }
      else {
        lexeme = [...literals, "<=", ">=", "==", "!=", "<", ">"].sort((a,b) => b.length-a.length).find(s => text.startsWith(s));
        if (!lexeme) fail(`Unexpected character “${input[p]}” at column ${p + 1}.`);
        kind = "literal";
      }
      const line = input.slice(0, p).split("\n").length, column = p - input.lastIndexOf("\n", p - 1);
      tokens.push({ lexeme, kind, column, line, start: p, end: p + lexeme.length }); p += lexeme.length;
      if (tokens.length > limits.tokens) fail(`Use at most ${limits.tokens} tokens to keep the diagrams readable.`);
    }
    return tokens;
  }
  // Earley chart with derivation identities: supports left recursion and epsilon,
  // and reports ambiguous inputs rather than silently picking a semantic meaning.
  function parse(g, input, options = {}) {
    const limits = { chars: 600, tokens: 60, nodes: 500, states: LIMIT, ...options };
    const tokens = tokenize(input, g, limits), chart = Array.from({ length: tokens.length + 1 }, () => []);
    const seen = chart.map(() => new Set()); let work = 0, nextId = 0;
    const leaves = tokens.map(t => ({ id: nextId++, symbol: t.kind, token: t, children: [] }));
    function add(end, prod, dot, start, children) {
      const key = `${prod.id}/${dot}/${start}/${children.map(c => c.id).join(",")}`;
      if (seen[end].has(key)) return;
      if (++work > limits.states) fail("Parsing limit reached. Simplify the grammar/input; check for ambiguity or nullable cycles.");
      seen[end].add(key); chart[end].push({ prod, dot, start, children, node: null });
    }
    g.productions.filter(p => p.lhs === g.start).forEach(p => add(0, p, 0, 0, []));
    for (let end = 0; end < chart.length; end++) {
      for (let q = 0; q < chart[end].length; q++) {
        const state = chart[end][q], part = state.prod.rhs[state.dot];
        if (!part) {
          state.node = { id: nextId++, symbol: state.prod.lhs, prod: state.prod, children: state.children };
          for (const waiting of chart[state.start].slice()) {
            if (waiting.prod.rhs[waiting.dot]?.symbol === state.prod.lhs) add(end, waiting.prod, waiting.dot + 1, waiting.start, [...waiting.children, state.node]);
          }
        } else if (g.nonterminals.has(part.symbol)) {
          g.productions.filter(p => p.lhs === part.symbol).forEach(p => add(end, p, 0, end, []));
          for (const complete of chart[end].slice()) {
            if (complete.start === end && complete.node && complete.prod.lhs === part.symbol) add(end, state.prod, state.dot + 1, state.start, [...state.children, complete.node]);
          }
        } else if (tokens[end]) {
          const t = tokens[end];
          if (t.lexeme === part.symbol || t.kind === part.symbol || (part.symbol === "rel" && /^(<|>|<=|>=|==|!=)$/.test(t.lexeme))) {
            add(end + 1, state.prod, state.dot + 1, state.start, [...state.children, leaves[end]]);
          }
        }
      }
    }
    const roots = chart[tokens.length].filter(s => s.node && s.start === 0 && s.prod.lhs === g.start).map(s => s.node);
    if (!roots.length) {
      let last = 0; chart.forEach((states, i) => { if (states.length) last = i; });
      const expected = [...new Set(chart[last].map(s => s.prod.rhs[s.dot]?.symbol).filter(s => s && !g.nonterminals.has(s)))];
      fail(`Cannot parse ${tokens[last] ? `“${tokens[last].lexeme}” at line ${tokens[last].line}, column ${tokens[last].column}` : "the end of input"}. Expected ${expected.join(", ") || "a complete expression"}.`);
    }
    if (roots.length > 1) fail("This input has multiple parse trees. Make the grammar unambiguous before evaluating its SDD.");
    // A chart can share nullable subtrees; each occurrence needs its own attributes.
    let copies = 0;
    function clone(node) {
      if (++copies > limits.nodes) fail(`The parse tree exceeds ${limits.nodes} occurrences. Simplify the input or grammar.`);
      return { ...node, children: node.children.map(clone) };
    }
    const root = clone(roots[0]), nodes = [];
    function visit(node, parent) {
      node.id = nodes.length; node.parent = parent; nodes.push(node);
      node.children.forEach((child, i) => { if (child.token) child.symbol = node.prod.rhs[i].symbol; visit(child, node); });
      const spans = node.children.map(child => child.span).filter(Boolean);
      node.span = node.token ? { line: node.token.line, column: node.token.column, start: node.token.start, end: node.token.end } : spans.length ? { ...spans[0], end: spans[spans.length - 1].end } : null;
    }
    visit(root, null); return { root, nodes, tokens };
  }
  const isAST = value => value && value.kind === "ast";
  const isCode = value => Array.isArray(value) && value.every(i => i && ["bin", "branch", "jump", "label", "copy", "print"].includes(i.kind));
  function helpers() {
    let temp = 0, label = 0;
    const str = x => { if (typeof x !== "string" && typeof x !== "number") fail("Expected text or a number."); return String(x); };
    const destination = x => { x = str(x); if (!/^[A-Za-z_]\w*$/.test(x)) fail(`Invalid label ${x}.`); return x; };
    return {
      Leaf: value => ({ kind: "ast", label: str(value), children: [], size: 1 }),
      Node: (op, left, right) => {
        if (!isAST(left) || !isAST(right)) fail("Node expects two AST operands.");
        const size = 1 + left.size + right.size;
        if (size > 2000) fail("AST exceeds 2,000 nodes. Check for repeated subtree duplication.");
        return { kind: "ast", label: str(op), children: [left, right], size };
      },
      newTemp: () => `%t${++temp}`, newLabel: () => `L${++label}`, empty: () => [],
      concat: (...parts) => {
        if (!parts.every(isCode)) fail("concat expects code fragments.");
        if (parts.reduce((n, p) => n + p.length, 0) > 4000) fail("Generated IR exceeds 4,000 instructions.");
        return parts.flat();
      },
      bin: (target, op, left, right) => {
        op = str(op); if (!["+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!="].includes(op)) fail(`Unsupported IR operator ${op}.`);
        target = str(target); if (!/^%t\d+$/.test(target)) fail("bin's destination must be a temporary from newTemp().");
        return [{ kind: "bin", target, op, left: str(left), right: str(right) }];
      },
      branch: (addr, yes, no) => [{ kind: "branch", addr: str(addr), label: destination(yes) }, { kind: "jump", label: destination(no) }],
      jump: name => [{ kind: "jump", label: destination(name) }], label: name => [{ kind: "label", label: destination(name) }],
      copy: (target, addr) => [{ kind: "copy", target: destination(target), addr: str(addr) }],
      print: addr => [{ kind: "print", addr: str(addr) }]
    };
  }
  function compile(source, input, output = "node", options = {}) {
    const g = grammar(source), tree = parse(g, input, options), equations = [], byKey = new Map(), initial = new Map();
    const key = (node, attr) => `n${node.id}.${attr}`;
    for (const node of tree.nodes) {
      if (node.token) { initial.set(key(node, "lexeme"), node.token.lexeme); continue; }
      const aliases = new Map([["self", node]]);
      node.prod.rhs.forEach((part, i) => aliases.set(part.alias, node.children[i]));
      for (const rule of node.prod.rules) {
        const target = aliases.get(rule.alias), targetKey = key(target, rule.attr);
        if (byKey.has(targetKey)) fail(`Multiple definitions of ${targetKey} (${target.symbol}).`);
        const refs = references(rule.expr).map(ref => ({ ...ref, key: key(aliases.get(ref.alias), ref.attr) }));
        const eq = { key: targetKey, target, owner: node, rule, refs, deps: [...new Set(refs.map(r => r.key))], kind: target === node ? "synthesized" : "inherited", aliases };
        equations.push(eq); byKey.set(targetKey, eq);
      }
    }
    for (const eq of equations) for (const dep of eq.deps) if (!byKey.has(dep) && !initial.has(dep)) fail(`Missing definition for ${dep}, required by ${eq.key} (line ${eq.rule.line}).`);
    const values = new Map(initial), trace = [], pending = new Set(equations), functions = helpers();
    function evaluate(expr, eq) {
      if (expr.type === "literal") return expr.value;
      if (expr.type === "ref") return values.get(key(eq.aliases.get(expr.alias), expr.attr));
      const result = functions[expr.name](...expr.args.map(arg => evaluate(arg, eq)));
      if (["bin", "branch", "jump", "label", "copy", "print"].includes(expr.name)) {
        return result.map(instruction => ({ ...instruction, origin: { node: eq.owner.id, equation: eq.key, ...eq.owner.span } }));
      }
      return result;
    }
    while (pending.size) {
      const eq = [...pending].find(item => item.deps.every(dep => values.has(dep)));
      if (!eq) fail(`Cyclic attribute dependencies: ${[...pending].slice(0, 6).map(e => e.key).join(", ")}. No remaining equation is ready.`);
      let value; try { value = evaluate(eq.rule.expr, eq); } catch (error) { fail(`${eq.key}, line ${eq.rule.line}: ${error.message}`); }
      values.set(eq.key, value); pending.delete(eq); eq.step = trace.length + 1; trace.push({ eq, value });
    }
    const resultKey = key(tree.root, output), result = values.get(resultKey);
    if (!values.has(resultKey)) fail(`The root needs a .${output} attribute. Choose the matching output or define it.`);
    if (output === "node" && !isAST(result)) fail("The root .node must contain an AST created by Leaf/Node.");
    if (output === "code" && !isCode(result)) fail("The root .code must contain a code fragment.");
    return { ...tree, grammar: g, equations, byKey, initial, values, trace, result, resultKey, output, input };
  }
  function formatInstruction(i) {
    if (i.kind === "bin") return `${i.target} = ${i.left} ${i.op} ${i.right}`;
    if (i.kind === "branch") return `if ${i.addr} goto ${i.label}`;
    if (i.kind === "jump") return `goto ${i.label}`;
    if (i.kind === "copy") return `${i.target} = ${i.addr}`;
    if (i.kind === "print") return `print ${i.addr}`;
    return `${i.label}:`;
  }
  function format(value) {
    if (isAST(value)) return value.children.length ? `${value.label}(${value.children.map(format).join(", ")})` : value.label;
    if (isCode(value)) return value.length ? value.map(formatInstruction).join("\n") : "ε (empty code)";
    return String(value);
  }
  function environment(text) {
    const result = new Map();
    for (const pair of text.split(/[,;\n]/).map(s => s.trim()).filter(Boolean)) {
      const m = /^([A-Za-z_]\w*)\s*=\s*(-?\d+(?:\.\d+)?)$/.exec(pair);
      if (!m || !Number.isFinite(Number(m[2]))) fail(`Invalid variable binding “${pair}”. Use x=10, y=3.`);
      if (result.has(m[1])) fail(`Duplicate binding for ${m[1]}.`);
      result.set(m[1], Number(m[2]));
    }
    return result;
  }
  function execute(code, bindings, resultAddr, options = {}) {
    if (!isCode(code)) fail("Expected generated IR.");
    const values = typeof bindings === "string" ? environment(bindings) : new Map(bindings);
    const initialValues = new Map(values), output = [], labels = new Map(), trace = [], visited = new Set();
    const maxSteps = options.maxSteps ?? 1000;
    let pc = 0, outcome = null, error = null;
    code.forEach((i, index) => { if (i.kind === "label") { if (labels.has(i.label)) fail(`Duplicate label ${i.label}.`); labels.set(i.label, index); } });
    for (const i of code) if (["jump", "branch"].includes(i.kind) && !labels.has(i.label) && !["L_true", "L_false"].includes(i.label)) fail(`Undefined label ${i.label}.`);
    const read = name => {
      if (/^-?\d+(?:\.\d+)?$/.test(name)) {
        const value = Number(name);
        if (!Number.isFinite(value)) fail("Numeric literal is not finite.");
        return value;
      }
      if (!values.has(name)) fail(`No value for ${name}. Assign it before use or supply it in Variable values.`);
      return values.get(name);
    };
    const jump = name => { if (labels.has(name)) pc = labels.get(name); else { outcome = name === "L_true"; pc = code.length; } };
    const ops = { "+": (a,b) => a+b, "-": (a,b) => a-b, "*": (a,b) => a*b, "/": (a,b) => a/b, "%": (a,b) => a%b, "<": (a,b) => Number(a<b), ">": (a,b) => Number(a>b), "<=": (a,b) => Number(a<=b), ">=": (a,b) => Number(a>=b), "==": (a,b) => Number(a===b), "!=": (a,b) => Number(a!==b) };
    try {
      while (pc < code.length) {
        if (trace.length >= maxSteps) fail(`IR execution exceeded ${maxSteps.toLocaleString("en-US")} instructions; check for a loop.`);
        const index = pc, i = code[index];
        let effect, write = null, printed = null;
        // Commit the program counter and writes only after operand validation.
        if (i.kind === "bin") {
          const left = read(i.left), right = read(i.right);
          if ((i.op === "/" || i.op === "%") && right === 0) fail(`Division or remainder by zero at instruction ${index + 1}.`);
          const value = ops[i.op](left, right);
          if (!Number.isFinite(value)) fail("Arithmetic result is not finite.");
          write = [i.target, value]; effect = `${i.target} = ${value}`;
        }
        if (i.kind === "copy") { write = [i.target, read(i.addr)]; effect = `${i.target} = ${write[1]}`; }
        if (i.kind === "print") { printed = read(i.addr); effect = `output ${printed}`; }
        const condition = i.kind === "branch" ? read(i.addr) : null;
        pc++; visited.add(index);
        if (write) values.set(...write);
        if (printed !== null) output.push(printed);
        if (i.kind === "branch") { if (condition) jump(i.label); effect = condition ? `taken → ${i.label}` : "not taken → next instruction"; }
        if (i.kind === "jump") { jump(i.label); effect = `jump → ${i.label}`; }
        if (i.kind === "label") effect = "continue";
        trace.push({ index, effect, write, printed, next: pc });
      }
      if (outcome === null && resultAddr !== undefined) outcome = read(resultAddr);
    } catch (failure) {
      if (!options.captureErrors) throw failure;
      error = failure.message;
    }
    return { trace, visited, values, initialValues, output, error, pc, result: outcome };
  }
  const api = { presets, grammar, parse, compile, format, formatInstruction, execute, environment, isAST, isCode };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SDD = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
