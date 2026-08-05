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
# This grades a different set of tests from the local self-test. Neither is the
# set you are finally marked on, so passing both is necessary, not sufficient.

set -eu

GRADER="${CS3300_GRADER:-https://cs3300-autograder.kcsrk.workers.dev}"

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
curl -sS --fail-with-body -X POST "$GRADER/submit" \
  -H "X-Submit-Key: $key" \
  -H "X-Filename: $(basename "$archive")" \
  --data-binary "@$archive" |
  sed -e 's/[{,]/\n/g' -e 's/[}"]//g' | sed -e 's/^ *//' -e '/^$/d'
