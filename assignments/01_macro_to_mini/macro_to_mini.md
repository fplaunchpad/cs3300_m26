---
layout: page
title: Assignment 01 - MacroJava to MiniJava
permalink: /assignments/macro_to_mini
---

The goal of this assignment is to write a MacroJava to MiniJava translator using
Flex and Bison. 

| Release Date | 27/07/2026 |
| Deadline     | 14/08/2026, 23:59 hours |

<br/>

This assignment is graded out of 15: 9 for this take-home part and 6 for an
extension you implement in the lab session on 18/08/2026. See the
[assignments page](/cs3300_m26/assignments/) for how the lab component works.

## Installation

This assignment needs `flex`, `bison` and a C compiler. The course repository
ships a container with these already installed, along with everything the later
assignments need; see [Development
environment](/cs3300_m26/resources/#development-environment). To install
natively instead:

### Ubuntu / WSL

```bash
$ sudo apt install build-essential flex bison libfl-dev
```

### macOS

I recommend installing through [Homebrew](https://brew.sh/). Install Homebrew
first using the instructions on the Homebrew website and then:

```bash
$ brew install flex bison
```

### Windows

Use [Ubuntu on WSL](https://ubuntu.com/wsl), then follow the Ubuntu
instructions above.

## Submission details

Your submission should be named `<YOUR-ROLLNO>_P0.tar.gz` compressed file. For
example, if your roll number is `cs99b999`, then the file should be named
`cs99b999_P0.tar.gz`. The compressed gzip archive should contain a folder named
`<YOUR-ROLLNO>_P0` with two files **and nothing else**. A Flex file named as
`A1.l` and a Bison file named as `A1.y`.

If `X.java` is a valid MacroJava program, then the following commands should
generate the correct MiniJava code `Y.java`. Take input from standard input and
write to standard output.

```bash
$ bison -d A1.y
$ flex A1.l
$ cc A1.tab.c lex.yy.c -lfl -o A1
$ ./A1 < X.java > Y.java
```

`bison -d` is what writes `A1.tab.h`, which your `A1.l` needs to include in
order to use the token names. On macOS the flex library has a different name:
use `-ll` in place of `-lfl`. The `Makefile` in `selftest/` does all of this
for you and picks the right library for your platform.

### C or C++

You may write the action code in either. The grader builds your submission as
C first, and if that fails, builds it again as C++, so you do not have to
declare which you are using. The standard library is linked for you, so the
STL is available; you still have to include the headers you use, in the
`%{ ... %}` block:

```c
%{
#include <map>
#include <string>
%}
```

If you write C++, put this as the first line of `A1.l`:

```
%option noyywrap
```

It is needed because the lex library is a C library, and it cannot be linked
into a C++ build: on GNU/Linux the library itself refers to `yylex`, and
compiling the lexer as C++ changes that name, so the link fails with
`undefined reference to yylex`. Dropping the library means your lexer has to
supply `yywrap`, and that option is what does it. Leave it out and the grader
will tell you so.

Building it yourself is then the same as above with `c++` in place of `cc` and
no lex library. The generated files are named `.c`, but the compiler you invoke
decides the language, not the file extension:

```bash
$ c++ A1.tab.c lex.yy.c -o A1
```

Two things catch people out when moving to C++. Function declarations are
stricter: `int yyerror();` in C means "unspecified arguments" and lets you call
`yyerror("...")`, while in C++ it means "no arguments" and that call will not
compile. Declare and define it with the parameters you actually pass. And a
declaration and its definition must agree exactly, or the two will be different
symbols and the link will fail.

Still submit exactly `A1.l` and `A1.y`. Any other source file is ignored,
whichever language you use.

## Checking your work before you submit

`selftest/` runs the same program that marks you, over a subset of the tests:

```bash
$ python3 selftest/evaluator.py cs99b999_P0.tar.gz
```

It builds your archive the way the grader does, so packaging mistakes surface
here instead of costing you marks. See
[selftest/README.md](https://github.com/fplaunchpad/cs3300_m26/tree/main/assignments/01_macro_to_mini/selftest)
for what it checks.

There are three sets of testcases: the **public** set ships in `selftest/` and
you can read it; the **private** set runs in the online checker and reports
counts only; the **hidden** set is used for marking and you never see it.
You are marked on all three together, every test counting equally, so passing
the first two is necessary and not sufficient. A submission that does not build
scores zero.

If the X.java file is not a valid MacroJava program, then output 

```
$ ./A1 < X.java
//Failed to parse input code
```

### Useful commands for assignment submission

Assume that you have a folder called `cs99b999_P0` with the solution files. For
assignment 1, this will contain just the Flex and the Bison files. 

```bash
$ ls cs99b999_P0
A1.l A1.y
```

You can create a compressed archive (specifically a `.tar.gz` file) as
follows:

```bash
$ tar cvzf cs99b999_P0.tar.gz cs99b999_P0 
a cs99b999_P0
a cs99b999_P0/A1.y
a cs99b999_P0/A1.l
$ file cs99b999_P0.tar.gz 
cs99b999_P0.tar.gz.: gzip compressed data, last modified: ....
```

You can uncompress the archive as follows:

```bash
tar xvzf cs99b999_P0.tar.gz
x cs99b999_P0/
x cs99b999_P0/A1.y
x cs99b999_P0/A1.l
```

## MacroJava 

MacroJava is a subset of Java extended with C style macros. The meaning of a
MacroJava program is given by its meaning as a Java program (after macro
processing). Overloading is not allowed in MacroJava. The MacroJava statement
`System.out.println( ... );` can only print integers. The MacroJava expression
`e1 && e2` is of type boolean, and both `e1` and `e2` must be of type boolean.
MacroJava supports both inline as well as C style comments, but does not support
nested comments.

Some sample MacroJava programs can be found [here](https://github.com/fplaunchpad/cs3300_m26/tree/main/assignments/01_macro_to_mini/macro_java_examples).

### Specification

```
              Goal ::= (MacroDefinition)* MainClass ( TypeDeclaration )* <EOF>
         MainClass ::= class Identifier { public static void main ( String [] Identifier ) { System.out.println ( Expression ); } }
   TypeDeclaration ::= class Identifier { ( Type Identifier ;)* ( MethodDeclaration )* }
                     | class Identifier extends Identifier { ( Type Identifier;)* ( MethodDeclaration )* }
 MethodDeclaration ::= public Type Identifier ( ( Type Identifier (, Type Identifier)*)? ) { ( Type Identifier ;)* ( Statement )* return Expression ; }
             Type  ::= int [ ]
                     | boolean
                     | int
                     | Identifier
         Statement ::= { ( Statement )* }
                     | System.out.println ( Expression );
                     | Identifier = Expression ;
                     | Identifier [ Expression ] = Expression ;
                     | if ( Expression ) Statement
                     | if ( Expression ) Statement else Statement
                     | while ( Expression ) Statement
                     | Identifier ( (Expression (, Expression )*)?); /* Macro stmt call */
        Expression ::= PrimaryExpression && PrimaryExpression
                     | PrimaryExpression || PrimaryExpression
                     | PrimaryExpression != PrimaryExpression
                     | PrimaryExpression <= PrimaryExpression
                     | PrimaryExpression + PrimaryExpression
                     | PrimaryExpression - PrimaryExpression
                     | PrimaryExpression * PrimaryExpression
                     | PrimaryExpression / PrimaryExpression
                     | PrimaryExpression [ PrimaryExpression ]
                     | PrimaryExpression . length
                     | PrimaryExpression
                     | PrimaryExpression . Identifier ( (Expression (, Expression )*)? )
                     | Identifier ( (Expression (, Expression )*)? )/* Macro expr call */
 PrimaryExpression ::= Integer
                     | true
                     | false
                     | Identifier
                     | this
                     | new int [ Expression ]
                     | new Identifier ( )
                     | ! Expression
                     | ( Expression )
   MacroDefinition ::= MacroDefExpression
                     | MacroDefStatement
 MacroDefStatement ::= #defineStmt Identifier (Identifier , Identifier, Identifier (, Identifier )*? ) { ( Statement )* }/* More than 2 arguments */
                     | #defineStmt0 Identifier () { ( Statement )* }
                     | #defineStmt1 Identifier ( Identifier ) { ( Statement )* }
                     | #defineStmt2 Identifier (Identifier , Identifier ) { ( Statement )* }
MacroDefExpression ::= #defineExpr Identifier (Identifier , Identifier, Identifier (, Identifier )*? ) ( Expression ) /* More than 2 arguments */
                     | #defineExpr0 Identifier () ( Expression )
                     | #defineExpr1 Identifier ( Identifier ) ( Expression )
                     | #defineExpr2 Identifier (Identifier , Identifier ) ( Expression )
        Identifier ::= <IDENTIFIER>
           Integer ::= <INTEGER_LITERAL>
```

## MiniJava

MiniJava is a subset of Java. The meaning of a MiniJava program is given by its
meaning as a Java program. Overloading is not allowed in MiniJava. The MiniJava
statement `System.out.println( ... );` can only print integers. The MiniJava
expression `e1 && e2` is of type boolean, and both `e1` and `e2` must be of type
boolean.

Some sample MiniJava programs can be found [here](https://github.com/fplaunchpad/cs3300_m26/tree/main/assignments/01_macro_to_mini/mini_java_examples).

### Specification

Use the [canonical MiniJava grammar]({{ '/grammar/minijava/' | relative_url }}).
The corresponding [JavaCC grammar]({{ '/assets/minijava.jj' | relative_url }})
is the authoritative specification used to generate the assignment parser.

**Clarification (10 August 2026).** An earlier version of this page also listed
`private` and `protected` method access and ternary expressions as MiniJava
extensions. Submissions that support these extensions remain valid. This
clarification does not change the released test cases or grading.
