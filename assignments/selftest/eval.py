#!/usr/bin/env python3
#
# Copyright (c) 2021 Anirudh Sunder Raj <anirudh6626@gmail.com>
# Copyright (c) 2021 V. Krishna Nandivada <nvk@iitm.ac.in>
#
# Permission to use, copy, modify, and distribute this software for any
# purpose with or without fee is hereby granted, provided that the above
# copyright notice and this permission notice appear in all copies.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
# WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
# MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
# ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
# WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
# ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
# OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
#
"""Evaluate student submissions for an ACE assignment.

    ./eval.py submissions/cs99b999_P3.tar.gz          # one submission
    ./eval.py -m submissions/ -v                      # a directory, writes results_*.csv
    ./eval.py --tier P3a -m lab/                      # a lab session, graded against variant a

By default the testcase tier is taken from the submission's directory name.
Lab submissions are named P<n> like the take-home, so grading a lab session
without --tier scores it against the take-home tests and produces plausible but
meaningless marks; the evaluator prints a large warning when that can happen.
The tier used is recorded in a `tier` column in the results CSV.

A submission is a .tar.gz containing <rollno>_P<n>/P<n>/, with P<n>.java as the
main class. Each testcase is run through the student's program, the result is
executed with the reference interpreter (assignments 2-4) or spim (assignment 5),
and the program's output is compared against utils/outputs/.

Scoring is unchanged from the original; the mechanics were modernised:
subprocess argument lists instead of shell string concatenation (paths
containing spaces used to break extraction), tarfile with the 'data' filter
(submissions are untrusted input), per-run temporary files instead of a shared
/tmp/dump, and explicit cwd= instead of global chdir.
"""

from __future__ import annotations

import argparse
import csv
import shutil
import sys
import subprocess
import tarfile
import tempfile
from pathlib import Path

ACE_ROOT = Path(__file__).resolve().parent
OUTPUT_FILE_EXT = ['.out', '.miniIR', '.microIR', '.miniRA', '.s']
testcase_types_list: list[str] = []


def run(cmd, cwd=None, stdin=None, stdout=None) -> int:
    """Run a command, returning its exit status. Never uses a shell."""
    try:
        with open(stdin) if stdin else _null() as fin, \
             open(stdout, 'w') if stdout else _null() as fout:
            proc = subprocess.run(
                cmd, cwd=cwd,
                stdin=fin if stdin else subprocess.DEVNULL,
                stdout=fout if stdout else subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        return proc.returncode
    except OSError:
        return 1


class _null:
    """Context manager standing in for an unused file handle."""
    def __enter__(self): return None
    def __exit__(self, *exc): return False


def normalise(path: Path, assn_num: int) -> None:
    """Strip blank lines, and for assignments 2-5 any line starting with a
    letter (spim and the interpreters print prose alongside the output)."""
    lines = path.read_text(errors='replace').splitlines()
    kept = [
        line.strip() for line in lines
        if line.strip() and not (assn_num != 1 and line.strip()[0].isalpha())
    ]
    path.write_text("".join(f"{line}\n" for line in kept))


def evaluate(code_file: Path, verbose: bool, tier: str | None = None) -> dict:
    code_file = Path(code_file)
    main_dir_name = code_file.name[:-len('.tar.gz')]
    info = {'roll_no': main_dir_name.split('_')[0]}

    # Extract into a private scratch directory rather than beside the script.
    workspace = Path(tempfile.mkdtemp(prefix='ace_eval_'))
    try:
        try:
            with tarfile.open(code_file) as tf:
                tf.extractall(workspace, filter='data')   # submissions are untrusted
        except Exception:
            info['dir_found'] = False
            return info

        root = workspace / main_dir_name
        if not root.is_dir():                             # archive named differently
            candidates = [p for p in workspace.iterdir() if p.is_dir()]
            if len(candidates) != 1:
                info['dir_found'] = False
                return info
            root = candidates[0]

        assn_dir = None
        for entry in sorted(root.iterdir()):
            if (entry.is_dir() and len(entry.name) >= 2
                    and entry.name[0] == 'P' and entry.name[1].isdigit()
                    and 1 <= int(entry.name[1]) <= 5):
                assn_dir = entry
                break

        if assn_dir is None:
            info['dir_found'] = False
            return info
        info['dir_found'] = True

        assn_name = assn_dir.name          # the student's main class, e.g. P3
        tier_name = tier or assn_name      # which testcases to grade against
        assn_num = int(tier_name[1])
        info['tier'] = tier_name

        if not (assn_dir / f'{assn_name}.java').is_file():
            info['file_found'] = False
            return info

        info['file_found'] = True
        info['assn_name'] = assn_name
        info['assn_num'] = assn_num

        if verbose:
            print(f"\nEvaluating {info['roll_no']}:\tAssigment {assn_name}")
            print('=========================================================\n')
            print('\nCompiling...')

        # Drop any .class files that came in the archive. Students are told to
        # remove them, but if they forget, a class file built by a different
        # JDK is unreadable here ("class file has wrong version") and the whole
        # submission scores zero for a packaging slip rather than for its code.
        stale = list(assn_dir.rglob('*.class'))
        for c in stale:
            c.unlink()
        if verbose and stale:
            print(f'Removed {len(stale)} stale .class file(s) from the submission')

        if run(['javac', f'{assn_name}.java'], cwd=assn_dir) != 0:
            info['compile'] = False
            return info

        info['compile'] = True
        if verbose:
            print('Compilation successful!\n\nRunning tests')

        testcase_dir = ACE_ROOT / 'testcases' / tier_name
        out_ext = OUTPUT_FILE_EXT[assn_num - 1]
        out_root = assn_dir / 'out'
        out_root.mkdir(exist_ok=True)
        # Resolve by assignment number, not directory name, so lab variants
        # (P3a, P3b, ...) share assignment 3's interpreter.
        interp_jar = ACE_ROOT / 'utils' / 'interp' / f'P{assn_num}.jar'

        num_testcases: dict[str, int] = {}
        num_correct: dict[str, int] = {}

        for type_entry in testcase_dir.iterdir():
            testcase_type = type_entry.name
            if testcase_type not in testcase_types_list:
                testcase_types_list.append(testcase_type)

            out_dir = out_root / testcase_type
            out_dir.mkdir(exist_ok=True)
            expected_dir = ACE_ROOT / 'utils' / 'outputs' / tier_name / testcase_type

            testcases = sorted((p.name, p) for p in type_entry.iterdir())
            if verbose:
                print('\nEvaluating ' + testcase_type + ' testcases')

            num_testcases[testcase_type] = 0
            num_correct[testcase_type] = 0

            for name, test in testcases:
                num_testcases[testcase_type] += 1
                if verbose:
                    print('\n*** Testing ' + name + ' ***')

                stem = name.split('.')[0]
                produced = out_dir / f'{stem}{out_ext}'
                if run(['java', assn_name], cwd=assn_dir, stdin=test, stdout=produced) != 0:
                    if verbose:
                        print('Runtime error')
                    continue

                executed = out_dir / f'{stem}.out'
                if 2 <= assn_num <= 4:
                    if run(['java', '-jar', str(interp_jar)],
                           cwd=out_dir, stdin=produced, stdout=executed) != 0:
                        if verbose:
                            print('Error while executing the output')
                        continue
                elif assn_num == 5:
                    if shutil.which('spim') is None:
                        info['spim'] = False
                        return info
                    info['spim'] = True
                    if run(['spim', '-quiet', '-file', str(produced)],
                           cwd=out_dir, stdout=executed) != 0:
                        if verbose:
                            print('Error while executing the output')
                        continue

                normalise(executed, assn_num)
                expected = expected_dir / f'{stem}.out'
                passed = (expected.is_file()
                          and executed.read_bytes() == expected.read_bytes())
                if passed:
                    num_correct[testcase_type] += 1
                if verbose:
                    print('Pass' if passed else 'Fail')

            if verbose:
                print('\n-----------------------------------------------------')

        info['num_tests'] = num_testcases
        info['num_correct'] = num_correct
        return info
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('input', type=Path,
                        help='File (.tar.gz) / directory of files (for multi) to be evaluated')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Prints all the evaluation information')
    parser.add_argument('-m', '--multi', action='store_true',
                        help='Evaluate all files in the given folder. Results in csv file')
    parser.add_argument('-t', '--tier',
                        help='Grade against this testcase tier regardless of the '
                             'submission directory name, e.g. P3a for a lab variant. '
                             'Without it, the tier is taken from the submission and a '
                             'lab session would be scored against the take-home tests.')
    args = parser.parse_args()

    print('\n*************** Assignment Evaluator ***************\n')

    if args.tier:
        if not (ACE_ROOT / 'testcases' / args.tier).is_dir():
            print(f"error: no testcase tier '{args.tier}' under testcases/", file=sys.stderr)
            return 1
        kind = 'LAB VARIANT' if len(args.tier) > 2 else 'take-home'
        print(f'Grading against tier: {args.tier}   [{kind}]\n')
    else:
        variants = sorted(p.name for p in (ACE_ROOT / 'testcases').iterdir()
                          if p.is_dir() and len(p.name) > 2 and p.name[0] == 'P')
        if variants:
            bar = '!' * 72
            for stream in (sys.stdout, sys.stderr):
                print(bar, file=stream)
                print('!! NO --tier GIVEN: grading against the TAKE-HOME testcases.',
                      file=stream)
                print('!! If this is a lab session, stop and re-run with the variant, e.g.',
                      file=stream)
                print(f'!!     python3 eval.py --tier {variants[0]} -m <submissions>/',
                      file=stream)
                print('!! Lab submissions are named P<n>, so they LOOK correct here and',
                      file=stream)
                print('!! would be silently scored against the wrong tests.', file=stream)
                print(f'!! Variant tiers available: {" ".join(variants)}', file=stream)
                print(bar + '\n', file=stream)

    if not args.input.exists():
        print('Error: Input path does not exist. Please verify if the path is '
              'relative to this directory')
        return 1

    if args.multi:
        if not args.input.is_dir():
            print('Error: Input path is not a directory')
            return 1

        print('Evaluating...')
        output_name = 'results' + ''.join(
            '_' + part for part in args.input.parts if part and part[0].isalpha()
        )

        results = []
        for assn_file in sorted(p for p in args.input.iterdir()
                                if p.is_file() and p.name.endswith('.tar.gz')):
            print('Evaluating ' + assn_file.name)
            results.append(evaluate(assn_file, args.verbose, args.tier))

        headings = ['rollNo', 'tier', 'format', 'mainFile', 'compiled'] + testcase_types_list
        with open(output_name + '.csv', 'w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(headings)
            for result in results:
                row = [result['roll_no'], result.get('tier', '')]
                if not result.get('dir_found'):
                    row += ['Incorrect']
                elif not result.get('file_found'):
                    row += ['Correct', 'Not found']
                elif not result.get('compile'):
                    row += ['Correct', 'Found', 'No']
                else:
                    row += ['Correct', 'Found', 'Yes']
                    if result.get('assn_num') == 5 and not result.get('spim', True):
                        print('Please install spim using the command `sudo apt install spim`')
                        break
                    num_correct = result['num_correct']
                    row += [str(num_correct.get(t, '')) for t in testcase_types_list]
                row += [''] * (len(headings) - len(row))
                writer.writerow(row)
        print('Done')
        return 0

    if not args.input.is_file():
        print('Error: Input path is not a file')
        return 1

    print('Evaluating...')
    result = evaluate(args.input, args.verbose, args.tier)
    print('Results for {}'.format(result['roll_no']))
    if not result.get('dir_found'):
        print('Error: Directory structure incorrect')
    elif not result.get('file_found'):
        print('Error: Main java file not found')
    elif not result.get('compile'):
        print('Error: Compilation error')
    else:
        print('Assignment {}'.format(result['assn_name']))
        if result.get('assn_num') == 5 and not result.get('spim', True):
            print('Please install spim using the command `sudo apt install spim`')
        else:
            print('\nFinal score:')
            for case_type in testcase_types_list:
                print("{} : {} / {} ".format(case_type,
                                             result['num_correct'][case_type],
                                             result['num_tests'][case_type]))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
