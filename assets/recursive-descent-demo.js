(function () {
  "use strict";

  var NT = function (name) { return { kind: "nonterminal", value: name }; };
  var T = function (name) { return { kind: "terminal", value: name }; };

  var presets = {
    lecture: {
      input: "x + 5",
      start: "expr",
      title: "Lecture example (left recursion eliminated)",
      note: "The slide grammar expr → expr op term | term is left-recursive. This standard equivalent form generates any number of +/− terms without that loop.",
      grammar: {
        expr: [[NT("term"), NT("tail")]],
        tail: [[NT("op"), NT("term"), NT("tail")], []],
        term: [[T("id")], [T("num")]],
        op: [[T("+")], [T("-")]]
      }
    },
    deep: {
      input: "x + y",
      start: "goal",
      title: "A choice that fails late",
      note: "Both productions share id +. The parser consumes that prefix on its first guess, fails at num, rewinds all the way to the saved position, then tries the second rule.",
      grammar: {
        goal: [[T("id"), T("+"), T("num")], [T("id"), T("+"), T("id")]]
      }
    },
    reject: {
      input: "x +",
      start: "expr",
      title: "Incomplete expression",
      note: "Every possible production is tried. The input pointer is restored after each failure, but no parse can consume the complete token stream.",
      grammar: {
        expr: [[NT("term"), NT("tail")]],
        tail: [[NT("op"), NT("term"), NT("tail")], []],
        term: [[T("id")], [T("num")]],
        op: [[T("+")], [T("-")]]
      }
    },
    left: {
      input: "x + 5",
      start: "expr",
      title: "The original left-recursive grammar",
      note: "Watch expr call expr again at the same input position. A real implementation would overflow its call stack; this visualizer detects the cycle and stops safely.",
      grammar: {
        expr: [[NT("expr"), NT("op"), NT("term")], [NT("term")]],
        term: [[T("id")], [T("num")]],
        op: [[T("+")], [T("-")]]
      }
    }
  };

  var el = {};
  var events = [];
  var currentStep = 0;
  var activePreset = "lecture";
  var playTimer = null;
  var nextNodeId = 1;
  var LEFT_RECURSION = { name: "left-recursion" };
  var TRACE_LIMIT = { name: "trace-limit" };
  var MAX_EVENTS = 2500;

  function byId(id) { return document.getElementById(id); }
  function symbolText(symbol) { return symbol.kind === "nonterminal" ? "‹" + symbol.value + "›" : symbol.value; }
  function rhsText(rhs) { return rhs.length ? rhs.map(symbolText).join(" ") : "ε"; }
  function productionText(lhs, rhs) { return "‹" + lhs + "› → " + rhsText(rhs); }

  function tokenize(source, terminalNames) {
    var tokens = [];
    var pattern = /\s+|[A-Za-z_][A-Za-z_0-9]*|\d+|\+|-|[^\s]/gy;
    var match;
    while ((match = pattern.exec(source)) !== null) {
      var lexeme = match[0];
      if (/^\s+$/.test(lexeme)) continue;
      var type = /^[A-Za-z_]/.test(lexeme) ? (terminalNames.indexOf(lexeme) >= 0 ? lexeme : "id") : /^\d+$/.test(lexeme) ? "num" : lexeme;
      tokens.push({ lexeme: lexeme, type: type });
    }
    tokens.push({ lexeme: "$", type: "$" });
    return tokens;
  }

  function cloneState(state) {
    return {
      pos: state.pos,
      tokens: state.tokens.map(function (token) { return { lexeme: token.lexeme, type: token.type }; }),
      callStack: state.callStack.map(function (frame) { return Object.assign({}, frame); }),
      checkpoints: state.checkpoints.map(function (point) { return Object.assign({}, point); }),
      nodes: state.nodes.map(function (node) { return Object.assign({}, node, { children: node.children.slice() }); }),
      rootId: state.rootId,
      comparisons: state.comparisons,
      rewinds: state.rewinds,
      maxDepth: state.maxDepth,
      outcome: state.outcome
    };
  }

  function record(state, line, type, message) {
    events.push({ line: line, type: type, message: message, state: cloneState(state) });
    if (events.length >= MAX_EVENTS) {
      state.outcome = "limited";
      events.push({ line: 12, type: "trap", message: "Stopped after " + MAX_EVENTS + " steps. This grammar creates too much backtracking for the visualizer.", state: cloneState(state) });
      throw TRACE_LIMIT;
    }
  }

  function addNode(state, label, kind, parent, status) {
    var node = { id: nextNodeId++, label: label, kind: kind, parent: parent, children: [], status: status || "pending" };
    state.nodes.push(node);
    if (parent !== null) findNode(state, parent).children.push(node.id);
    return node;
  }

  function findNode(state, id) {
    for (var i = 0; i < state.nodes.length; i += 1) if (state.nodes[i].id === id) return state.nodes[i];
    return null;
  }

  function markBranch(state, id, status) {
    var node = findNode(state, id);
    if (!node) return;
    node.status = status;
    node.children.forEach(function (childId) { markBranch(state, childId, status); });
  }

  function buildTrace(preset, source) {
    events = [];
    nextNodeId = 1;
    var grammar = {};
    Object.keys(preset.grammar).forEach(function (key) { grammar[key] = preset.grammar[key]; });
    grammar.__start = [[NT(preset.start), T("$")]];
    var terminalNames = [];
    Object.keys(grammar).forEach(function (lhs) {
      grammar[lhs].forEach(function (rhs) {
        rhs.forEach(function (symbol) {
          if (symbol.kind === "terminal" && terminalNames.indexOf(symbol.value) < 0) terminalNames.push(symbol.value);
        });
      });
    });
    var state = {
      pos: 0,
      tokens: tokenize(source, terminalNames),
      callStack: [],
      checkpoints: [],
      nodes: [],
      rootId: null,
      comparisons: 0,
      rewinds: 0,
      maxDepth: 0,
      outcome: "running"
    };
    var root = addNode(state, "‹start›", "nonterminal", null, "active");
    state.rootId = root.id;
    record(state, 1, "start", "Call the procedure for the start symbol at input position 0.");

    function parseNonterminal(name, nodeId) {
      var entryPos = state.pos;
      var repeated = state.callStack.some(function (frame) { return frame.symbol === name && frame.entryPos === entryPos; });
      if (repeated) {
        findNode(state, nodeId).status = "failed";
        state.outcome = "trapped";
        record(state, 5, "trap", "Left recursion: parse(" + name + ") called parse(" + name + ") again without consuming input.");
        throw LEFT_RECURSION;
      }

      state.callStack.push({ symbol: name, entryPos: entryPos, nodeId: nodeId });
      state.maxDepth = Math.max(state.maxDepth, state.callStack.length);
      findNode(state, nodeId).status = "active";
      record(state, 1, "call", "Enter parse(" + name + ") with lookahead " + state.tokens[state.pos].lexeme + ".");

      var productions = grammar[name];
      for (var p = 0; p < productions.length; p += 1) {
        var rhs = productions[p];
        var saved = state.pos;
        var label = productionText(name === "__start" ? "start" : name, rhs);
        var attempt = addNode(state, label, "attempt", nodeId, "active");
        state.checkpoints.push({ symbol: name === "__start" ? "start" : name, production: p + 1, pos: saved });
        record(state, 3, "try", "Try " + label + "; save input position " + saved + ".");
        var ok = true;

        if (rhs.length === 0) record(state, 4, "epsilon", "Choose ε: this production consumes no input.");

        for (var s = 0; s < rhs.length; s += 1) {
          var symbol = rhs[s];
          if (symbol.kind === "nonterminal") {
            var childNT = addNode(state, "‹" + symbol.value + "›", "nonterminal", attempt.id, "active");
            record(state, 5, "recurse", "The next symbol is a nonterminal; call parse(" + symbol.value + ").");
            if (!parseNonterminal(symbol.value, childNT.id)) {
              ok = false;
              record(state, 8, "failure", "parse(" + symbol.value + ") returned 0, so this production fails.");
              break;
            }
          } else {
            var token = state.tokens[state.pos];
            var terminal = addNode(state, symbol.value, "terminal", attempt.id, "active");
            state.comparisons += 1;
            record(state, 6, "compare", "Compare terminal " + symbol.value + " with lookahead " + token.lexeme + " (" + token.type + ").");
            if (symbol.value === token.type) {
              terminal.label = symbol.value === "id" || symbol.value === "num" ? symbol.value + ": " + token.lexeme : token.lexeme;
              terminal.status = "success";
              state.pos += 1;
              record(state, 7, "match", "Matched " + token.lexeme + "; advance the input pointer to position " + state.pos + ".");
            } else {
              terminal.status = "failed";
              ok = false;
              record(state, 8, "failure", "Expected " + symbol.value + " but saw " + token.lexeme + "; this production fails.");
              break;
            }
          }
        }

        if (ok) {
          state.checkpoints.pop();
          attempt.status = "success";
          findNode(state, nodeId).status = "success";
          state.callStack.pop();
          record(state, 9, "success", "Every symbol in " + label + " succeeded; return 1.");
          return true;
        }

        var failedAt = state.pos;
        markBranch(state, attempt.id, "backtracked");
        state.pos = saved;
        state.rewinds += 1;
        record(state, 10, "backtrack", "Backtrack: restore input position " + failedAt + " → " + saved + ".");
        state.checkpoints.pop();
        if (p + 1 < productions.length) record(state, 11, "backtrack", "Try the next production for ‹" + (name === "__start" ? "start" : name) + "›.");
      }

      findNode(state, nodeId).status = "failed";
      state.callStack.pop();
      record(state, 12, "failure", "All productions for ‹" + (name === "__start" ? "start" : name) + "› failed; return 0.");
      return false;
    }

    try {
      var accepted = parseNonterminal("__start", root.id);
      state.outcome = accepted ? "accepted" : "rejected";
      record(state, accepted ? 9 : 12, accepted ? "accepted" : "rejected", accepted ? "Accept: the parse succeeded and the end marker was consumed." : "Reject: no production consumed the complete input.");
    } catch (error) {
      if (error === LEFT_RECURSION) record(state, 5, "trap", "Stopped safely. Without cycle detection, the call stack would continue growing forever.");
      else if (error !== TRACE_LIMIT) throw error;
    }
  }

  function parseGrammar(source, start) {
    var lines = source.split(/\r?\n/);
    var raw = [];
    var lhsNames = [];
    lines.forEach(function (original, index) {
      var line = original.replace(/#.*$/, "").trim();
      if (!line) return;
      var parts = line.split("->");
      if (parts.length !== 2) throw new Error("Line " + (index + 1) + ": expected exactly one ->");
      var lhs = parts[0].trim();
      if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(lhs)) throw new Error("Line " + (index + 1) + ": invalid nonterminal " + lhs);
      var alternatives = parts[1].split("|").map(function (part) { return part.trim(); });
      if (alternatives.some(function (part) { return !part; })) throw new Error("Line " + (index + 1) + ": write epsilon for an empty production");
      raw.push({ lhs: lhs, alternatives: alternatives, line: index + 1 });
      if (lhsNames.indexOf(lhs) < 0) lhsNames.push(lhs);
    });
    if (!raw.length) throw new Error("Enter at least one production");
    start = start.trim();
    if (lhsNames.indexOf(start) < 0) throw new Error("Start symbol " + start + " has no production");

    var grammar = {};
    lhsNames.forEach(function (lhs) { grammar[lhs] = []; });
    raw.forEach(function (rule) {
      rule.alternatives.forEach(function (alternative) {
        var names = alternative.split(/\s+/);
        if (names.indexOf("epsilon") >= 0 && (names.length !== 1 || names[0] !== "epsilon")) throw new Error("Line " + rule.line + ": epsilon must be the entire alternative");
        var rhs = names[0] === "epsilon" ? [] : names.map(function (name) {
          return lhsNames.indexOf(name) >= 0 ? NT(name) : T(name);
        });
        grammar[rule.lhs].push(rhs);
      });
    });
    return { input: el.input.value, start: start, note: "Custom grammar. Edit the ASCII rules above and choose Use this grammar to rebuild the trace.", grammar: grammar };
  }

  function clear(element) { while (element.firstChild) element.removeChild(element.firstChild); }
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderGrammar(preset) {
    clear(el.grammar);
    Object.keys(preset.grammar).forEach(function (lhs) {
      var row = make("div", "rd-production");
      row.appendChild(make("span", "rd-lhs", "‹" + lhs + "›"));
      row.appendChild(make("span", "rd-arrow", "→"));
      row.appendChild(make("span", "rd-rhs", preset.grammar[lhs].map(rhsText).join("  |  ")));
      el.grammar.appendChild(row);
    });
    el.startSymbol.textContent = "start: ‹" + preset.start + "›";
    el.grammarNote.textContent = preset.note;
  }

  function renderTape(state) {
    clear(el.tape);
    state.tokens.forEach(function (token, index) {
      var classes = "rd-token-wrap";
      if (index < state.pos) classes += " is-consumed";
      if (index === state.pos) classes += " is-current";
      var wrap = make("div", classes);
      wrap.appendChild(make("span", "rd-token", token.lexeme));
      wrap.appendChild(make("small", "rd-token-type", token.type === token.lexeme ? "terminal" : token.type));
      el.tape.appendChild(wrap);
    });
  }

  function renderStack(state) {
    clear(el.stack);
    if (!state.callStack.length) {
      el.stack.className = "rd-stack rd-empty";
      el.stack.textContent = "No active calls";
      return;
    }
    el.stack.className = "rd-stack";
    state.callStack.forEach(function (frame, index) {
      var item = make("div", "rd-stack-frame");
      item.appendChild(make("code", "", "parse(" + (frame.symbol === "__start" ? "start" : frame.symbol) + ")"));
      item.appendChild(make("span", "rd-frame-meta", (index === state.callStack.length - 1 ? "top · " : "") + "entered at " + frame.entryPos));
      el.stack.appendChild(item);
    });
  }

  function renderCheckpoints(state) {
    clear(el.checkpoints);
    if (!state.checkpoints.length) {
      el.checkpoints.className = "rd-checkpoints rd-empty";
      el.checkpoints.textContent = "No saved positions";
      return;
    }
    el.checkpoints.className = "rd-checkpoints";
    state.checkpoints.forEach(function (point) {
      var item = make("div", "rd-checkpoint");
      item.appendChild(make("code", "", "‹" + point.symbol + "› rule " + point.production));
      item.appendChild(make("span", "rd-frame-meta", "restore to " + point.pos));
      el.checkpoints.appendChild(item);
    });
  }

  function renderTree(state) {
    clear(el.tree);
    if (!state.rootId) {
      el.tree.appendChild(make("div", "rd-tree-empty", "The tree will appear here."));
      return;
    }
    var lookup = {};
    state.nodes.forEach(function (node) { lookup[node.id] = node; });

    function branch(nodeId, top) {
      var node = lookup[nodeId];
      var list = make("ul", "rd-tree-list");
      var item = make("li", "rd-tree-item" + (node.status === "backtracked" ? " is-backtracked" : ""));
      var nodeClass = "rd-node is-" + node.kind + " is-" + node.status;
      item.appendChild(make("span", nodeClass, node.label));
      if (node.children.length) {
        var childList = make("ul", "rd-tree-list");
        node.children.forEach(function (childId) {
          var childBranch = branch(childId, false);
          childList.appendChild(childBranch.firstChild);
        });
        item.appendChild(childList);
      }
      list.appendChild(item);
      if (top) list.setAttribute("aria-label", "Working parse tree");
      return list;
    }
    el.tree.appendChild(branch(state.rootId, true));
  }

  function renderTrace(step) {
    clear(el.trace);
    var first = Math.max(0, step - 9);
    for (var i = step; i >= first; i -= 1) {
      var event = events[i];
      var item = make("li", "is-" + event.type + (i === step ? " is-current" : ""));
      var button = make("button", "");
      button.type = "button";
      button.dataset.step = String(i);
      button.appendChild(make("span", "rd-trace-step", "Step " + i));
      button.appendChild(make("span", "rd-trace-mark", event.type === "success" || event.type === "accepted" ? "✓" : event.type === "failure" || event.type === "backtrack" || event.type === "trap" || event.type === "rejected" ? "↶" : "•"));
      button.appendChild(make("span", "", event.message));
      item.appendChild(button);
      el.trace.appendChild(item);
    }
  }

  function render(step) {
    currentStep = Math.max(0, Math.min(step, events.length - 1));
    var event = events[currentStep];
    var state = event.state;
    el.message.textContent = event.message;
    el.progress.max = String(events.length - 1);
    el.progress.value = String(currentStep);
    el.stepCount.textContent = "Step " + currentStep + " of " + (events.length - 1);
    el.prev.disabled = currentStep === 0;
    el.next.disabled = currentStep === events.length - 1;
    el.comparisons.textContent = state.comparisons;
    el.rewinds.textContent = state.rewinds;
    el.depth.textContent = state.maxDepth;

    el.outcome.className = "rd-outcome";
    if (state.outcome === "accepted") { el.outcome.classList.add("is-accepted"); el.outcome.textContent = "Accepted"; }
    else if (state.outcome === "rejected") { el.outcome.classList.add("is-rejected"); el.outcome.textContent = "Rejected"; }
    else if (state.outcome === "trapped") { el.outcome.classList.add("is-trapped"); el.outcome.textContent = "Left recursion"; }
    else if (state.outcome === "limited") { el.outcome.classList.add("is-trapped"); el.outcome.textContent = "Step limit"; }
    else { el.outcome.classList.add("is-running"); el.outcome.textContent = "Running"; }

    Array.prototype.forEach.call(el.code.querySelectorAll("li"), function (line) {
      line.classList.toggle("is-current", Number(line.dataset.line) === event.line);
    });
    renderTape(state);
    renderStack(state);
    renderCheckpoints(state);
    renderTree(state);
    renderTrace(currentStep);
  }

  function stopPlaying() {
    if (playTimer !== null) window.clearInterval(playTimer);
    playTimer = null;
    el.play.textContent = "Play";
    el.play.setAttribute("aria-pressed", "false");
  }

  function startPlaying() {
    if (currentStep >= events.length - 1) render(0);
    el.play.textContent = "Pause";
    el.play.setAttribute("aria-pressed", "true");
    playTimer = window.setInterval(function () {
      if (currentStep >= events.length - 1) { stopPlaying(); return; }
      render(currentStep + 1);
    }, Number(el.speed.value));
  }

  function rebuild(startAtBeginning) {
    stopPlaying();
    var preset = presets[activePreset];
    buildTrace(preset, el.input.value);
    renderGrammar(preset);
    render(startAtBeginning ? 0 : events.length - 1);
  }

  function choosePreset(name) {
    activePreset = name;
    el.input.value = presets[name].input;
    Array.prototype.forEach.call(document.querySelectorAll(".rd-preset"), function (button) {
      button.classList.toggle("is-active", button.dataset.preset === name);
    });
    rebuild(true);
  }

  function init() {
    el.input = byId("rd-input");
    el.run = byId("rd-run");
    el.prev = byId("rd-prev");
    el.next = byId("rd-next");
    el.play = byId("rd-play");
    el.speed = byId("rd-speed");
    el.progress = byId("rd-progress");
    el.stepCount = byId("rd-step-count");
    el.message = byId("rd-message");
    el.outcome = byId("rd-outcome");
    el.grammar = byId("rd-grammar");
    el.grammarNote = byId("rd-grammar-note");
    el.startSymbol = byId("rd-start-symbol");
    el.code = byId("rd-code");
    el.tape = byId("rd-tape");
    el.stack = byId("rd-stack");
    el.checkpoints = byId("rd-checkpoints");
    el.tree = byId("rd-tree");
    el.trace = byId("rd-trace");
    el.comparisons = byId("rd-comparisons");
    el.rewinds = byId("rd-rewinds");
    el.depth = byId("rd-depth");
    el.customGrammar = byId("rd-custom-grammar");
    el.customStart = byId("rd-custom-start");
    el.useGrammar = byId("rd-use-grammar");
    el.customStatus = byId("rd-custom-status");

    el.run.addEventListener("click", function () { rebuild(true); });
    el.prev.addEventListener("click", function () { stopPlaying(); render(currentStep - 1); });
    el.next.addEventListener("click", function () { stopPlaying(); render(currentStep + 1); });
    el.play.addEventListener("click", function () { playTimer === null ? startPlaying() : stopPlaying(); });
    el.speed.addEventListener("change", function () { if (playTimer !== null) { stopPlaying(); startPlaying(); } });
    el.progress.addEventListener("input", function () { stopPlaying(); render(Number(el.progress.value)); });
    el.input.addEventListener("keydown", function (event) { if (event.key === "Enter") rebuild(true); });
    el.useGrammar.addEventListener("click", function () {
      try {
        presets.custom = parseGrammar(el.customGrammar.value, el.customStart.value);
        activePreset = "custom";
        Array.prototype.forEach.call(document.querySelectorAll(".rd-preset"), function (button) { button.classList.remove("is-active"); });
        el.customStatus.className = "rd-custom-status";
        el.customStatus.textContent = "Grammar loaded.";
        rebuild(true);
      } catch (error) {
        el.customStatus.className = "rd-custom-status is-error";
        el.customStatus.textContent = error.message;
      }
    });
    el.trace.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-step]");
      if (button) { stopPlaying(); render(Number(button.dataset.step)); }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".rd-preset"), function (button) {
      button.addEventListener("click", function () { choosePreset(button.dataset.preset); });
    });
    document.addEventListener("keydown", function (event) {
      if (event.target === el.input || event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.tagName === "SELECT") return;
      if (event.key === "ArrowRight") { stopPlaying(); render(currentStep + 1); }
      if (event.key === "ArrowLeft") { stopPlaying(); render(currentStep - 1); }
      if (event.key === " ") { event.preventDefault(); playTimer === null ? startPlaying() : stopPlaying(); }
    });

    choosePreset("lecture");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}());
