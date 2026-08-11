---
layout: page
title: LL(1) Workbench — From Grammar to Table-Driven Parser
permalink: /demos/ll1-workbench/
---

<link rel="stylesheet" href="{{ site.baseurl }}/assets/ll1-workbench.css">

<div class="ll1-demo" id="ll1-demo">
  <p class="ll1-lead">
    Prepare a grammar, derive FIRST and FOLLOW as least fixed points, build the
    LL(1) table, and then watch the table drive a stack-based parser.
  </p>

  <div class="ll1-presets" role="group" aria-label="Grammar examples">
    <button type="button" class="ll1-preset is-active" data-preset="pipeline">Full preparation tour</button>
    <button type="button" class="ll1-preset" data-preset="expression">Lecture expression grammar</button>
    <button type="button" class="ll1-preset" data-preset="nullable">Nullable LL(1) grammar</button>
  </div>

  <details class="ll1-editor">
    <summary>Edit or enter a grammar</summary>
    <div class="ll1-editor-body">
      <p class="ll1-note">ASCII syntax: use <code>-&gt;</code>, <code>|</code>, and <code>epsilon</code>. Separate symbols with spaces. A name appearing on a left-hand side is a nonterminal; every other symbol is a terminal.</p>
      <label for="ll1-source">Grammar</label>
      <textarea id="ll1-source" rows="8" spellcheck="false"></textarea>
      <div class="ll1-editor-row">
        <label for="ll1-start">Start symbol</label>
        <input id="ll1-start" type="text" spellcheck="false" autocomplete="off">
        <button type="button" id="ll1-load" class="ll1-button ll1-button-primary">Load grammar</button>
        <span id="ll1-editor-status" class="ll1-editor-status" role="status"></span>
      </div>
    </div>
  </details>

  <div class="ll1-tabs" role="tablist" aria-label="Workbench stage">
    <button type="button" id="ll1-tab-prepare" class="ll1-tab is-active" role="tab" aria-selected="true" aria-controls="ll1-prepare">1. Prepare grammar</button>
    <button type="button" id="ll1-tab-build" class="ll1-tab" role="tab" aria-selected="false" aria-controls="ll1-build">2. Build and run parser</button>
  </div>

  <section id="ll1-prepare" class="ll1-workspace" role="tabpanel" aria-labelledby="ll1-tab-prepare">
    <div class="ll1-pipeline" aria-label="Preparation pipeline">
      <button type="button" class="ll1-transform" data-transform="epsilon"><span>1</span> Eliminate epsilon-productions</button>
      <b aria-hidden="true">→</b>
      <button type="button" class="ll1-transform" data-transform="cycles"><span>2</span> Eliminate cycles</button>
      <b aria-hidden="true">→</b>
      <button type="button" class="ll1-transform" data-transform="factor"><span>3</span> Left factor</button>
      <b aria-hidden="true">→</b>
      <button type="button" class="ll1-transform" data-transform="leftrec"><span>4</span> Eliminate left recursion</button>
    </div>

    <div class="ll1-stepbar">
      <button type="button" id="ll1-prep-prev" class="ll1-button">← Earlier grammar</button>
      <div><span class="ll1-eyebrow">Transformation</span><strong id="ll1-prep-message"></strong></div>
      <button type="button" id="ll1-prep-next" class="ll1-button">Later grammar →</button>
    </div>

    <div class="ll1-grid ll1-grid-prepare">
      <section class="ll1-card">
        <header><div><span class="ll1-eyebrow">Current form</span><h2>Grammar</h2></div><span id="ll1-prep-start" class="ll1-chip"></span></header>
        <div id="ll1-prep-grammar" class="ll1-grammar"></div>
      </section>
      <section class="ll1-card">
        <header><div><span class="ll1-eyebrow">Preconditions and opportunities</span><h2>Diagnostics</h2></div></header>
        <div id="ll1-diagnostics" class="ll1-diagnostics"></div>
      </section>
    </div>

    <aside class="ll1-callout">
      The lecture’s indirect-left-recursion algorithm requires an input grammar
      with no epsilon-productions and no cycles. Its output may introduce a new
      epsilon-production; FIRST, FOLLOW, and table construction handle that normally.
    </aside>
  </section>

  <section id="ll1-build" class="ll1-workspace" role="tabpanel" aria-labelledby="ll1-tab-build" hidden>
    <div class="ll1-controls">
      <button type="button" id="ll1-rebuild" class="ll1-button ll1-button-primary">Recompute analysis</button>
      <button type="button" id="ll1-jump-first" class="ll1-button">FIRST</button>
      <button type="button" id="ll1-jump-follow" class="ll1-button">FOLLOW</button>
      <button type="button" id="ll1-jump-table" class="ll1-button">Parse table</button>
      <span class="ll1-divider" aria-hidden="true"></span>
      <label for="ll1-input">Input</label>
      <input id="ll1-input" type="text" value="id + num * id" spellcheck="false" autocomplete="off">
      <button type="button" id="ll1-parse" class="ll1-button">Parse input</button>
    </div>

    <div class="ll1-progress-row">
      <button type="button" id="ll1-prev" class="ll1-button" aria-label="Previous step">← Back</button>
      <button type="button" id="ll1-play" class="ll1-button" aria-pressed="false">Play</button>
      <button type="button" id="ll1-next" class="ll1-button">Next →</button>
      <input id="ll1-progress" type="range" min="0" max="0" value="0" aria-label="Analysis or parser step">
      <span class="ll1-keyboard-hint"><kbd>←</kbd> <kbd>→</kbd> step · <kbd>Space</kbd> play/pause</span>
      <span id="ll1-step-count" class="ll1-step-count"></span>
    </div>

    <section class="ll1-now" aria-live="polite" aria-atomic="true">
      <div><span id="ll1-phase" class="ll1-eyebrow">FIRST</span><strong id="ll1-message"></strong></div>
      <span id="ll1-outcome" class="ll1-outcome is-running">Analyzing</span>
    </section>

    <div class="ll1-grid ll1-grid-analysis">
      <section class="ll1-card">
        <header><div><span class="ll1-eyebrow">Numbered rules</span><h2>Grammar</h2></div><span id="ll1-build-start" class="ll1-chip"></span></header>
        <div id="ll1-build-grammar" class="ll1-grammar ll1-grammar-compact"></div>
      </section>
      <section class="ll1-card">
        <header><div><span class="ll1-eyebrow">Least fixed points</span><h2>FIRST and FOLLOW</h2></div></header>
        <div class="ll1-table-wrap"><table class="ll1-table"><thead><tr><th>Nonterminal</th><th>FIRST</th><th>FOLLOW</th></tr></thead><tbody id="ll1-sets"></tbody></table></div>
      </section>
    </div>

    <section class="ll1-card ll1-table-card">
      <header><div><span class="ll1-eyebrow">Production selected by lookahead</span><h2>LL(1) parse table</h2></div><span id="ll1-conflicts" class="ll1-conflicts"></span></header>
      <div id="ll1-parse-table" class="ll1-table-wrap"></div>
    </section>

    <div class="ll1-grid ll1-grid-runtime">
      <section class="ll1-card">
        <header><div><span class="ll1-eyebrow">Scanner output</span><h2>Input tape</h2></div></header>
        <div id="ll1-tape" class="ll1-tape"></div>
      </section>
      <section class="ll1-card">
        <header><div><span class="ll1-eyebrow">Top at the right</span><h2>Parser stack</h2></div></header>
        <div id="ll1-stack" class="ll1-stack"></div>
      </section>
    </div>

    <section class="ll1-card ll1-tree-card">
      <header><div><span class="ll1-eyebrow">Expanded by table entries</span><h2>Working parse tree</h2></div></header>
      <div id="ll1-tree" class="ll1-tree"></div>
    </section>
  </section>
</div>

<script src="{{ site.baseurl }}/assets/ll1-workbench.js"></script>
