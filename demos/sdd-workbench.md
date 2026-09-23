---
layout: page
title: SDD Workbench — From Attributes to AST and IR
permalink: /demos/sdd-workbench/
---

<link rel="stylesheet" href="{{ site.baseurl }}/assets/sdd-workbench.css">

<div class="sdd-demo" id="sdd-demo">
  <p class="sdd-lead">Make a syntax-directed definition executable. Translate expressions or whole programs, follow the attribute dependencies, and watch an AST or intermediate code take shape.</p>
  <div id="sdd-presets" class="sdd-presets" role="group" aria-label="SDD examples"></div>
  <p id="sdd-note" class="sdd-note"></p>
  <div id="sdd-program-options" hidden>
    <div class="sdd-row"><label for="sdd-example">Program example</label><select id="sdd-example"></select><button type="button" id="sdd-load-example">Load example</button></div>
    <details class="sdd-editor">
      <summary>Language reference</summary>
      <div class="sdd-pad">
        <p>This is a small numeric language for the course. Programs are sequences of statements; blocks and control flow can nest.</p>
        <ul>
          <li><code>x = expression;</code>, <code>print(expression);</code>, and <code>{ statements }</code>.</li>
          <li><code>if (condition) { statements }</code>, with an optional <code>else { statements }</code>.</li>
          <li><code>while (condition) { statements }</code>. Braces are required for every control-flow body, making nested <code>else</code> clauses unambiguous.</li>
          <li>Arithmetic: <code>+ - * / %</code>, unary minus, and parentheses. Conditions: comparisons <code>&lt; &lt;= &gt; &gt;= == !=</code>, <code>true</code>, <code>false</code>, and short-circuit <code>! &amp;&amp; ||</code>.</li>
          <li>Comments: <code>// to end of line</code> and <code>/* block comment */</code>.</li>
        </ul>
        <p>Variables have one program-wide scope and numeric values. Assign before use, or provide initial values below. Division is real-valued; <code>%</code> is remainder. Conditions are separate from numeric expressions, so write <code>x != 0</code> rather than <code>if (x)</code>. There are no declarations, arrays, functions, strings, or <code>break</code>/<code>continue</code>. Numbers use JavaScript’s finite floating-point arithmetic.</p>
        <p>Build translates the whole program immediately. Select an IR instruction to find its source line and semantic equation. Use “Replay translation” to revisit attribute evaluation, then “Run IR” to execute and inspect the runtime trace. Generated labels and copies are deliberately left unoptimized so the SDD remains visible.</p>
        <p>Limits: 500 tokens, 8,000 source characters, and 10,000 executed instructions. A runtime error retains the trace up to the failing instruction.</p>
      </div>
    </details>
  </div>

  <details id="sdd-rule-editor" class="sdd-editor">
    <summary>Edit the grammar and semantic rules</summary>
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
  </details>

  <form id="sdd-form" class="sdd-controls">
    <label id="sdd-input-label" for="sdd-input">Expression</label>
    <textarea id="sdd-input" rows="1" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
    <button type="submit" class="sdd-primary">Build / reset</button>
  </form>
  <p id="sdd-status" class="sdd-status" role="status"></p>
  <div id="sdd-workspace" hidden>
    <div class="sdd-progress">
      <button type="button" id="sdd-replay" hidden>Replay translation</button>
      <button type="button" id="sdd-prev">Previous</button>
      <button type="button" id="sdd-next">Next equation</button>
      <button type="button" id="sdd-play" aria-pressed="false">Play</button>
      <input id="sdd-progress" type="range" min="0" value="0" aria-label="Attribute evaluation step">
      <button type="button" id="sdd-finish">Finish</button>
      <span id="sdd-count"></span>
    </div>
    <div class="sdd-now" aria-live="polite"><strong id="sdd-action"></strong><span id="sdd-reason"></span></div>
    <div class="sdd-grid">
      <section class="sdd-card">
        <header><span id="sdd-tree-eyebrow" class="sdd-eyebrow">Grammar occurrences · select a node</span><h2 id="sdd-tree-title">Annotated parse tree</h2></header>
        <div id="sdd-source-preview" class="sdd-diagram" hidden></div>
        <details id="sdd-tree-section" open>
        <summary id="sdd-tree-summary" class="sdd-pad" hidden>Inspect the annotated parse tree</summary>
        <div id="sdd-tree" class="sdd-diagram"></div>
        <p class="sdd-legend"><span class="sdd-inherited">● Inherited</span> <span class="sdd-synthesized">● Synthesized</span> <span class="sdd-current">● Current target</span></p>
        <div id="sdd-node-detail" class="sdd-pad"></div>
        </details>
      </section>
      <section class="sdd-card">
        <header><span id="sdd-result-label" class="sdd-eyebrow"></span><h2 id="sdd-result-title">AST under construction</h2></header>
        <div id="sdd-result" class="sdd-diagram"></div>
        <p id="sdd-result-note" class="sdd-pad sdd-note"></p>
      </section>
    </div>
    <section class="sdd-card">
      <header><span class="sdd-eyebrow">Select any attribute below to inspect its dependencies</span><h2>Attribute dependencies</h2></header>
      <div id="sdd-dependencies" class="sdd-pad"></div>
      <div class="sdd-table-wrap">
        <table class="sdd-table"><thead><tr><th>Step</th><th>Attribute</th><th>Kind</th><th>Equation</th><th>Value</th></tr></thead><tbody id="sdd-attributes"></tbody></table>
      </div>
    </section>
    <section id="sdd-runtime" class="sdd-card" hidden>
      <header><span class="sdd-eyebrow">Execute the generated code</span><h2>Try the IR</h2></header>
      <div class="sdd-pad">
        <form id="sdd-run-form" class="sdd-row">
          <label for="sdd-env">Variable values</label><input id="sdd-env" type="text" spellcheck="false" value="x=10, y=3">
          <button type="submit" id="sdd-run" class="sdd-primary">Run IR</button>
        </form>
        <p class="sdd-note">Finish attribute evaluation first. Instructions marked “skipped” were not reached; the trace records the executed path.</p>
        <p id="sdd-run-status" role="status"></p>
        <div id="sdd-run-controls" hidden>
          <div class="sdd-progress">
            <button type="button" id="sdd-run-first">Restart trace</button>
            <button type="button" id="sdd-run-prev">Previous instruction</button>
            <button type="button" id="sdd-run-next">Next instruction</button>
            <input id="sdd-run-progress" type="range" min="0" value="0" aria-label="IR execution step">
            <span id="sdd-run-count"></span>
          </div>
          <p id="sdd-run-action" aria-live="polite"></p>
          <div class="sdd-grid">
            <div><h3>Variable values at this step</h3><pre id="sdd-run-values"></pre></div>
            <div><h3>Printed output so far</h3><pre id="sdd-run-output"></pre></div>
          </div>
        </div>
        <div id="sdd-run-result"></div>
      </div>
    </section>
  </div>
  <noscript>This workbench needs JavaScript enabled.</noscript>
</div>

<script src="{{ site.baseurl }}/assets/sdd-engine.js"></script>
<script src="{{ site.baseurl }}/assets/sdd-program.js"></script>
<script src="{{ site.baseurl }}/assets/sdd-workbench.js"></script>
