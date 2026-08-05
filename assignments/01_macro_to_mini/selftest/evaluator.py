#!/usr/bin/env python3
"""Evaluate an assignment 1 submission.

    python3 evaluator.py <rollno>_P0.tar.gz              # public tier
    python3 evaluator.py --tier private <archive>        # online-grader tier
    python3 evaluator.py --tier hidden  <archive>        # final marking
    python3 evaluator.py --testcases <dir> <archive>     # a lab variant

Tiers live under testcases/<tier>/{macro_tests,positive,negative}. The lab
variants keep the flat layout and are selected with --testcases.

How a valid program is judged, and why it is not simply "javac succeeded":

  javac accepts a file containing only a comment, because an empty
  compilation unit is legal Java. A translator printing nothing but
  "//Failed to parse input code" therefore passed every positive test AND
  every negative one under the old evaluator, scoring full marks for
  translating nothing. So a valid test now requires the output to declare a
  class, to compile, and, where an expected output is recorded, to produce
  it when run.

  <test>.expected holds the stdout of the reference translation, written by
  tools/gen_expected.py. A test without one is checked only as far as
  compiling, so every valid test should have one; the exception is a program
  that does not terminate.
"""

import argparse
import os
import re
import shutil
import subprocess as sp
import sys
import tempfile

TIMEOUT = 10          # seconds for one translation or one translated program
CLASS_RE = re.compile(r'\bclass\s+([A-Za-z_][A-Za-z0-9_]*)')

verbose = False


def printv(s):
    if verbose:
        print(s)


def fail(s):
    print(s, file=sys.stderr)
    sys.exit(1)


def translate(exe, test, workdir):
    """Run the submission on one test. Returns (stdout, first_line)."""
    with open(test) as inp:
        try:
            r = sp.run([exe], stdin=inp, stdout=sp.PIPE, stderr=sp.DEVNULL,
                       timeout=TIMEOUT, cwd=workdir)
        except sp.TimeoutExpired:
            return None, ''
    out = r.stdout.decode(errors='replace')
    return out, (out.split('\n', 1)[0] if out else '')


def run_valid(exe, test, workdir):
    """A valid program: must emit a class, compile, and match .expected."""
    out, _ = translate(exe, test, workdir)
    if out is None:
        printv('\tfailed: translator timed out')
        return False

    m = CLASS_RE.search(out)
    if not m:
        # "//Failed ..." lands here. It would otherwise compile cleanly,
        # a comment-only file being a legal empty compilation unit.
        printv('\tfailed: output declares no class')
        return False
    cls = m.group(1)

    src = os.path.join(workdir, cls + '.java')
    with open(src, 'w') as f:
        f.write(out)
    try:
        if sp.run(['javac', src], cwd=workdir, stdout=sp.DEVNULL,
                  stderr=sp.DEVNULL, timeout=60).returncode != 0:
            printv('\tfailed: javac')
            return False
    except sp.TimeoutExpired:
        printv('\tfailed: javac timed out')
        return False

    exp = os.path.splitext(test)[0] + '.expected'
    if not os.path.exists(exp):
        # Say so loudly. Without it this test only checks that something
        # compiled, which is a much weaker claim, and a silently missing
        # file would quietly weaken the marks.
        print('  !! no %s -- this test only checks that it compiles; '
              'run tools/gen_expected.py' % os.path.basename(exp),
              file=sys.stderr)
    else:
        try:
            r = sp.run(['java', '-cp', workdir, cls], stdout=sp.PIPE,
                       stderr=sp.DEVNULL, timeout=TIMEOUT, cwd=workdir)
        except sp.TimeoutExpired:
            printv('\tfailed: translated program did not terminate')
            return False
        got = r.stdout.decode(errors='replace').strip()
        with open(exp) as f:
            want = f.read().strip()
        if got != want:
            printv('\tfailed: output differs\n\t  got:  %r\n\t  want: %r'
                   % (got[:120], want[:120]))
            return False
    printv('\tpassed')
    return True


def run_invalid(exe, test, workdir):
    """An invalid program: the first line must report the parse failure."""
    out, first = translate(exe, test, workdir)
    if out is None:
        printv('\tfailed: translator timed out')
        return False
    if not first.startswith('//Failed'):
        printv('\tfailed: did not report a parse error')
        return False
    printv('\tpassed')
    return True


def run_group(exe, directory, fn, workdir):
    if not os.path.isdir(directory):
        return (0, 0)
    tests = sorted(f for f in os.listdir(directory) if f.endswith('.java'))
    points = 0
    for t in tests:
        printv('Testing: ' + os.path.join(directory, t))
        for junk in os.listdir(workdir):
            os.remove(os.path.join(workdir, junk))
        if fn(exe, os.path.join(directory, t), workdir):
            points += 1
    return (points, len(tests))


def main():
    global verbose
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('archive', help='<rollno>_P0.tar.gz')
    ap.add_argument('--tier', default='public',
                    choices=['public', 'private', 'hidden'],
                    help='which tier to grade against (default: public)')
    ap.add_argument('--testcases', help='an explicit directory, for lab variants')
    ap.add_argument('-v', '--verbose', action='store_true')
    args = ap.parse_args()
    verbose = args.verbose or bool(os.getenv('VERBOSE'))

    here = os.path.dirname(os.path.abspath(__file__))
    tests = args.testcases or os.path.join(here, 'testcases', args.tier)
    if not os.path.isdir(tests):
        fail('No such testcase directory: ' + tests)

    if '_P0.tar.gz' not in args.archive:
        fail('Error: Archive does not have the prescribed naming scheme')
    archive = os.path.abspath(args.archive)
    if not os.path.exists(archive):
        fail('Error: no such file: %s' % args.archive)

    # Unpack into a scratch directory rather than the current one. A student
    # keeps their working copy next to the archive, and extracting in place
    # would either refuse to run or overwrite their sources.
    unpack = tempfile.mkdtemp()
    base = os.path.basename(archive).replace('.tar.gz', '')
    if sp.run(['tar', 'xzf', archive, '-C', unpack]).returncode != 0:
        shutil.rmtree(unpack, ignore_errors=True)
        fail('Error: Unarchive failed: is %s a valid .tar.gz?' % args.archive)
    dirname = os.path.join(unpack, base)
    if not os.path.isdir(dirname):
        shutil.rmtree(unpack, ignore_errors=True)
        fail('Error: the archive must contain a directory named %s' % base)

    # Beside solution/ in the private repo; beside this file in the copy that
    # ships to students. Same script either way, so the self-test students run
    # cannot drift from the grader that marks them.
    mk = os.path.join(here, 'solution', 'Makefile')
    if not os.path.exists(mk):
        mk = os.path.join(here, 'Makefile')
    if not os.path.exists(mk):
        fail('Error: no build Makefile found next to evaluator.py')
    shutil.copy(mk, dirname)
    build = sp.run(['make', '-C', dirname], stdout=sp.PIPE, stderr=sp.STDOUT)
    if build.returncode != 0:
        # bison and flex say exactly what is wrong and where. Discarding that
        # leaves a student with "failed to build" and nothing to act on.
        why = build.stdout.decode(errors='replace').strip().split('\n')
        shutil.rmtree(unpack, ignore_errors=True)
        fail('Error: The submission failed to build\n' + '\n'.join(why[-8:]))
    exe = os.path.abspath(os.path.join(dirname, 'A1.exe'))

    print('Grading against tier: %s' % (args.testcases or args.tier))
    work = tempfile.mkdtemp()
    try:
        macro = run_group(exe, os.path.join(tests, 'macro_tests'), run_valid, work)
        pos = run_group(exe, os.path.join(tests, 'positive'), run_valid, work)
        neg = run_group(exe, os.path.join(tests, 'negative'), run_invalid, work)
    finally:
        shutil.rmtree(work, ignore_errors=True)
        shutil.rmtree(unpack, ignore_errors=True)

    print('Macro test results\t\t: %d/%d' % macro)
    print('Positive unit test results\t: %d/%d' % pos)
    print('Negative unit test results\t: %d/%d' % neg)
    total, out_of = (sum(x) for x in zip(macro, pos, neg))
    print('Total\t\t\t\t: %d/%d' % (total, out_of))


main()
