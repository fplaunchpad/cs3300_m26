---
layout: page
title: Resources
permalink: /resources/
---

## Development environment

Across the six assignments you need a JDK, `flex`, `bison`, a C compiler, and
`spim` (assignment 6 only). You can install these natively or use the container
in the [course repository](https://github.com/fplaunchpad/cs3300_m26), which has
all of them. The container is the least trouble on Windows, and on Apple Silicon
where `spim` is awkward to install.

### Container

From your clone of the course repository:

```bash
# Linux: build with your own user id, so files you create in the container
# are owned by you and not by root
$ docker build --build-arg UID=$(id -u) --build-arg GID=$(id -g) -t cs3300 .

# macOS and Windows
$ docker build -t cs3300 .
```

Then start it with your work directory mounted at `/workspace`:

```bash
$ docker run -it --rm -v /absolute/path/to/your/work:/workspace cs3300
```

### Native install

```bash
# Ubuntu / WSL
$ sudo apt install build-essential flex bison libfl-dev spim openjdk-21-jdk

# macOS (Homebrew)
$ brew install flex bison spim openjdk
```

On Windows, use [WSL](https://ubuntu.com/wsl) and then the Ubuntu line.

Two platform differences to know about. On macOS the flex library is `-ll`
rather than `-lfl` when you link assignment 1. And the `bison` shipped with
macOS is version 2.3, which is old; `brew install bison` gives you a current
one, but it is not first on your `PATH` by default.

## Java Programming Language

* Online tutorial: [https://www.w3schools.com/java/](https://www.w3schools.com/java/)
* Books
  + Kathy Sierra, Bert Bates, Trisha Gee, "Head First Java: A Brain-Friendly
    Guide", Third Edition.
  + Herbert Schildt, "Java A Beginner's Guide", Eighth Edition.

## Flex & Bison

* Flex manual: [https://www.cs.virginia.edu/~cr4bd/flex-manual/](https://www.cs.virginia.edu/~cr4bd/flex-manual/)
  + More reference: See section 3.5.2 of the dragon book.
* Bison manual: [https://www.gnu.org/software/bison/manual/](https://www.gnu.org/software/bison/manual/)
* Books
  * "Flex & Bison", by John Levine (O’Reilly, 2009), [pdf](https://web.iitd.ac.in/~sumeet/flex__bison.pdf)

## JavaCC 

Java Compiler Compiler (JavaCC) is the most popular parser generator for use
with Java applications.

* JavaCC home page: [https://javacc.github.io/javacc/](https://javacc.github.io/javacc/)

## JTB

JTB is a syntax tree builder to be used with the Java Compiler Compiler (JavaCC)
parser generator.  

* JTB home page: [http://compilers.cs.ucla.edu/jtb/](http://compilers.cs.ucla.edu/jtb/)

## Git

You will be developing large programs with 100s of lines of code. It is a good
idea to learn and use version control system to manage your code development. My
recommendation is to [learn Git version control
system](https://docs.github.com/en/get-started/using-git/about-git). Git is not
essential for the course, but learning it would serve you well in the years to
come.
