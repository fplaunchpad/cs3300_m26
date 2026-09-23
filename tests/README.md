# SDD workbench checks

Run the dependency-free engine checks from the site directory:

```sh
node --test tests/sdd-engine.test.cjs tests/sdd-program.test.cjs
```

The tests cover AST precedence and associativity, inherited attributes,
three-address execution against independent AST evaluation, short-circuit paths,
editable rules and grammars, nullable occurrences, and error diagnostics.

For browser checks, build/serve the Jekyll site and use a Python environment
with Playwright and its Chromium browser installed:

```sh
bundle exec jekyll serve
python3 tests/sdd-browser.py http://127.0.0.1:4000/cs3300_m26/demos/sdd-workbench/
```

Optional environment variables: `SDD_CHROMIUM` selects a Chromium executable;
`SDD_SCREENSHOTS` selects a directory for desktop/mobile screenshots. The browser
checks cover all presets, stepping, playback, editing, errors, IR execution,
HTML escaping, and viewport fit at 1366×768, 1280×720, 1024×768, and 390×844.

The demo is a static Jekyll page with no external runtime dependencies.
`assets/sdd-engine.js` contains the lecture presets, the interpreted rule language,
an Earley parser, dependency evaluation, and an interpreter for the generated IR.
`assets/sdd-workbench.js` renders snapshots of that evaluation. New presets can be
added to the engine's `presets` object; the interface discovers them automatically.

The whole-program tab is defined in `assets/sdd-program.js`. It extends the same
SDD evaluator with statements, sequences, blocks, if/else, while, copy/print
instructions, source locations, and larger input limits. Program tests include
nested control flow, real division and remainder, runtime errors, trace replay,
and source-to-equation mappings. The runtime trace stores writes instead of
copying an entire variable environment at each step.

The workbench uses `_layouts/workbench.html` to devote the viewport to three
panels: input/local parse tree, current attribute rule (or runtime state), and
AST/IR. The local tree shows the selected production and two levels of children;
Full tree fits the complete tree into the same panel. Edit SDD, Help, and the
full attribute inspector open dialogs. Long source/IR listings scroll inside
their panels and automatically follow the active instruction; the page stays
fixed. Source editing replaces the program preview, and execution reuses the
translation's IR listing. Narrow screens place input and output side by side
above the current state.
