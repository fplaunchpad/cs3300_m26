---
layout: page
title: LR(0) Workbench — Item Sets, DFA, and Parsing Table
permalink: /demos/lr0-workbench/
---

<link rel="stylesheet" href="{{ site.baseurl }}/assets/lr0-workbench.css">

<div class="lr0-demo" id="lr0-demo">
  <p class="lr0-lead">
    Augment a grammar, build its canonical collection of LR(0) item sets,
    draw the viable-prefix DFA, and derive its ACTION and GOTO table.
  </p>

  <div class="lr0-presets" role="group" aria-label="Grammar examples">
    <button type="button" class="lr0-preset is-active" data-preset="lecture">Lecture grammar</button>
    <button type="button" class="lr0-preset" data-preset="shift-reduce">Shift–reduce conflict</button>
    <button type="button" class="lr0-preset" data-preset="reduce-reduce">Reduce–reduce conflict</button>
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
        <button type="button" id="lr0-load" class="lr0-button lr0-button-primary">Build LR(0) machine</button>
        <span id="lr0-editor-status" class="lr0-editor-status" role="status"></span>
      </div>
    </div>
  </details>

  <div class="lr0-tabs" role="tablist" aria-label="Workbench stage">
    <button type="button" id="lr0-tab-items" class="lr0-tab is-active" role="tab" aria-selected="true" aria-controls="lr0-items">1. Canonical item sets</button>
    <button type="button" id="lr0-tab-parser" class="lr0-tab" role="tab" aria-selected="false" aria-controls="lr0-parser">2. ACTION and GOTO table</button>
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
      <p class="lr0-dfa-note">Every state accepts a viable prefix. Node labels additionally show <b>R</b> for a completed production, <b>A</b> for the accepting parser configuration, and <b>!</b> for a parsing-table conflict.</p>
    </section>

  </section>

  <section id="lr0-parser" class="lr0-workspace" role="tabpanel" aria-labelledby="lr0-tab-parser" hidden>
    <section class="lr0-card lr0-table-card">
      <header><div><span class="lr0-eyebrow">One row per item-set state</span><h2>LR(0) parsing table</h2></div><span id="lr0-conflicts" class="lr0-conflicts"></span></header>
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
