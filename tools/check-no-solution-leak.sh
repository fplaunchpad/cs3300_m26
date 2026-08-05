#!/usr/bin/env bash
# Guard against publishing anything from the private repo that students must not see.
#
# The public repo ships student handouts; the private repo holds the reference
# solutions, the answer templates create.py splices from, and the private/hidden
# testcase tiers. The one file that carries an assignment's answer is
# visitor/GJDepthFirst.java, so the checks below centre on it.
#
# Usage:  tools/check-no-solution-leak.sh          (checks the working tree)
# Wired as a pre-push hook; exits non-zero to block the push.

set -uo pipefail

PUB="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRIV="${CS3300_PRIVATE:-$(cd "$PUB/../.." && pwd)/cs3300_m26/cs3300_m26_private}"
[ -d "$PRIV" ] || PRIV="$HOME/teaching/cs3300/cs3300_m26/cs3300_m26_private"

if [ ! -d "$PRIV/assignments/ACE" ]; then
  echo "leak-check: private repo not found at $PRIV; skipping (set CS3300_PRIVATE)." >&2
  exit 0
fi

fail=0
note() { echo "LEAK: $*" >&2; fail=1; }

# Hash every published file once.
pub_hashes=$(mktemp)
find "$PUB" -path "$PUB/.git" -prune -o -type f -print0 \
  | xargs -0 shasum -a 256 2>/dev/null > "$pub_hashes"

# 1. No published file may be byte-identical to a reference solution's answer file,
#    to an answer template, or to a generated-solution handout tarball.
while IFS= read -r secret; do
  [ -f "$secret" ] || continue
  h=$(shasum -a 256 "$secret" | awk '{print $1}')
  if hit=$(grep -m1 "^$h " "$pub_hashes"); then
    p=${hit#* }; p=${p# }
    note "${secret#"$PRIV"/} is published at ${p#"$PUB"/}"
  fi
done < <(
  ls "$PRIV"/assignments/ACE/solutions/*/visitor/GJDepthFirst.java 2>/dev/null
  ls "$PRIV"/assignments/ACE/utils/ans/*.java 2>/dev/null
  ls "$PRIV"/assignments/ACE/utils/codes/*.tar.gz 2>/dev/null
  # A1's answer is the grammar pair, not everything in solution/.
  # solution/Makefile is build rules with no answer in it and is published
  # on purpose, as selftest/Makefile, so students get the platform-correct
  # link line instead of typing it by hand.
  ls "$PRIV"/assignments/assignment1/solution/A1.l \
     "$PRIV"/assignments/assignment1/solution/A1.y 2>/dev/null
)

# 2. Private and hidden testcase tiers must never appear publicly.
#    (The 'public' tier is meant for students and is fine.)
while IFS= read -r secret; do
  [ -f "$secret" ] || continue
  h=$(shasum -a 256 "$secret" | awk '{print $1}')
  if hit=$(grep -m1 "^$h " "$pub_hashes"); then
    p=${hit#* }; p=${p# }
    note "non-public testcase ${secret#"$PRIV"/} is published at ${p#"$PUB"/}"
  fi
done < <(
  # Assignment 1 is tiered the same way as P1-P5, so cover both trees. Only
  # the public tier is meant to ship, as assignments/01_macro_to_mini/selftest.
  #
  # Test inputs only. A .expected file holds a program's output, often a
  # single integer, so identical ones collide across tiers for no reason:
  # hidden P06 and P07 both print 6, as does public T4. Knowing that some
  # hidden test prints 6 tells a student nothing without its input.
  find "$PRIV/assignments/ACE/testcases" "$PRIV/assignments/assignment1/testcases" \
       -type d \( -name private -o -name hidden \) \
       -exec find {} -type f -name '*.java' \; 2>/dev/null)

# 3. A published answer file must not be a near-copy of its solution. Compares the
#    set of non-trivial lines; JTB boilerplate overlaps, a pasted solution does not.
for sol in "$PRIV"/assignments/ACE/solutions/*/visitor/GJDepthFirst.java; do
  [ -f "$sol" ] || continue
  p=$(basename "$(dirname "$(dirname "$sol")")")          # P1..P5
  handout=$(find "$PUB/assignments" -path "*RollNo_$p/$p/visitor/GJDepthFirst.java" | head -1)
  [ -n "$handout" ] || continue
  norm() { grep -vE '^[[:space:]]*(//|\*|/\*)' "$1" | sed 's/[[:space:]]//g' | grep -vE '^$' | sort -u; }
  common=$(comm -12 <(norm "$sol") <(norm "$handout") | wc -l | tr -d ' ')
  total=$(norm "$sol" | wc -l | tr -d ' ')
  [ "$total" -gt 0 ] || continue
  pct=$(( 100 * common / total ))
  if [ "$pct" -ge 85 ]; then
    note "$p handout shares ${pct}% of solution lines (threshold 85%) - is it stubbed?"
  else
    echo "leak-check: $p handout shares ${pct}% of solution lines (ok)"
  fi
done

rm -f "$pub_hashes"
if [ "$fail" -ne 0 ]; then
  echo "leak-check FAILED - refusing to push. Regenerate handouts with ACE/create.py." >&2
  exit 1
fi
echo "leak-check passed."
