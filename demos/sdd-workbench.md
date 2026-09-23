---
layout: workbench
title: SDD Workbench
permalink: /demos/sdd-workbench/
---
<link rel="stylesheet" href="{{ site.baseurl }}/assets/sdd-workbench.css">
<main class="sdd-demo" id="sdd-demo">
  <header class="sdd-app-header">
    <a href="{{ site.baseurl }}/schedule/" aria-label="Back to the course schedule">← CS3300</a>
    <h1>SDD workbench</h1>
    <div class="sdd-tools">
      <button type="button" data-dialog="rules">Edit SDD</button>
      <button type="button" data-dialog="help">Help</button>
    </div>
  </header>
  <nav id="sdd-presets" class="sdd-presets" aria-label="Translation examples"></nav>
  <div class="sdd-toolbar">
    <div id="sdd-translation-controls" class="sdd-progress" aria-label="Translation controls">
      <button type="button" id="sdd-replay" hidden>Replay</button>
      <button type="button" id="sdd-prev" aria-label="Previous equation">←</button>
      <button type="button" id="sdd-next">Next equation →</button>
      <button type="button" id="sdd-play" aria-pressed="false">Play</button>
      <input id="sdd-progress" type="range" min="0" value="0" aria-label="Attribute evaluation step">
      <span id="sdd-count"></span>
      <button type="button" id="sdd-finish">Finish</button>
    </div>
    <div id="sdd-run-controls" class="sdd-progress" aria-label="Execution controls" hidden>
      <button type="button" id="sdd-back">← Translation</button>
      <button type="button" id="sdd-run-first">Restart trace</button>
      <button type="button" id="sdd-run-prev" aria-label="Previous instruction">←</button>
      <button type="button" id="sdd-run-next">Next instruction →</button>
      <input id="sdd-run-progress" type="range" min="0" value="0" aria-label="IR execution step">
      <span id="sdd-run-count"></span>
    </div>
  </div>
  <div class="sdd-main">
    <section class="sdd-card sdd-input-card">
      <header><h2 id="sdd-tree-title">Input &amp; parse tree</h2><button type="button" id="sdd-edit-input" hidden>Edit source</button></header>
      <div id="sdd-program-options" class="sdd-row" hidden>
        <label for="sdd-example">Example</label><select id="sdd-example"></select><button type="button" id="sdd-load-example">Load</button>
      </div>
      <form id="sdd-form" class="sdd-controls">
        <label id="sdd-input-label" for="sdd-input">Expression</label>
        <textarea id="sdd-input" rows="1" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
        <button type="submit" class="sdd-primary">Build</button>
      </form>
      <div id="sdd-source-preview" class="sdd-diagram" hidden></div>
      <details id="sdd-tree-section" open>
        <summary id="sdd-tree-summary" hidden>Parse tree</summary>
        <div class="sdd-tree-tools"><span id="sdd-tree-caption">Local tree</span><button type="button" id="sdd-tree-full" aria-pressed="false">Full tree</button></div>
        <div id="sdd-tree" class="sdd-diagram"></div>
        <p class="sdd-legend"><span class="sdd-current">● Current</span><span class="sdd-inherited">● Dependency</span><span>Click a node to inspect</span></p>
      </details>
    </section>
    <div id="sdd-workspace" class="sdd-workspace" hidden>
      <section class="sdd-card sdd-state-card">
        <header><h2 id="sdd-state-title">Current rule</h2><button type="button" data-dialog="inspection">Inspect</button></header>
        <div id="sdd-translation-state">
          <div id="sdd-dependencies"></div>
        </div>
        <section id="sdd-runtime" hidden>
          <form id="sdd-run-form" class="sdd-run-form">
            <label for="sdd-env">Initial values</label><input id="sdd-env" type="text" spellcheck="false" value="x=10, y=3" placeholder="e.g. x=10, y=3">
            <button type="submit" id="sdd-run" class="sdd-primary">Run IR</button>
          </form>
          <p id="sdd-run-status" role="status"></p>
          <div class="sdd-runtime-state">
            <p id="sdd-run-action" aria-live="polite"></p>
            <h3>Variables &amp; temporaries</h3><pre id="sdd-run-values"></pre>
            <h3>Output</h3><pre id="sdd-run-output"></pre>
          </div>
        </section>
      </section>
      <section class="sdd-card sdd-result-card">
        <header><h2 id="sdd-result-title">AST</h2><span id="sdd-result-label"></span></header>
        <div id="sdd-result" class="sdd-diagram"></div>
        <p id="sdd-result-note" class="sdd-note"></p>
      </section>
    </div>
  </div>
  <p id="sdd-status" class="sdd-status" role="status"></p>
  <dialog id="sdd-rules-dialog" aria-labelledby="sdd-rules-title">
    <header><h2 id="sdd-rules-title">Grammar &amp; semantic rules</h2><button type="button" data-close>Close</button></header>
  <div id="sdd-rule-editor" class="sdd-editor">

    <div class="sdd-pad">
      <p>One production per block, followed by its equations. The first production sets the start symbol. Use <code>epsilon</code> for an empty right-hand side. <code>self</code> is the left-hand-side occurrence; <code>E@left</code> names a right-hand-side occurrence <code>left</code>. An unaliased symbol can be referenced by its name if it occurs once.</p>
      <label for="sdd-source">Executable SDD</label>
      <textarea id="sdd-source" rows="16" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
      <div class="sdd-row">
        <label for="sdd-output">Root output</label>
        <select id="sdd-output"><option value="node">.node → AST</option><option value="code">.code → IR</option></select>
        <button type="button" id="sdd-restore">Restore this preset</button>
      </div>
      <details class="sdd-help">
        <summary>Rule language and things to try</summary>
        <p>Equations are declarative: their written order does not determine evaluation order. Each step evaluates one equation whose inputs are available. <code>self.attr</code> defines a synthesized attribute; <code>child.attr</code> defines an inherited attribute on that child. Terminals provide <code>.lexeme</code>. The lexer recognizes identifiers (<code>id</code>), nonnegative decimal numbers (<code>num</code>), relational operators (<code>rel</code>), and literal grammar tokens. The whole-program preset also includes unary minus.</p>
        <ul>
          <li><code>Leaf(text)</code>, <code>Node(op, left, right)</code>: create AST nodes.</li>
          <li><code>newTemp()</code>, <code>newLabel()</code>: allocate one fresh name when that equation is evaluated. <code>%t</code> names cannot collide with source identifiers.</li>
          <li><code>empty()</code>, <code>concat(code, ...)</code>: empty code and code concatenation (the slide’s <code>||</code>).</li>
          <li><code>bin(temp, op, left, right)</code>: emit a three-address instruction.</li>
          <li><code>branch(addr, yes, no)</code>: emit <code>if addr goto yes; goto no</code>.</li>
          <li><code>label(name)</code>, <code>jump(name)</code>: emit a label or unconditional jump.</li>
          <li><code>copy(variable, addr)</code>, <code>print(addr)</code>: emit an assignment or print instruction.</li>
        </ul>
        <p>Use double-quoted strings, numeric literals, attribute references, and these helpers. Comments start with <code>#</code> on their own line. Write separate productions instead of <code>|</code> alternatives. Rules are interpreted locally; no JavaScript is executed from the editor.</p>
        <ol>
          <li>Compare both AST presets on <code>x - 2 * y - z</code>. Why are their ASTs identical despite different parse trees?</li>
          <li>Swap the operands of subtraction in a <code>Node</code> rule. Which dependency edges and AST change?</li>
          <li>In the boolean preset, try <code>x=50</code>, then <code>x=150</code>, then <code>x=250, y=250</code>. Which comparisons execute?</li>
          <li>Replace <code>self.node = T.node</code> by <code>self.node = self.node</code> to see a dependency-cycle diagnostic.</li>
        </ol>
        <p>The parser accepts left recursion and epsilon, and rejects ambiguous inputs. The dependency graph is for this input’s parse tree; a successful run does not prove that the SDD is noncircular for every input. Expression inputs are limited to 60 tokens; whole programs allow 500. IR execution stops at the end of the code, or at <code>L_true</code>/<code>L_false</code> for the standalone boolean preset.</p>
      </details>
    </div>
  </div>


    <p id="sdd-rule-error" class="sdd-pad is-error" role="status"></p>
    <footer><button type="button" id="sdd-apply-rules" class="sdd-primary">Apply &amp; build</button></footer>
  </dialog>
  <dialog id="sdd-inspection-dialog" aria-labelledby="sdd-inspection-title">
    <header><h2 id="sdd-inspection-title">Attribute inspector</h2><button type="button" data-close>Close</button></header>
    <div id="sdd-node-detail" class="sdd-pad"></div>
    <pre id="sdd-full-value"></pre>
    <div class="sdd-table-wrap"><table class="sdd-table"><thead><tr><th>Step</th><th>Attribute</th><th>Kind</th><th>Equation</th><th>Value</th></tr></thead><tbody id="sdd-attributes"></tbody></table></div>
  </dialog>
  <dialog id="sdd-help-dialog" aria-labelledby="sdd-help-title">
    <header><h2 id="sdd-help-title">Using the workbench</h2><button type="button" data-close>Close</button></header>
    <div class="sdd-pad">
      <p id="sdd-note"></p>
      <p>Build an input, then step through its semantic equations. The current rule shows the attributes it reads and the value it produces. The AST or code grows alongside it.</p>
      <p>Use Inspect for the full attribute table, and Edit SDD to change the grammar or equations. For IR, Finish the translation and Run IR. Step through execution to see values, output, and the active instruction together.</p>
      <p>Large trees fit the panel. Long source and IR panels scroll independently; the current line is kept in view automatically.</p>
      <details><summary>Whole-program language</summary>
      <div class="sdd-pad">
        <p>This is a small numeric language for the course. Programs are sequences of statements; blocks and control flow can nest.</p>
        <ul>
          <li><code>x = expression;</code>, <code>print(expression);</code>, and <code>{ statements }</code>.</li>
          <li><code>if (condition) { statements }</code>, with an optional <code>else { statements }</code>.</li>
          <li><code>while (condition) { statements }</code>. Braces are required for every control-flow body, making nested <code>else</code> clauses unambiguous.</li>
          <li>Arithmetic: <code>+ - * / %</code>, unary minus, and parentheses. Conditions: comparisons <code>&lt; &lt;= &gt; &gt;= == !=</code>, <code>true</code>, <code>false</code>, and short-circuit <code>! &amp;&amp; ||</code>.</li>
          <li>Comments: <code>// to end of line</code> and <code>/* block comment */</code>.</li>
        </ul>
        <p>Variables have one program-wide scope and numeric values. Assign before use, or provide initial values before running. Division is real-valued; <code>%</code> is remainder. Conditions are separate from numeric expressions, so write <code>x != 0</code> rather than <code>if (x)</code>. There are no declarations, arrays, functions, strings, or <code>break</code>/<code>continue</code>. Numbers use JavaScript’s finite floating-point arithmetic.</p>
        <p>Build translates the whole program immediately. Select an IR instruction to find its source line and semantic equation. Use “Replay translation” to revisit attribute evaluation, then “Run IR” to execute and inspect the runtime trace. Generated labels and copies are deliberately left unoptimized so the SDD remains visible.</p>
        <p>Limits: 500 tokens, 8,000 source characters, and 10,000 executed instructions. A runtime error retains the trace up to the failing instruction.</p>
      </div>

      </details>
    </div>
  </dialog>
  <noscript>This workbench needs JavaScript enabled.</noscript>
</main>
<script src="{{ site.baseurl }}/assets/sdd-engine.js"></script>
<script src="{{ site.baseurl }}/assets/sdd-program.js"></script>
<script src="{{ site.baseurl }}/assets/sdd-workbench.js"></script>
