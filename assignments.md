---
layout: page
title: Assignments
permalink: /assignments/
---

All assignment code lives in the `assignments/` directory of the course
repository, [fplaunchpad/cs3300_m26](https://github.com/fplaunchpad/cs3300_m26).
Clone it once and `git pull` for updates, rather than downloading files
individually:

```bash
$ git clone https://github.com/fplaunchpad/cs3300_m26
```

Each assignment ships a skeleton (`RollNo_P<n>`) to work in, sample inputs, and
the grammar of the language it consumes.

For the tools you need (JDK, flex, bison, a C compiler, and spim for assignment
6), see [Development
environment](/cs3300_m26/resources/#development-environment). The repository
includes a `Dockerfile` with all of them, which saves installing them yourself.

Submit through the [course Moodle](https://courses.iitm.ac.in/course/view.php?id=12239).
Assignments are due at 11:59 PM on the due date.

| # | Topic | Release | Take-home due | Lab session | Points | Link |
|--:|-------|---------|---------------|-------------|--------|------|
| 1 | MacroJava to MiniJava   | 27/07/2026 | 14/08/2026 | 18/08/2026 | 15 | [macro_to_mini](/cs3300_m26/assignments/macro_to_mini.html) |
| 2 | Type Checker            | 17/08/2026 | 04/09/2026 | 08/09/2026 | 15 | [typechecker](/cs3300_m26/assignments/typechecker.html) |
| 3 | MiniJava to miniIR      | 07/09/2026 | 18/09/2026 | 22/09/2026 | 15 | [mini_to_miniIR](/cs3300_m26/assignments/mini_to_miniIR.html) |
| 4 | miniIR to microIR       | 21/09/2026 | 09/10/2026 | 13/10/2026 | 15 | [miniIR_to_micro](/cs3300_m26/assignments/miniIR_to_micro.html) |
| 5 | microIR to miniRA       | 12/10/2026 | 23/10/2026 | 27/10/2026 | 15 | [micro_to_miniRA](/cs3300_m26/assignments/micro_to_miniRA.html) |
| 6 | miniRA to MIPS Assembly | 19/10/2026 | 30/10/2026 | 03/11/2026 | 15 | [miniRA_to_mips](/cs3300_m26/assignments/miniRA_to_mips.html) |

<br/>

## How each assignment is graded

Each assignment carries 15 points: **9 for the take-home part** and **6 for an
extension implemented in the lab**. Six assignments add up to 90 points and
constitute 40% of the course grade.

The lab extension is written during the Q-slot lab session on DCF machines,
which have no network access other than the locally hosted Moodle. You extend
the code *you* submitted for the take-home part. **The extension is not
announced in advance.**

* The lab task comes in several variants; which one you get is determined by
  your roll number and announced at the start of the session.
* The first part of each lab task is deliberately straightforward for anyone
  whose submitted code compiles and runs, so attending is worth it even if you
  found the take-home hard.
* If you cannot work from your own submission, you may ask for the reference
  implementation and extend that instead. Your total for that assignment is
  then capped at 50%.
* **Attendance at the six in-lab evaluation sessions is mandatory.** That is
  where the 6 lab marks are decided, so a missed session cannot be made up
  later. If you miss one without an institute-approved reason, your take-home
  marks for that assignment are capped at 20%.

The take-home part is where you learn the material; the lab is where you show
that you did. Do the take-home yourself: code you did not write will cost you
the lab marks.

## Assignment late penalties

We are flexible about submitting assignments late. Unless otherwise specified,
assignments may be turned in late with the following penalties applied to the
score received:

* 1 day late: −25%
* 2 days late: −50%
* &gt; 2 days late: we will not grade it. 

## Academic Integrity

You’re in college; you’re expected and encouraged to discuss your work with
others. That said, **everything you write for this course (code, written
assignments, quizzes, exams and everything else) must be your own original
work.**

**Properly attribute any work that you use**. It is part of your job as a
scholar to understand what counts as plagiarism, and make sure you avoid it.

**No LLM use is permitted in this course**, for any part of any assignment or
evaluation. Using one is treated as plagiarism.

Plagiarism is punished under the Institute's graded punishments for unfair means
(Academic Section Circular 2B, dated 04.02.2025). For plagiarism in graded
assignments, a first instance carries zero marks for the copied assignment, one
grade lower in the course, and 50 hours of library work; if the grade obtained
is E, U or P, that grade is retained. Repeated plagiarism carries a U grade in
the course. In either case the student is not eligible to seek a supplementary
exam or contact course in this subject.

Submissions are checked with [MOSS](https://theory.stanford.edu/~aiken/moss/).
