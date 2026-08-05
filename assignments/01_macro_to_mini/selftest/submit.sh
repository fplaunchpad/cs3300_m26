#!/usr/bin/env sh
# Check your assignment against tests you have not seen.
#
#   ./submit.sh cs23b087_P0.tar.gz
#
# The key is on the course Slack. Put it in the environment so it is not in
# your shell history, or in a file named .cs3300key next to this script:
#
#   export CS3300_KEY=...
#
# There is also a web page if you would rather not use the terminal; the URL
# is on the course Slack alongside the key.
#
# There are three sets of testcases:
#
#   public   shipped in selftest/, you can read and run them yourself
#   private  what this script checks against; you get counts, never the tests
#   hidden   used for marking, and you never see it
#
# So passing everything here is necessary and not sufficient: your mark comes
# from the hidden set.

set -eu

GRADER="${CS3300_GRADER:-https://cs3300-autograder.kc-7c7.workers.dev}"

archive=${1:-}
if [ -z "$archive" ]; then
  echo "usage: $0 <rollno>_P0.tar.gz" >&2
  exit 2
fi
if [ ! -f "$archive" ]; then
  echo "no such file: $archive" >&2
  exit 2
fi

key=${CS3300_KEY:-}
if [ -z "$key" ]; then
  here=$(dirname "$0")
  if [ -f "$here/.cs3300key" ]; then
    key=$(tr -d ' \n\r' < "$here/.cs3300key")
  else
    printf 'Submission key: '
    stty -echo 2>/dev/null || true
    read -r key
    stty echo 2>/dev/null || true
    printf '\n'
  fi
fi
if [ -z "$key" ]; then
  echo "no key given; see the course Slack" >&2
  exit 2
fi

command -v curl >/dev/null || { echo "curl is not installed" >&2; exit 2; }

echo "Submitting $(basename "$archive") ..."
# --data-binary, not -d: -d mangles a .tar.gz.
response=$(curl -sS -X POST "$GRADER/submit" \
  -H "X-Submit-Key: $key" \
  -H "X-Filename: $(basename "$archive")" \
  --data-binary "@$archive") || {
    echo "could not reach the grader" >&2; exit 1; }

if command -v python3 >/dev/null 2>&1; then
  printf '%s' "$response" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if not d.get("graded"):
    print("Not graded: " + str(d.get("error", "unknown error")))
    sys.exit(1)
rows = [("Macro programs", "macro"), ("Valid programs", "positive"),
        ("Invalid programs", "negative"), ("Total", "total")]
for label, k in rows:
    s = d.get(k)
    if not s:
        continue
    mark = "" if s["passed"] == s["total"] else "   <-- some failed"
    print("  %-18s %3d / %-3d%s" % (label, s["passed"], s["total"], mark))
'
else
  printf '%s\n' "$response"
fi
