# Self-test for assignments 2 to 6

Check your submission before you hand it in. This runs the same program that
marks you, against a subset of the tests, so a result here means the same
thing it will mean when your submission is graded.

Assignment 1 has its own self-test, in `01_macro_to_mini/selftest/`.

## Running it

Build your submission archive exactly as the assignment describes, then:

```bash
$ python3 assignments/selftest/eval.py cs23b087_P2.tar.gz
```

```
Assignment P2

Final score:
public : 8 / 8
```

Add `-v` to watch each testcase and see which one fails.

Note the archive name: **assignment 2 is `_P1`, assignment 3 is `_P2`**, and so
on, one behind the assignment number. The name in your archive decides which
tests are used, so getting it wrong is worth avoiding.

| Assignment | Archive | Assignment | Archive |
|---|---|---|---|
| 2. Type Checker | `_P1` | 5. microIR to miniRA | `_P4` |
| 3. MiniJava to miniIR | `_P2` | 6. miniRA to MIPS | `_P5` |
| 4. miniIR to microIR | `_P3` | | |

You need a JDK and `python3`, plus `spim` for assignment 6. The
[course container](/cs3300_m26/resources/#development-environment) has all of
them.

## What it checks

Your archive is unpacked and built the way the grader builds it, so a
packaging mistake shows up here rather than costing you marks. Then, for each
testcase, your translator is run on the input, its output is **executed** (by
the reference interpreter, or by `spim` for assignment 6), and what that
prints is compared with what the input program prints.

So it checks that your translation *means the same thing*, not that it looks a
particular way. How you format your output is up to you.

Any `.class` files left in your archive are removed before compiling, so a
forgotten `make clean` will not fail your submission. Remove them anyway: the
assignment asks for the sources only.

## How your assignment is tested

There are three sets of testcases, and you can only ever see one of them.

| Set | Where it runs | What you see |
|---|---|---|
| **Public** | here, on your machine | the testcases themselves |
| **Private** | the online checker | how many passed, never the tests |
| **Hidden** | final marking only | nothing |

You are marked on **all three together**, every test counting equally, so most
of the tests behind your mark are ones you never see. Passing the public and
private sets is necessary and not sufficient. A submission that does not build
scores zero.

The online checker takes the same archive; the URL and key are on the course
Slack.
