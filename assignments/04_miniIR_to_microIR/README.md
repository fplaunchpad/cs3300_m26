---
layout: page
title: Assignment 04 - miniIR to microIR Translator
permalink: /assignments/miniIR_to_micro
---

| Release Date | 21/09/2026 |
| Deadline     | 09/10/2026, 23:59 hours |

<br/>

This assignment is graded out of 15: 9 for this take-home part and 6 for an
extension you implement in the lab session on 13/10/2026. See the
[assignments page](/cs3300_m26/assignments/) for how the lab component works.

This assignment is the fourth part of a multi part project to write an
optimizing compiler for MiniJava. In the previous assignment you produced
[miniIR](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets), in which
an operand may itself be an arbitrarily nested expression. In this assignment
you will translate miniIR into
[microIR](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets), a
*flattened* form in which every operand of every instruction is either a
temporary or a literal.

Flattening is what makes the later phases possible: once each instruction
performs exactly one operation on simple operands, the program is a linear
sequence of three-address instructions, and liveness analysis and register
allocation (assignment 5) can be defined over it directly.

Concretely, a nested miniIR statement such as

```
MOVE TEMP 3 HALLOCATE 4
```

must be rewritten so that the inner expression is computed into a fresh
temporary first:

```
MOVE TEMP 2 4
MOVE TEMP 3 HALLOCATE TEMP 2
```

You will need to introduce fresh temporaries for intermediate results, and
linearise nested statement-expressions (`BEGIN ... RETURN ... END`) into
straight-line code. Take care that the temporaries you invent do not collide
with those already present in the input.

Use JTB and JavaCC and write in Java one or more visitors which translate
miniIR programs to microIR form. Your main file should be called P3.java,
if A.miniIR contains a program to be flattened then

```bash
$ javac P3.java
$ java P3 < A.miniIR > A.microIR
```

should create A.microIR in microIR form and is semantically equivalent to
A.miniIR. Note, your program must take input from standard input and write to
standard output (so that we can use redirection).

To check that a program is in microIR form, you could tie the microIR.jj to
build a parser. To ensure that your microIR program is semantically equivalent
to the miniIR program, you can use the interpreters
[interp-miniIR.jar](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets)
and
[interp-microIR.jar](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets)
and compare their outputs:

```bash
$ java -jar interp-miniIR.jar  < A.miniIR  > expected.txt
$ java -jar interp-microIR.jar < A.microIR > actual.txt
$ diff expected.txt actual.txt
```

Alternatively, `make` compiles the assignment, `make run FILE=<input>` runs it,
and `make clean` removes the `.class` files you must delete before submitting.

Note: Please do not alter the directory structure of `RollNo_P3`.
Only edit `GJDepthFirst.java` and `P3.java`

## Resources

The source files are on
[Github](https://github.com/fplaunchpad/cs3300_m26/tree/main/assignments/04_miniIR_to_microIR).

Get the source by cloning the entire repo:

```bash
$ git clone https://github.com/fplaunchpad/cs3300_m26
```

If you have already cloned the repo, you can get the latest updates by:

```bash
$ cd cs3300_m26 # go to the cloned repo
$ git pull
```

The miniIR grammar specification is
[BNF-miniIR](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets).

The microIR grammar specification is
[BNF-microIR](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets).

Sample miniIR inputs are in `sample_miniIR`, and sample microIR programs (to
show you the shape of the expected output) are in `sample_microIR`.

## Submission

Rename the folder `RollNo_P3` with your roll number. For example, if your roll
number is `cs99b999`, then the folder should be named `cs99b999_P3`. Remove all
the `.class` files before submission. For example, you can do:

```bash
$ cd cs99b999_P3
$ find . -name "*.class" | xargs rm
```

Then produce the compressed gzip archive as follows:

```bash
$ tar cvzf cs99b999_P3.tar.gz cs99b999_P3
```

Submit the `.tar.gz` file.

Note: You should thoroughly test your code. Some sample miniIR programs are provided for testing. Create positive and negative tests per feature and test your code before submission. Please ensure that there are no compilation errors. If there are compilation errors, that code will yield zero marks.
