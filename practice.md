---
layout: page
title: Dragon Book practice
permalink: /practice/
---

Suggested exercises for **lecture decks 1–7**, from *Compilers: Principles,
Techniques, and Tools*, **second edition**, by Aho, Lam, Sethi, and Ullman.
The numbers below are **exercise numbers**, not section numbers. Page numbers
refer to the book's printed pages in the 2007 edition; pagination may differ
between printings.

Work through **Start here** first, then choose further practice where you need
it. These are optional practice recommendations, not an additional graded
assignment. Read the referenced grammar, figure, or translation rules in the
book before attempting an exercise. The [book's official companion
site](https://suif.stanford.edu/dragonbook/) also links its errata.

Jump to: [1. Introduction](#lecture-1) · [2. Lexical analysis](#lecture-2) ·
[3. Top-down parsing](#lecture-3) · [4. Bottom-up parsing](#lecture-4) ·
[5. Semantic analysis](#lecture-5) · [6. SDT](#lecture-6) · [7. IR](#lecture-7)

## 1. Introduction
{: #lecture-1 }

[Lecture slides]({{ site.baseurl }}/lectures/01_introduction/01_introduction.pdf)
· Reading: §§1.1–1.2.

**Start here:** 1.1.1–1.1.3 (p. 3). Explain the roles and trade-offs of
compilers, interpreters, and assembly-language output.

**Further practice:** 1.1.4–1.1.5 (p. 3), on source-to-source compilation and
the assembler's responsibilities.

Afterwards, be able to follow a small program through lexing, parsing,
semantic analysis, IR generation, and code generation, identifying what each
phase consumes and produces. Section 1.2 is the useful reading for that check.

## 2. Lexical analysis
{: #lecture-2 }

[Lecture slides]({{ site.baseurl }}/lectures/02_lexical_analysis/02_lexical_analysis.pdf)
· Reading: §§3.1, 3.3–3.5; §§3.6–3.8 for automata construction.

| Start here | What to practise |
|---|---|
| **3.1.1** (p. 114) | Separate lexemes, token categories, and lexical values in a program. |
| **3.3.2(a–d)** (p. 125) | Describe precisely the language of a regular expression. |
| **3.3.5(a–b)** (p. 125) | Construct regular definitions from language descriptions. |
| **3.8.1** (p. 172) | Distinguish a keyword from identifiers using finite automata. Review §3.7 first if needed. |

**Further practice:** 3.5.1(a–c) (p. 146) connects the lecture to the Flex lab.
For more automata practice, do 3.7.3(a,d) (p. 166), tracing the regular
expression → NFA → DFA construction. This is useful supporting work rather
than a requirement to implement a lexer generator.

When tracing a lexer, state both rules: choose the longest match, then use
rule priority to break an equal-length tie. Explain which mistakes require
the parser or semantic analyser instead.

## 3. Parsing: grammars and top-down methods
{: #lecture-3 }

[Lecture slides]({{ site.baseurl }}/lectures/03_parsing/03_parsing.pdf)
· Reading: §§4.2–4.4.

| Start here | What to practise |
|---|---|
| **4.2.1(a–c)** (p. 206) | Relate leftmost and rightmost derivations to the same parse tree. |
| **4.3.1** (pp. 216–217) | Left factoring, left-recursion elimination, and deciding whether the result suits top-down parsing. |
| **4.4.4**, using grammars **4.2.2(a,b,g)** (p. 231; grammars on p. 207) | Compute FIRST and FOLLOW, including nullable cases and the end marker. |
| **4.4.1(a,b,f)** (p. 231) | Build predictive parsing tables for those same three grammars. Note that part (f) uses grammar 4.2.2(g). |

**Further practice:** finish 4.2.1(d–e), then try 4.3.3 (p. 217) for
ambiguity in a proposed dangling-else grammar. Exercise 4.4.12 (p. 233)
adds predictive-parser error recovery; it supplies a policy for resolving the
optional-`else` conflict.

Write down the grammar you are analysing before computing its sets. A
transformed grammar can have different FIRST/FOLLOW sets from the original.
Left factoring and removing left recursion do not, by themselves, prove LL(1).

## 4. Bottom-up parsing
{: #lecture-4 }

[Lecture slides]({{ site.baseurl }}/lectures/04_bottom_up_parsing/04_bottom_up_parsing.pdf)
· Reading: §§4.5–4.8.

| Start here | What to practise |
|---|---|
| **4.5.1** and **4.5.3(a)** (pp. 240–241) | Identify handles and connect reductions to a reversed rightmost derivation. |
| **4.6.2–4.6.3** (p. 258) | Construct item sets, GOTO transitions, an SLR table, and a parser trace for one grammar. |
| **4.7.1** (pp. 277–278) | Revisit that grammar with canonical LR(1) and LALR item sets. |

**Further practice:** 4.6.1(a) (pp. 257–258) for viable prefixes;
4.7.4–4.7.5 (p. 278) for the distinctions between SLR(1), LALR(1), and
canonical LR(1). For precedence-based conflict resolution, try 4.8.1 with
**two operators** (p. 285).

Use the book's augmentation and acceptance convention consistently. State
numbers need not match another solution: compare item contents and labelled
transitions. For every claimed conflict, identify the state, lookahead, and
two competing actions. LR(0) item sets and an SLR ACTION table are related,
but their reduction rules are different.

## 5. Semantic analysis
{: #lecture-5 }

[Lecture slides]({{ site.baseurl }}/lectures/05_semantic_analysis/05_semantic_analysis.pdf)
· Reading: §1.6 for scope; §§6.3 and 6.5 for types and type checking.

| Start here | What to practise |
|---|---|
| **1.6.1–1.6.2** (pp. 35–36) | Resolve names and trace values across nested scopes. |
| **1.6.3** (pp. 35–36) | Determine each declaration's scope in a block structure. |
| **5.3.1(a)** (p. 323), after lecture 6 | Express type computation as semantic rules. This bridges semantic analysis and SDT. |

**Further practice:** 1.6.4 (p. 36) combines scope with macro expansion.
Exercise 6.3.2(a) (p. 378) is a larger implementation exercise on linked
symbol tables and inherited fields. Exercise 6.5.1 (p. 398) explores numeric
widening; use the book's conversion rules, which are not the course's
MiniJava rules.

**MiniJava needs additional practice.** These exercises do not cover all the
course's rules for class subtyping, method calls, overriding, access, and
ternary-expression types. Use the
[course type-system handout]({{ site.baseurl }}/assets/miniJava-typesystem-cs3300.pdf)
and the worked examples in lecture 5. For each example, write the type
environment, identify the rule, check every premise, and state the resulting
type or the failed premise. Do not import the book's numeric conversions into
MiniJava.

**Course-specific questions:** try the [MiniJava practice variants]({{ site.baseurl }}/practice/semantic-analysis/). These cover environments, subtyping, method calls, overriding, pairs, conditional expressions, and access checks where the book is not a close match.

## 6. Syntax-directed translation
{: #lecture-6 }

[Lecture slides]({{ site.baseurl }}/lectures/06_sdt/06_sdt.pdf)
· Reading: §§5.1–5.4; §2.3 for expression translation.

| Start here | What to practise |
|---|---|
| **5.1.1(a)** (pp. 309–310) | Evaluate synthesized attributes on an annotated parse tree. |
| **5.2.2(a)** (p. 317) | Pass a declared type through an identifier list. |
| **5.2.3(a–d)** (p. 317) | Distinguish S-attributed and L-attributed rules, and examine whether an evaluation order exists. |
| **2.3.1** (p. 60) | Place translation actions and trace expression output. |

**Further practice:** 5.2.1 (p. 317) for topological evaluation orders;
5.2.4 (p. 317) for designing attributes to evaluate binary fractions;
5.4.3 (p. 337) for preserving a translation while removing left recursion.
Part (d) of 5.2.3 and these design exercises deserve more time than a short
attribute-classification question.

Classify an attribute by where its defining rule sits, not by its name or by
whether its source value is inherited or synthesized. In an SDT, the position
of an action determines when it executes.

## 7. Intermediate representation and code generation
{: #lecture-7 }

[Lecture slides]({{ site.baseurl }}/lectures/07_ir/07_ir.pdf)
· Reading: §§6.1–6.2, 6.4, and 6.6.

| Start here | What to practise |
|---|---|
| **6.1.1** (p. 362) | Represent shared subexpressions in a DAG. |
| **6.2.1** (p. 370) | Compare a syntax tree, quadruples, triples, and indirect triples. |
| **6.4.3(a–b)** (p. 385) | Apply the array-reference translation rules, including two-dimensional indexing. |
| **6.4.6–6.4.7** (p. 386) | Compute addresses with nonzero lower bounds, in row-major and column-major order. |
| **6.6.4(a)** (p. 409) | Translate a compound Boolean condition with short-circuit evaluation and fall-through. |

For 6.4.3, state the array dimensions and element widths you assume, or keep
the corresponding strides symbolic. For 6.6.4, use `x = 1;` as the body;
the copy consulted prints `x == 1;`. First generate explicit true/false jumps,
then apply the fall-through rules requested by the exercise.

**Further practice:** 6.1.2(a–b) (p. 363) adds value numbering;
6.4.5(a–b) (pp. 385–386) generalises the array-address formulas;
6.6.4(b–c) gives more Boolean translations. After those, try 5.4.4(b)
(p. 337) to design rules for a `do`–`while` construct, or 6.6.1(b)
(pp. 408–409) for a `for` loop.

For every array reference, distinguish the base, the current element/subarray
type, and the byte offset. For control flow, distinguish rules that pass
labels to children from rules that emit branches. Trace at least one path
where short-circuit evaluation skips a test. Backpatching (§6.7) is additional
reading, not a prerequisite for this set.
