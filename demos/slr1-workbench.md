---
layout: page
title: SLR(1) Workbench — FOLLOW-Guided Reductions
permalink: /demos/slr1-workbench/
---

<link rel="stylesheet" href="{{ site.baseurl }}/assets/lr0-workbench.css">

<div class="lr0-demo" id="lr0-demo" data-parser-kind="slr1">
  <p class="lr0-lead">
    Build the canonical collection of LR(0) item sets, compute FIRST and FOLLOW,
    and use FOLLOW sets to place reductions in an SLR(1) parsing table.
  </p>

  <div class="lr0-presets" role="group" aria-label="Grammar examples">
    <button type="button" class="lr0-preset is-active" data-preset="lecture">Expression grammar</button>
    <button type="button" class="lr0-preset" data-preset="epsilon">Epsilon grammar</button>
    <button type="button" class="lr0-preset" data-preset="not-slr">Not SLR(1)</button>
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
        <button type="button" id="lr0-load" class="lr0-button lr0-button-primary">Build SLR(1) table</button>
        <span id="lr0-editor-status" class="lr0-editor-status" role="status"></span>
      </div>
    </div>
  </details>

  <div class="lr0-tabs" role="tablist" aria-label="Workbench stage">
    <button type="button" id="lr0-tab-items" class="lr0-tab is-active" role="tab" aria-selected="true" aria-controls="lr0-items">1. Canonical LR(0) item sets</button>
    <button type="button" id="lr0-tab-parser" class="lr0-tab" role="tab" aria-selected="false" aria-controls="lr0-parser">2. SLR(1) ACTION and GOTO table</button>
  </div>

  <section id="lr0-items" class="lr0-workspace" role="tabpanel" aria-labelledby="lr0-tab-items">
    <section class="lr0-card lr0-collection-card">
      <header><div><span class="lr0-eyebrow">Canonical collection</span><h2>LR(0) item sets</h2></div><span id="lr0-state-count" class="lr0-chip"></span></header>
      <div id="lr0-state-grid" class="lr0-state-grid"></div>
    </section>

    <section class="lr0-card lr0-dfa-card">
      <header><div><span class="lr0-eyebrow">Transitions on grammar symbols</span><h2>DFA recognizing viable prefixes</h2></div></header>
      <div class="lr0-dfa-scroll">
        <div id="lr0-dfa" class="lr0-dfa"></div>
      </div>
      <p class="lr0-dfa-note">The DFA is identical to the LR(0) machine. SLR(1) changes where completed items place reductions in the parsing table.</p>
    </section>
  </section>

  <section id="lr0-parser" class="lr0-workspace" role="tabpanel" aria-labelledby="lr0-tab-parser" hidden>
    <section class="lr0-card lr0-first-follow-card">
      <header><div><span class="lr0-eyebrow">Reduction lookaheads</span><h2>FIRST and FOLLOW</h2></div><span class="lr0-chip">reduce A → β only on FOLLOW(A)</span></header>
      <div id="lr0-first-follow" class="lr0-table-wrap"></div>
    </section>

    <section class="lr0-card lr0-table-card">
      <header><div><span class="lr0-eyebrow">FOLLOW-guided reductions</span><h2>SLR(1) parsing table</h2></div><span id="lr0-conflicts" class="lr0-conflicts"></span></header>
      <div id="lr0-parse-table" class="lr0-table-wrap"></div>
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
