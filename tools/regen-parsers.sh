#!/usr/bin/env bash
# Check that the committed JavaCC/JTB output still matches the grammars.
#
# Every assignment skeleton ships a generated parser and syntax tree. Those
# files are committed on purpose: students never run JavaCC or JTB (their
# Makefile invokes javac and nothing else), the lab machines have no network
# to fetch the generators from, and the reference solutions and all eighteen
# lab variants are written against this exact visitor API. What was missing
# was any way to tell whether the committed output still corresponds to the
# .jj files next to it, which is what this script provides.
#
#   ./tools/regen-parsers.sh            # verify; non-zero exit on drift
#   ./tools/regen-parsers.sh --write    # regenerate in place after a grammar edit
#
# Requires a JDK and network access on first run (the two jars are cached in
# .parser-tools/, which is gitignored).

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT=$PWD

# Pinned, with checksums: JTB 1.3.2 and JavaCC 5.0 are what produced the
# committed files. A different JavaCC in particular rewrites Token.java and
# the token manager, which would silently change the API students build on.
JAVACC_URL="https://repo1.maven.org/maven2/net/java/dev/javacc/javacc/5.0/javacc-5.0.jar"
JAVACC_SHA="71113161bc8cf6641515541c2818028b87c78ec2e8ffaa75317686ee08967b89"
JTB_URL="http://compilers.cs.ucla.edu/jtb/Files/jtb132.jar"
JTB_SHA="a7ec277448946abda56f896a1674de92b234f473c77c299688ef7bfab6111a74"

# visitor/GJDepthFirst.java is the file students fill in. create.py blanks its
# method bodies and it returns n.tokenImage rather than null, so it is
# deliberately not what JTB emits. Never compare it.
SKIP="GJDepthFirst.java"

WRITE=no
[ "${1:-}" = "--write" ] && WRITE=yes

TOOLS="$ROOT/.parser-tools"
mkdir -p "$TOOLS"

fetch() { # url sha dest
  local url=$1 sha=$2 dest=$3
  if [ -f "$dest" ] && [ "$(shasum -a 256 "$dest" | cut -d' ' -f1)" = "$sha" ]; then return 0; fi
  echo "fetching $(basename "$dest")"
  curl -sS -L --max-time 120 -o "$dest" "$url" || { echo "  download failed: $url" >&2; return 1; }
  local got; got=$(shasum -a 256 "$dest" | cut -d' ' -f1)
  if [ "$got" != "$sha" ]; then
    echo "  CHECKSUM MISMATCH for $(basename "$dest")" >&2
    echo "    expected $sha" >&2
    echo "    got      $got" >&2
    rm -f "$dest"; return 1
  fi
}

fetch "$JAVACC_URL" "$JAVACC_SHA" "$TOOLS/javacc-5.0.jar" || exit 1
fetch "$JTB_URL"    "$JTB_SHA"    "$TOOLS/jtb132.jar"     || exit 1
command -v java >/dev/null || { echo "java not found; see resources page" >&2; exit 1; }

drift=0
checked=0

for parser in assignments/*/RollNo_P*/P*/[A-Za-z]*Parser.java; do
  case "$parser" in *Constants.java|*TokenManager.java) continue;; esac
  dir=$(dirname "$parser")
  name=$(basename "$parser" .java)

  # The generating grammar is the one declaring this parser, so no mapping
  # table is needed; the other .jj in the directory is the target language.
  grammar=""
  for jj in "$dir"/*.jj; do
    [ "$(basename "$jj")" = "jtb.out.jj" ] && continue
    grep -q "PARSER_BEGIN($name)" "$jj" 2>/dev/null && grammar=$jj
  done
  [ -n "$grammar" ] || { echo "!! no grammar declares $name in $dir" >&2; drift=1; continue; }

  tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
  cp "$grammar" "$tmp/" || { drift=1; continue; }
  (
    cd "$tmp" || exit 1
    java -jar "$TOOLS/jtb132.jar" -o jtb.out.jj "$(basename "$grammar")" >/dev/null 2>&1 &&
    java -cp "$TOOLS/javacc-5.0.jar" javacc jtb.out.jj >/dev/null 2>&1
  ) || { echo "!! generation failed for $grammar" >&2; drift=1; rm -rf "$tmp"; continue; }

  differing=()
  while IFS= read -r f; do
    rel=${f#"$tmp"/}
    [ "$(basename "$rel")" = "$SKIP" ] && continue
    if [ ! -f "$dir/$rel" ] || ! diff -q "$f" "$dir/$rel" >/dev/null 2>&1; then
      differing+=("$rel")
      [ "$WRITE" = yes ] && { mkdir -p "$dir/$(dirname "$rel")"; cp "$f" "$dir/$rel"; }
    fi
  done < <(find "$tmp" -type f -name '*.java' -o -type f -name 'jtb.out.jj')

  checked=$((checked + 1))
  if [ ${#differing[@]} -eq 0 ]; then
    printf "  ok      %-38s (%s)\n" "$dir" "$(basename "$grammar")"
  elif [ "$WRITE" = yes ]; then
    printf "  updated %-38s %d file(s)\n" "$dir" "${#differing[@]}"
  else
    printf "  DRIFT   %-38s %d file(s):\n" "$dir" "${#differing[@]}"
    printf "            %s\n" "${differing[@]}"
    drift=1
  fi
  rm -rf "$tmp"
done

echo
if [ "$checked" -eq 0 ]; then
  echo "no skeletons found; run this from the repository root" >&2
  exit 1
fi
if [ "$drift" -ne 0 ] && [ "$WRITE" != yes ]; then
  echo "Committed parser output no longer matches the grammars." >&2
  echo "Re-run with --write to regenerate, then review the diff before committing." >&2
  exit 1
fi
echo "$checked skeleton(s) checked against JTB 1.3.2 + JavaCC 5.0."
