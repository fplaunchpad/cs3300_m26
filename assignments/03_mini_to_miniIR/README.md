---
layout: page
title: Assignment 03 - MiniJava to miniIR Translator
permalink: /assignments/mini_to_miniIR
---

| Release Date | 14/09/2026 |
| Deadline     | 25/09/2026, 23:59 hours |

<br/>

This assignment is graded out of 15: 9 for this take-home part and 6 for an
extension you implement in the lab session on 29/09/2026. See the
[assignments page](/cs3300_m26/assignments/) for how the lab component works.

This assignment is the third part of a multi part project to write an 
optimizing compiler for MiniJava. We start with type checked MiniJava 
programs and generate programs in miniIR format. Akin to a standard 
optimizing compiler, in this assignment, we will implement a module 
that translates programs in a high level language 
[minijava](https://www.cse.iitm.ac.in/~krishna/cs3300/minijava-spec.html) to programs 
in intermediate form [miniIR](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets).

miniIR still permits nested expressions: an operand of an instruction may
itself be a computation. Flattening those into one-operation-per-instruction
form (microIR) is the subject of assignment 4.

Use JTB and JavaCC and write in Java one or more visitors which translate 
MiniJava programs to miniIR form. Your main file should be called P2.java, 
if A.java contains a program to be simplified then

```bash
$ javac P2.java
$ java P2 < A.java > A.miniIR
```

should create A.miniIR in miniIR form and is semantically equivalent 
to A.java. Note, your program must take input from standard input and 
write to standard output (so that we can use redirection).

To check that a program is in miniIR form, you could tie the miniIR.jj 
to build a parser. To ensure that your miniIR program is semantically 
equivalent to the A.java program, you can use the interpreter of 
miniIR [interp-miniIR.jar](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets) 
to compare the output of A.java with the output of your generated program; 
say the generated miniIR code is stored in A.miniIR, 
then to invoke the interpreter use: java -jar interp-miniIR.jar < A.miniIR. 

Alternatively, `make` compiles the assignment, `make run FILE=<input>` runs it,
and `make clean` removes the `.class` files you must delete before submitting.

Note: Please do not alter the directory structure of `RollNo_P2`. 
Only edit `GJDepthFirst.java` and `P2.java`
## Resources

The source files are on
[Github](https://github.com/fplaunchpad/cs3300_m26/tree/main/assignments/03_mini_to_miniIR).

Get the source by cloning the entire repo:

```bash
$ git clone https://github.com/fplaunchpad/cs3300_m26
```

If you have already cloned the repo, you can get the latest updates by:

```bash
$ cd cs3300_m26 # go to the cloned repo
$ git pull
```

The MiniJava grammar specification is
[here](https://www.cse.iitm.ac.in/~krishna/cs3300/minijava-spec.html).

The miniIR grammar specification is 
[BNF-miniIR](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets).

Slides from a previous offering are available as
[A3_slides](https://github.com/fplaunchpad/cs3300_m26/tree/main/assets). Note that
they translate MiniJava straight to microIR, combining this assignment with
assignment 4; the material on generating IR from MiniJava still applies.

## Submission

Rename the folder `RollNo_P2` with your roll number. For example, if your roll
number is `cs99b999`, then the folder should be named `cs99b999_P2`. Remove all
the `.class` files before submission. For example, you can do:

```bash
$ cd cs99b999_P2
$ find . -name "*.class" | xargs rm
```

Then produce the compressed gzip archive as follows:

```bash
$ tar cvzf cs99b999_P2.tar.gz cs99b999_P2
```

Submit the `.tar.gz` file. 

Note: You should thoroughly test your code. Some sample mini java programs are provided for testing. Create positive and negative tests per feature and test your code before submission. Please ensure that there are no compilation errors. If there are compilation errors, that code will yield zero marks.
