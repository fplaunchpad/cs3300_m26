---
layout: page
title: LR(1) Workbench — Lookahead-Carrying Item Sets
permalink: /demos/lr1-workbench/
---

<link rel="stylesheet" href="{{ site.baseurl }}/assets/lr0-workbench.css">

<div class="lr0-demo" id="lr0-demo" data-parser-kind="lr1">
  <p class="lr0-lead">
    Build canonical LR(1) item sets, propagate lookaheads through CLOSURE,
    construct the LR(1) DFA and parsing table, and parse an input one action at
    a time.
  </p>

  <div class="lr0-presets" role="group" aria-label="Grammar examples">
    <button type="button" class="lr0-preset is-active" data-preset="lecture">Expression grammar</button>
    <button type="button" class="lr0-preset" data-preset="lr1-not-slr">LR(1), but not SLR(1)</button>
    <button type="button" class="lr0-preset" data-preset="not-lr1">Not LR(1)</button>
  </div>

  <details class="lr0-editor">
    <summary>Edit or enter a grammar</summary>
    <div class="lr0-editor-body">
      <p class="lr0-note">ASCII syntax: use <code>-&gt;</code>, <code>|</code>, and <code>epsilon</code>. Separate symbols with spaces. A symbol appearing on a left-hand side is a nonterminal; every other symbol is a terminal.</p>
      <label for="lr0-source">Grammar</label>
      <textarea id="lr0-source" rows="7" spellcheck="false"></textarea>
      <div class="lr0-editor-row">
        <label for="lr0-start">Start symbol</label>
        <input id="lr0-start" type="text" spellcheck="false" autocomplete="off">
        <button type="button" id="lr0-load" class="lr0-button lr0-button-primary">Build LR(1) machine</button>
        <span id="lr0-editor-status" class="lr0-editor-status" role="status"></span>
      </div>
    </div>
  </details>

  <div class="lr0-tabs" role="tablist" aria-label="Workbench stage">
    <button type="button" id="lr0-tab-items" class="lr0-tab is-active" role="tab" aria-selected="true" aria-controls="lr0-items">1. Canonical LR(1) item sets</button>
    <button type="button" id="lr0-tab-parser" class="lr0-tab" role="tab" aria-selected="false" aria-controls="lr0-parser">2. LR(1) ACTION and GOTO table</button>
    <button type="button" id="lr0-tab-run" class="lr0-tab" role="tab" aria-selected="false" aria-controls="lr0-run">3. Parse an input</button>
  </div>

  <section id="lr0-items" class="lr0-workspace" role="tabpanel" aria-labelledby="lr0-tab-items">
    <section class="lr0-card lr0-collection-card">
      <header><div><span class="lr0-eyebrow">Canonical collection</span><h2>LR(1) item sets</h2></div><span id="lr0-state-count" class="lr0-chip"></span></header>
      <div id="lr0-state-grid" class="lr0-state-grid"></div>
    </section>

    <section class="lr0-card lr0-dfa-card">
      <header><div><span class="lr0-eyebrow">Transitions preserve item lookaheads</span><h2>DFA recognizing viable prefixes</h2></div></header>
      <div class="lr0-dfa-scroll">
        <div id="lr0-dfa" class="lr0-dfa"></div>
      </div>
      <p class="lr0-dfa-note">Items with the same LR(0) core are grouped on one line. Their blue set records the lookaheads carried by those LR(1) items. States with identical cores but different lookaheads remain distinct.</p>
    </section>
  </section>

  <section id="lr0-parser" class="lr0-workspace" role="tabpanel" aria-labelledby="lr0-tab-parser" hidden>
    <section class="lr0-card lr0-first-follow-card">
      <header><div><span class="lr0-eyebrow">Used by LR(1) CLOSURE</span><h2>FIRST</h2></div><span class="lr0-chip">FIRST(βa) supplies propagated lookaheads</span></header>
      <div id="lr0-first-follow" class="lr0-table-wrap"></div>
    </section>

    <section class="lr0-card lr0-table-card">
      <header><div><span class="lr0-eyebrow">Item-local reduction lookaheads</span><h2>LR(1) parsing table</h2></div><span id="lr0-conflicts" class="lr0-conflicts"></span></header>
      <div id="lr0-parse-table" class="lr0-table-wrap"></div>
    </section>
  </section>

  <section id="lr0-run" class="lr0-workspace" role="tabpanel" aria-labelledby="lr0-tab-run" hidden>
    <div class="lr0-controls">
      <label for="lr0-input">Input tokens</label>
      <input id="lr0-input" type="text" spellcheck="false" autocomplete="off" aria-describedby="lr0-input-help">
      <button type="button" id="lr0-parse" class="lr0-button lr0-button-primary">Start / reset</button>
      <span id="lr0-input-help" class="lr0-note">Separate tokens with spaces; <code>$</code> is appended automatically.</span>
    </div>
    <div class="lr0-progress-row">
      <button type="button" id="lr0-prev" class="lr0-button">Previous</button>
      <button type="button" id="lr0-next" class="lr0-button">Next</button>
      <button type="button" id="lr0-play" class="lr0-button" aria-pressed="false">Play</button>
      <input id="lr0-progress" type="range" min="0" value="0" aria-label="Parsing step">
      <span id="lr0-step-count" class="lr0-step-count"></span>
      <span class="lr0-keyboard-hint"><kbd>←</kbd> <kbd>→</kbd> step</span>
    </div>

    <div class="lr0-now" aria-live="polite">
      <div><strong id="lr0-message"></strong><small id="lr0-reason"></small></div>
      <div><span id="lr0-action-label" class="lr0-chip"></span> <span id="lr0-outcome" class="lr0-outcome"></span></div>
    </div>

    <div class="lr0-grid lr0-grid-overview">
      <section class="lr0-card">
        <header><div><span class="lr0-eyebrow">Unread token highlighted</span><h2>Input</h2></div></header>
        <div id="lr0-tape" class="lr0-tape"></div>
      </section>
      <section class="lr0-card">
        <header><div><span class="lr0-eyebrow">Top at the right</span><h2>Grammar symbols and DFA states</h2></div></header>
        <div id="lr0-stack" class="lr0-stack"></div>
      </section>
    </div>

    <section class="lr0-card lr0-table-card">
      <header><div><span class="lr0-eyebrow">Orange cell is consulted now</span><h2>Current ACTION/GOTO lookup</h2></div></header>
      <div id="lr0-live-parse-table" class="lr0-table-wrap"></div>
    </section>

    <section class="lr0-card lr0-tree-card">
      <header><div><span class="lr0-eyebrow">Built by reductions</span><h2>Partial parse forest</h2></div></header>
      <div id="lr0-tree" class="lr0-tree"></div>
    </section>
  </section>
</div>

<script src="{{ site.baseurl }}/assets/lr0-workbench.js"></script>
<script type="module">
  import { instance } from "https://cdn.jsdelivr.net/npm/@viz-js/viz@3.27.0/dist/viz.js";
  window.lr0Graphviz = instance();
  window.lr0Graphviz.then(function () {
    window.dispatchEvent(new Event("lr0-graphviz-ready"));
  }).catch(function () {
    // The workbench retains its dependency-free SVG fallback.
  });
</script>
