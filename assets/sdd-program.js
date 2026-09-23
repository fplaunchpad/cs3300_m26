/* A whole-program SDD using the same editable rules and evaluator as the slides. */
(function (root) {
  "use strict";
  const S = typeof module !== "undefined" && module.exports ? require("./sdd-engine.js") : root.SDD;
  const examples = {
    sum: {
      title: "Loop + if/else", env: "",
      input: `// Add even squares and odd numbers from 1 through 6.
i = 1;
total = 0;
while (i <= 6) {
  if (i % 2 == 0) {
    total = total + i * i;
  } else {
    total = total + i;
  }
  i = i + 1;
}
print(total);`
    },
    factorial: {
      title: "Factorial", env: "n=5",
      input: `// n is supplied in Variable values.
result = 1;
i = 2;
while (i <= n) {
  result = result * i;
  i = i + 1;
}
print(result);`
    },
    nested: {
      title: "Nested loops", env: "",
      input: `i = 1;
total = 0;
while (i <= 3) {
  j = 1;
  while (j <= i) {
    total = total + i * j;
    j = j + 1;
  }
  i = i + 1;
}
print(total);`
    },
    gcd: {
      title: "Euclid’s GCD", env: "a=48, b=18",
      input: `while (b != 0) {
  remainder = a % b;
  a = b;
  b = remainder;
}
print(a);`
    },
    guarded: {
      title: "Short-circuit guard", env: "x=0, y=12",
      input: `// The division is skipped when x is zero.
if (x != 0 && y / x > 2) {
  print(y / x);
} else {
  print(-1);
}`
    }
  };
  const statements = `Program -> Seq
  Seq.next = newLabel()
  self.code = concat(Seq.code, label(Seq.next))
Seq -> S Seq@rest
  S.next = newLabel()
  rest.next = self.next
  self.code = concat(S.code, label(S.next), rest.code)
Seq -> epsilon
  self.code = empty()
S -> id = E ;
  self.code = concat(E.code, copy(id.lexeme, E.addr))
S -> print ( E ) ;
  self.code = concat(E.code, print(E.addr))
S -> Block
  Block.next = self.next
  self.code = Block.code
S -> if ( B ) Block
  B.true = newLabel()
  B.false = self.next
  Block.next = self.next
  self.code = concat(B.code, label(B.true), Block.code)
S -> if ( B ) Block@yes else Block@no
  B.true = newLabel()
  B.false = newLabel()
  yes.next = self.next
  no.next = self.next
  self.code = concat(B.code, label(B.true), yes.code, jump(self.next), label(B.false), no.code)
S -> while ( B ) Block
  self.begin = newLabel()
  B.true = newLabel()
  B.false = self.next
  Block.next = self.begin
  self.code = concat(label(self.begin), B.code, label(B.true), Block.code, jump(self.begin))
Block -> { Seq }
  Seq.next = self.next
  self.code = Seq.code
`;
  // Reuse the exact short-circuit expression SDD, without its external-exit Root.
  const expressions = S.presets.boolean.source.slice(S.presets.boolean.source.indexOf("B -> B@left"));
  const extendedArithmetic = `
T -> T@left / F@right
  self.temp = newTemp()
  self.addr = self.temp
  self.code = concat(left.code, right.code, bin(self.temp, "/", left.addr, right.addr))
T -> T@left % F@right
  self.temp = newTemp()
  self.addr = self.temp
  self.code = concat(left.code, right.code, bin(self.temp, "%", left.addr, right.addr))
F -> - F@child
  self.temp = newTemp()
  self.addr = self.temp
  self.code = concat(child.code, bin(self.temp, "-", "0", child.addr))`;
  S.presets.program = {
    output: "code", program: true,
    ...examples.sum, title: "IR · whole program", examples,
    limits: { chars: 8000, tokens: 500, nodes: 4000, states: 120000 },
    note: "Combine the lecture rules into a complete small imperative language. Write assignments, nested blocks, if/else, while, and print; inspect the generated code and the SDD equation behind each instruction. Braces are required around if/else and while bodies.",
    source: statements + expressions + extendedArithmetic
  };
  if (typeof module !== "undefined" && module.exports) module.exports = S.presets.program;
})(typeof globalThis !== "undefined" ? globalThis : this);
