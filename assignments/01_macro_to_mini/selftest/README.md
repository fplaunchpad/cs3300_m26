# Self-test for assignment 1

Check your translator before you submit. This runs the same program that
marks you, against a subset of the tests, so a result here means the same
thing it will mean when your submission is graded.

## Running it

Build your submission archive exactly as the assignment describes, then:

```bash
$ python3 selftest/evaluator.py cs23b087_P0.tar.gz
Grading against tier: public
Macro test results		: 8/8
Positive unit test results	: 3/3
Negative unit test results	: 6/6
Total				: 17/17
```

Add `-v` to see which individual tests failed and why:

```bash
$ python3 selftest/evaluator.py -v cs23b087_P0.tar.gz
```

It needs `flex`, `bison`, a C compiler, a JDK and `python3`. The
[course container](/cs3300_m26/resources/#development-environment) has all
of them. You can run it from anywhere; it unpacks the archive into a
temporary directory and does not touch your working copy.

## What it checks

Your archive is unpacked and built the same way the grader builds it, so a
packaging mistake shows up here rather than costing you marks. Then:

* **Valid programs** (`macro_tests`, `positive`). Your MiniJava output must
  declare a class, compile under `javac`, and print the same thing the
  reference translation prints. Formatting, whitespace, indentation and
  comments in your output are entirely up to you: nothing compares your
  source text against anyone else's.
* **Invalid programs** (`negative`). The first line of your output must
  begin with `//Failed`, as the assignment specifies.

## How your assignment is tested

There are three sets of testcases, and you can only ever see one of them.

| Set | Where it runs | What you see |
|---|---|---|
| **Public** | `selftest/`, on your machine | the testcases themselves |
| **Private** | the online checker | how many passed, never the tests |
| **Hidden** | final marking only | nothing |

Your **mark comes from the hidden set**. Passing the public and private sets is
necessary and not sufficient: they catch mistakes early, they do not tell you
your grade. The invalid programs in the public set in particular cover only
some of the ways a MacroJava program can be malformed, so read the grammar and
work out the rest.

### Checking against the private set

Both routes need the key from the course Slack:

* the web page, whose URL is on Slack; or
* `./submit.sh cs23b087_P0.tar.gz` from a terminal.

Both take the same `.tar.gz` you upload to Moodle, so a packaging mistake shows
up there too. Limited to 20 submissions an hour, and it records no mark.
