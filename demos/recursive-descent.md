---
layout: page
title: Recursive Descent Parser — Step by Step
permalink: /demos/recursive-descent/
---

<link rel="stylesheet" href="{{ site.baseurl }}/assets/recursive-descent-demo.css">

<div class="rd-demo" id="rd-demo">
  <p class="rd-lead">
    Watch a top-down parser build its tree in pre-order, depth-first order. Every
    production saves the input position; a failed choice restores that position
    before the next production is tried.
  </p>

  <div class="rd-presets" role="group" aria-label="Parser examples">
    <button type="button" class="rd-preset is-active" data-preset="lecture">Lecture example</button>
    <button type="button" class="rd-preset" data-preset="deep">Deep backtrack</button>
    <button type="button" class="rd-preset" data-preset="reject">Rejected input</button>
    <button type="button" class="rd-preset" data-preset="left">Left-recursion trap</button>
  </div>

  <details class="rd-custom" id="rd-custom">
    <summary>Try your own grammar</summary>
    <div class="rd-custom-body">
      <p class="rd-note">ASCII syntax only: use <code>-&gt;</code>, <code>|</code>, and <code>epsilon</code>. A name that appears on a left-hand side is a nonterminal; every other symbol is a terminal. Use <code>id</code> and <code>num</code> for token classes. Punctuation terminals are one character each.</p>
      <div class="rd-custom-grid">
        <label for="rd-custom-grammar">Grammar</label>
        <textarea id="rd-custom-grammar" rows="7" spellcheck="false">expr -> term tail
tail -> op term tail | epsilon
term -> id | num
op -> + | -</textarea>
        <label for="rd-custom-start">Start symbol</label>
        <input id="rd-custom-start" type="text" value="expr" spellcheck="false" autocomplete="off">
        <button type="button" id="rd-use-grammar" class="rd-button rd-button-primary">Use this grammar</button>
        <span id="rd-custom-status" class="rd-custom-status" role="status"></span>
      </div>
    </div>
  </details>

  <section class="rd-controls" aria-label="Parser controls">
    <label class="rd-input-label" for="rd-input">Input</label>
    <input id="rd-input" class="rd-input" type="text" value="x + 5" spellcheck="false" autocomplete="off">
    <button type="button" id="rd-run" class="rd-button rd-button-primary">Start over</button>
    <span class="rd-control-divider" aria-hidden="true"></span>
    <button type="button" id="rd-prev" class="rd-button" aria-label="Previous parser step">← Back</button>
    <button type="button" id="rd-next" class="rd-button">Next →</button>
    <button type="button" id="rd-play" class="rd-button" aria-pressed="false">Play</button>
    <label class="rd-speed-label" for="rd-speed">Speed</label>
    <select id="rd-speed" class="rd-speed">
      <option value="1100">Slow</option>
      <option value="650" selected>Normal</option>
      <option value="260">Fast</option>
    </select>
  </section>

  <div class="rd-progress-row">
    <input id="rd-progress" class="rd-progress" type="range" min="0" max="0" value="0" aria-label="Parser step">
    <span class="rd-keyboard-hint"><kbd>←</kbd> <kbd>→</kbd> step · <kbd>Space</kbd> play/pause</span>
    <span id="rd-step-count" class="rd-step-count">Step 0 of 0</span>
  </div>

  <section class="rd-now" aria-live="polite" aria-atomic="true">
    <div>
      <span class="rd-eyebrow">Now</span>
      <strong id="rd-message">Ready to parse.</strong>
    </div>
    <span id="rd-outcome" class="rd-outcome is-running">Ready</span>
  </section>

  <div class="rd-grid rd-grid-focus">
    <section class="rd-card rd-grammar-card">
      <header class="rd-card-header">
        <div>
          <span class="rd-eyebrow">The rules</span>
          <h2>Grammar</h2>
        </div>
        <span id="rd-start-symbol" class="rd-chip"></span>
      </header>
      <div id="rd-grammar" class="rd-grammar"></div>
      <p id="rd-grammar-note" class="rd-note"></p>
    </section>

    <section class="rd-card rd-tape-card">
      <header class="rd-card-header rd-card-header-row">
        <div>
          <span class="rd-eyebrow">Scanner output</span>
          <h2>Input tape</h2>
        </div>
        <div class="rd-stats" aria-label="Parser statistics">
          <span><b id="rd-comparisons">0</b> comparisons</span>
          <span><b id="rd-rewinds">0</b> rewinds</span>
          <span><b id="rd-depth">0</b> max depth</span>
        </div>
      </header>
      <div id="rd-tape" class="rd-tape"></div>
    </section>
  </div>

  <section class="rd-card rd-tree-card">
    <header class="rd-card-header rd-card-header-row">
      <div>
        <span class="rd-eyebrow">Built top down</span>
        <h2>Working parse tree</h2>
      </div>
      <div class="rd-legend" aria-label="Parse tree legend">
        <span><i class="rd-dot is-active"></i> active</span>
        <span><i class="rd-dot is-success"></i> matched</span>
        <span><i class="rd-dot is-backtracked"></i> abandoned</span>
      </div>
    </header>
    <div id="rd-tree" class="rd-tree"></div>
  </section>

  <div class="rd-grid rd-grid-internals" aria-label="Optional parser internals">
    <details class="rd-card rd-inspector">
      <summary>
        <div>
          <span class="rd-eyebrow">Slide algorithm</span>
          <h2>Parser pseudocode</h2>
        </div>
      </summary>
      <ol id="rd-code" class="rd-code" aria-label="Recursive descent pseudocode">
        <li data-line="1"><code>parse(A):</code></li>
        <li data-line="2"><code>for each A → X₁ … Xₖ:</code></li>
        <li data-line="3"><code>save ← input position</code></li>
        <li data-line="4"><code>for each Xᵢ in the RHS:</code></li>
        <li data-line="5"><code>if nonterminal: parse(Xᵢ)</code></li>
        <li data-line="6"><code>else if Xᵢ = lookahead:</code></li>
        <li data-line="7"><code>advance input</code></li>
        <li data-line="8"><code>else: this production fails</code></li>
        <li data-line="9"><code>if every Xᵢ succeeded: return 1</code></li>
        <li data-line="10"><code>input position ← save</code></li>
        <li data-line="11"><code>// try the next production</code></li>
        <li data-line="12"><code>return 0</code></li>
      </ol>
    </details>

    <details class="rd-card rd-inspector">
      <summary>
        <div>
          <span class="rd-eyebrow">Runtime state</span>
          <h2>Call stack</h2>
        </div>
      </summary>
      <div id="rd-stack" class="rd-stack rd-empty">No active calls</div>
    </details>

    <details class="rd-card rd-inspector">
      <summary>
        <div>
          <span class="rd-eyebrow">Saved input positions</span>
          <h2>Backtrack checkpoints</h2>
        </div>
      </summary>
      <div id="rd-checkpoints" class="rd-checkpoints rd-empty">No saved positions</div>
    </details>
  </div>

  <section class="rd-card rd-trace-card">
    <header class="rd-card-header rd-card-header-row">
      <div>
        <span class="rd-eyebrow">Most recent first</span>
        <h2>Execution trace</h2>
      </div>
      <span class="rd-note">Click an event to jump to it</span>
    </header>
    <ol id="rd-trace" class="rd-trace"></ol>
  </section>

  <aside class="rd-takeaway">
    <strong>The important distinction:</strong> backtracking is finite search—restore
    the saved input pointer and try another rule. Left recursion is different: the
    same procedure calls itself before consuming input, so there is no failure from
    which to backtrack. Predictive parsing avoids the search by using lookahead to
    choose the correct production directly.
  </aside>
</div>

<script src="{{ site.baseurl }}/assets/recursive-descent-demo.js"></script>
