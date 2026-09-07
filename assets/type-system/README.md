# MiniJava type-system source

`miniJava-typesystem-cs3300.tex` is the editable source of the course revision,
rebuilt from Jens Palsberg's October 2011 *The MiniJava Type System*. The original
reference is preserved in repository history. Student-facing links use
`../miniJava-typesystem-cs3300.pdf`; the legacy `../miniJava-typesystem.pdf` URL
serves an identical corrected copy so that old bookmarks remain consistent.

The revision preserves the original section and rule numbers. Its changes are:

- Section 4 explicitly makes subtyping reflexive for every MiniJava type.
- Rule 16 becomes 16a/16b: overriding requires identical parameter types and
  permits a covariant return type.
- Rule 21 accepts a return-expression type that is a subtype of the declared
  return type.
- Rules 12 and 14 omit parameter names from method types, consistently with the
  definition of `methodtype` and rule 35. Names do not affect overriding.
- Rule 15 remains unchanged; explanatory text distinguishes lookup from
  override validation. Examples illustrate the corrected rules.
- The introduction identifies this as a course revision, explains class names
  in type positions, and points to the course grammar for the full assignment
  syntax. The core grammar and other rules follow the original reference.

To rebuild from the repository root, with a TeX installation providing
`pdflatex`, `geometry`, `lmodern`, `amsmath`, `amssymb`, `array`, `booktabs`,
`hyperref`, and `fancyhdr`:

```sh
mkdir -p /tmp/cs3300-minijava-typesystem
pdflatex -interaction=nonstopmode -halt-on-error \
  -output-directory=/tmp/cs3300-minijava-typesystem \
  assets/type-system/miniJava-typesystem-cs3300.tex
pdflatex -interaction=nonstopmode -halt-on-error \
  -output-directory=/tmp/cs3300-minijava-typesystem \
  assets/type-system/miniJava-typesystem-cs3300.tex
cp /tmp/cs3300-minijava-typesystem/miniJava-typesystem-cs3300.pdf assets/
cp assets/miniJava-typesystem-cs3300.pdf assets/miniJava-typesystem.pdf
```

Check the build log for overfull boxes and render all pages for visual review
before publishing a revised PDF. Keep generated TeX auxiliary files outside the
repository.
