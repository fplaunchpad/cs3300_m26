(function () {
  "use strict";

  var EPS = "epsilon";
  var END = "$";
  var el = {};
  var grammar = null;
  var machine = null;
  var table = null;
  var firstFollow = null;
  var parserKind = "lr0";
  var selectedState = 0;
  var activeTab = "items";
  var activePreset = "lecture";
  var dfaRenderGeneration = 0;
  var trace = [];
  var traceStep = 0;
  var playTimer = null;

  var presets = {
    lecture: {
      start: "E",
      input: "id + id",
      source: [
        "E -> E + T | T",
        "T -> id | ( E )"
      ].join("\n")
    },
    "shift-reduce": {
      start: "E",
      input: "id + id + id",
      source: [
        "E -> E + E | E * E | id"
      ].join("\n")
    },
    "reduce-reduce": {
      start: "S",
      input: "id",
      source: [
        "S -> A | B",
        "A -> id",
        "B -> id"
      ].join("\n")
    }
  };

  var slrPresets = {
    lecture: {
      start: "E",
      input: "id + id * id",
      source: [
        "E -> E + T | T",
        "T -> T * F | F",
        "F -> ( E ) | id"
      ].join("\n")
    },
    epsilon: {
      start: "S",
      input: "a a b",
      source: [
        "S -> A B",
        "A -> a A | epsilon",
        "B -> b B | epsilon"
      ].join("\n")
    },
    "not-slr": {
      start: "S",
      input: "d a",
      source: [
        "S -> A a | b A c | B c | b B a",
        "A -> d",
        "B -> d"
      ].join("\n")
    }
  };

  function byId(id) { return document.getElementById(id); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function makeSvg(tag, attributes, text) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attributes || {}).forEach(function (name) { node.setAttribute(name, attributes[name]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function uniqueStrings(values) {
    var seen = {};
    return values.filter(function (value) {
      if (seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }
  function itemKey(item) { return item.production + ":" + item.dot; }
  function itemSetKey(items) {
    return items.map(itemKey).sort().join("|");
  }
  function productionText(production) {
    return production.lhs + " → " + (production.rhs.length ? production.rhs.join(" ") : "ε");
  }
  function itemText(item) {
    var production = grammar.productions[item.production];
    var rhs = production.rhs.slice();
    rhs.splice(item.dot, 0, "•");
    return production.lhs + " → " + rhs.join(" ");
  }
  function isNonterminal(symbol) {
    return grammar.nonterminals.indexOf(symbol) >= 0;
  }

  function parseGrammar(source, start) {
    var rows = [];
    var nonterminals = [];
    source.split(/\r?\n/).forEach(function (original, index) {
      var line = original.replace(/#.*$/, "").trim();
      if (!line) return;
      var parts = line.split("->");
      if (parts.length !== 2) throw new Error("Line " + (index + 1) + ": expected exactly one ->");
      var lhs = parts[0].trim();
      if (!/^[A-Za-z_][A-Za-z0-9_']*$/.test(lhs)) throw new Error("Line " + (index + 1) + ": invalid nonterminal " + lhs);
      if (nonterminals.indexOf(lhs) < 0) nonterminals.push(lhs);
      rows.push({ lhs: lhs, alternatives: parts[1].split("|"), line: index + 1 });
    });
    if (!rows.length) throw new Error("Enter at least one production");
    start = start.trim();
    if (nonterminals.indexOf(start) < 0) throw new Error("Start symbol " + start + " has no production");

    var augmented = start + "'";
    while (nonterminals.indexOf(augmented) >= 0) augmented += "'";
    var productions = [{ id: 0, lhs: augmented, rhs: [start, END], augmented: true }];
    var seenProductions = {};
    var terminals = [];
    var nextId = 1;
    rows.forEach(function (row) {
      row.alternatives.forEach(function (raw) {
        var alternative = raw.trim();
        if (!alternative) throw new Error("Line " + row.line + ": write epsilon for an empty production");
        var rhs = alternative.split(/\s+/);
        if (rhs.indexOf(EPS) >= 0) {
          if (rhs.length !== 1) throw new Error("Line " + row.line + ": epsilon must be the entire alternative");
          rhs = [];
        }
        var key = row.lhs + "\u0001" + rhs.join("\u0001");
        if (seenProductions[key]) return;
        seenProductions[key] = true;
        productions.push({ id: nextId, lhs: row.lhs, rhs: rhs, augmented: false });
        nextId += 1;
      });
    });
    productions.slice(1).forEach(function (production) {
      production.rhs.forEach(function (symbol) {
        if (nonterminals.indexOf(symbol) < 0 && terminals.indexOf(symbol) < 0) terminals.push(symbol);
      });
    });
    if (terminals.indexOf(END) >= 0) throw new Error("$ is reserved for the end marker; do not put it in the grammar");
    terminals.push(END);
    return {
      start: start,
      augmented: augmented,
      nonterminals: nonterminals,
      terminals: terminals,
      symbols: nonterminals.concat(terminals),
      productions: productions
    };
  }

  function computeFirstFollow() {
    var first = {};
    var follow = {};
    var nullable = {};
    grammar.nonterminals.forEach(function (nonterminal) {
      first[nonterminal] = [];
      follow[nonterminal] = [];
      nullable[nonterminal] = false;
    });

    function add(target, value) {
      if (target.indexOf(value) >= 0) return false;
      target.push(value);
      return true;
    }

    var changed = true;
    while (changed) {
      changed = false;
      grammar.productions.slice(1).forEach(function (production) {
        var allNullable = true;
        for (var i = 0; i < production.rhs.length; i += 1) {
          var symbol = production.rhs[i];
          if (!isNonterminal(symbol)) {
            changed = add(first[production.lhs], symbol) || changed;
            allNullable = false;
            break;
          }
          first[symbol].forEach(function (terminal) {
            changed = add(first[production.lhs], terminal) || changed;
          });
          if (!nullable[symbol]) {
            allNullable = false;
            break;
          }
        }
        if (allNullable && !nullable[production.lhs]) {
          nullable[production.lhs] = true;
          changed = true;
        }
      });
    }

    add(follow[grammar.start], END);
    changed = true;
    while (changed) {
      changed = false;
      grammar.productions.slice(1).forEach(function (production) {
        production.rhs.forEach(function (symbol, index) {
          if (!isNonterminal(symbol)) return;
          var suffixNullable = true;
          for (var i = index + 1; i < production.rhs.length; i += 1) {
            var next = production.rhs[i];
            if (!isNonterminal(next)) {
              changed = add(follow[symbol], next) || changed;
              suffixNullable = false;
              break;
            }
            first[next].forEach(function (terminal) {
              changed = add(follow[symbol], terminal) || changed;
            });
            if (!nullable[next]) {
              suffixNullable = false;
              break;
            }
          }
          if (suffixNullable) {
            follow[production.lhs].forEach(function (terminal) {
              changed = add(follow[symbol], terminal) || changed;
            });
          }
        });
      });
    }
    return { first: first, follow: follow, nullable: nullable };
  }

  function productionsFor(lhs) {
    return grammar.productions.filter(function (production) { return production.lhs === lhs; });
  }

  function closure(seed) {
    var items = [];
    var present = {};
    seed.forEach(function (item) {
      var key = itemKey(item);
      if (!present[key]) {
        present[key] = true;
        items.push({ production: item.production, dot: item.dot });
      }
    });
    for (var cursor = 0; cursor < items.length; cursor += 1) {
      var item = items[cursor];
      var production = grammar.productions[item.production];
      var symbol = production.rhs[item.dot];
      if (!isNonterminal(symbol)) continue;
      productionsFor(symbol).forEach(function (candidate) {
        var next = { production: candidate.id, dot: 0 };
        var key = itemKey(next);
        if (!present[key]) {
          present[key] = true;
          items.push(next);
        }
      });
    }
    return items.sort(function (a, b) {
      return a.production - b.production || a.dot - b.dot;
    });
  }

  function gotoItems(items, symbol) {
    var advanced = [];
    items.forEach(function (item) {
      var production = grammar.productions[item.production];
      if (production.rhs[item.dot] === symbol) {
        advanced.push({ production: item.production, dot: item.dot + 1 });
      }
    });
    return advanced.length ? closure(advanced) : [];
  }

  function buildMachine() {
    var startItems = closure([{ production: 0, dot: 0 }]);
    var states = [{ id: 0, items: startItems, via: null }];
    var stateByKey = {};
    var transitions = [];
    stateByKey[itemSetKey(startItems)] = 0;
    for (var cursor = 0; cursor < states.length; cursor += 1) {
      var state = states[cursor];
      grammar.symbols.forEach(function (symbol) {
        var nextItems = gotoItems(state.items, symbol);
        if (!nextItems.length) return;
        var key = itemSetKey(nextItems);
        var target = stateByKey[key];
        if (target === undefined) {
          target = states.length;
          stateByKey[key] = target;
          states.push({ id: target, items: nextItems, via: { from: state.id, symbol: symbol } });
        }
        transitions.push({ from: state.id, symbol: symbol, to: target });
      });
    }
    return { states: states, transitions: transitions };
  }

  function transitionFrom(state, symbol) {
    var found = machine.transitions.find(function (transition) {
      return transition.from === state && transition.symbol === symbol;
    });
    return found ? found.to : null;
  }

  function actionKey(action) {
    return action.kind + ":" + (action.target === undefined ? "" : action.target) + ":" + (action.production === undefined ? "" : action.production);
  }

  function addAction(actions, state, terminal, action) {
    if (!actions[state][terminal]) actions[state][terminal] = [];
    var key = actionKey(action);
    if (!actions[state][terminal].some(function (existing) { return actionKey(existing) === key; })) {
      actions[state][terminal].push(action);
    }
  }

  function buildTable() {
    var actions = [];
    var gotos = [];
    var conflicts = [];
    machine.states.forEach(function (state) {
      actions[state.id] = {};
      gotos[state.id] = {};
      grammar.terminals.forEach(function (terminal) { actions[state.id][terminal] = []; });
      state.items.forEach(function (item) {
        var production = grammar.productions[item.production];
        var symbol = production.rhs[item.dot];
        if (production.augmented && symbol === END) {
          addAction(actions, state.id, END, { kind: "accept", item: item });
        } else if (symbol !== undefined && !isNonterminal(symbol)) {
          addAction(actions, state.id, symbol, { kind: "shift", target: transitionFrom(state.id, symbol), item: item });
        } else if (item.dot === production.rhs.length) {
          if (!production.augmented) {
            var reductionTerminals = parserKind === "slr1" ? firstFollow.follow[production.lhs] : grammar.terminals;
            reductionTerminals.forEach(function (terminal) {
              addAction(actions, state.id, terminal, { kind: "reduce", production: production.id, item: item });
            });
          }
        }
      });
      grammar.nonterminals.forEach(function (nonterminal) {
        var target = transitionFrom(state.id, nonterminal);
        if (target !== null) gotos[state.id][nonterminal] = target;
      });
    });
    machine.states.forEach(function (state) {
      grammar.terminals.forEach(function (terminal) {
        if (actions[state.id][terminal].length > 1) {
          conflicts.push({ state: state.id, terminal: terminal, actions: actions[state.id][terminal] });
        }
      });
    });
    return { actions: actions, gotos: gotos, conflicts: conflicts };
  }

  function actionText(action) {
    if (action.kind === "shift") return "s" + action.target;
    if (action.kind === "reduce") return "r" + action.production;
    return "acc";
  }

  function conflictKind(actions) {
    var shifts = actions.filter(function (action) { return action.kind === "shift"; }).length;
    var reduces = actions.filter(function (action) { return action.kind === "reduce"; }).length;
    if (shifts && reduces) return "shift–reduce";
    if (reduces > 1) return "reduce–reduce";
    return "multiple-action";
  }

  function decisionAt(state, lookahead) {
    return (table.actions[state] && table.actions[state][lookahead]) || [];
  }

  function decisionReason(state, lookahead, actions) {
    if (!actions.length) return "No item in I" + state + " licenses an action on lookahead " + lookahead + ".";
    if (actions.length > 1) {
      return actions.map(function (action) {
        return actionText(action) + " from " + itemText(action.item);
      }).join("; ");
    }
    var action = actions[0];
    if (action.kind === "shift") {
      return itemText(action.item) + " has the dot immediately before " + lookahead + ", so GOTO(I" + state + ", " + lookahead + ") = I" + action.target + ".";
    }
    if (action.kind === "reduce") {
      if (parserKind === "slr1") {
        return itemText(action.item) + " is complete; SLR(1) places this reduction on FOLLOW(" + grammar.productions[action.production].lhs + ") = { " + firstFollow.follow[grammar.productions[action.production].lhs].join(", ") + " }.";
      }
      return itemText(action.item) + " is complete; LR(0) places this reduction in every terminal column of row " + state + ".";
    }
    return itemText(action.item) + " has reached the end marker in the augmented start production.";
  }

  function makeSnapshot(states, symbols, nodes, cursor, tokens, status, message, reason, actions) {
    var state = states[states.length - 1];
    return {
      states: states.slice(),
      symbols: symbols.slice(),
      nodes: clone(nodes),
      cursor: cursor,
      tokens: tokens.slice(),
      state: state,
      lookahead: tokens[cursor],
      status: status,
      message: message,
      reason: reason,
      actions: clone(actions || [])
    };
  }

  function buildTrace(input) {
    var tokens = input.trim() ? input.trim().split(/\s+/) : [];
    if (tokens.indexOf(END) >= 0) throw new Error("Do not type $; the workbench appends the end marker");
    tokens.forEach(function (token) {
      if (grammar.terminals.indexOf(token) < 0) throw new Error("Unknown input token: " + token);
    });
    tokens.push(END);
    var states = [0];
    var symbols = [];
    var nodes = [];
    var cursor = 0;
    var result = [];
    var guard = 0;
    while (guard < 500) {
      guard += 1;
      var state = states[states.length - 1];
      var lookahead = tokens[cursor];
      var actions = decisionAt(state, lookahead);
      var reason = decisionReason(state, lookahead, actions);
      if (!actions.length) {
        result.push(makeSnapshot(states, symbols, nodes, cursor, tokens, "rejected", "ACTION[" + state + ", " + lookahead + "] is empty: report a syntax error.", reason, actions));
        break;
      }
      if (actions.length > 1) {
        result.push(makeSnapshot(states, symbols, nodes, cursor, tokens, "conflict", "ACTION[" + state + ", " + lookahead + "] contains a " + conflictKind(actions) + " conflict.", reason, actions));
        break;
      }
      var action = actions[0];
      if (action.kind === "accept") {
        result.push(makeSnapshot(states, symbols, nodes, cursor, tokens, "accepted", "ACTION[" + state + ", $] = acc: accept the input.", reason, actions));
        break;
      }
      if (action.kind === "shift") {
        result.push(makeSnapshot(states, symbols, nodes, cursor, tokens, "running", "ACTION[" + state + ", " + lookahead + "] = s" + action.target + ": shift " + lookahead + " and push state " + action.target + ".", reason, actions));
        symbols.push(lookahead);
        states.push(action.target);
        nodes.push({ label: lookahead, children: [] });
        cursor += 1;
        continue;
      }
      var production = grammar.productions[action.production];
      result.push(makeSnapshot(states, symbols, nodes, cursor, tokens, "running", "ACTION[" + state + ", " + lookahead + "] = r" + production.id + ": reduce by " + productionText(production) + ".", reason, actions));
      var count = production.rhs.length;
      var children = count ? nodes.splice(nodes.length - count, count) : [{ label: "ε", children: [] }];
      if (count) {
        symbols.splice(symbols.length - count, count);
        states.splice(states.length - count, count);
      }
      var uncovered = states[states.length - 1];
      var target = table.gotos[uncovered][production.lhs];
      if (target === undefined) {
        result.push(makeSnapshot(states, symbols, nodes, cursor, tokens, "rejected", "No GOTO entry after reducing to " + production.lhs + ".", "The table is incomplete for this stack configuration.", []));
        break;
      }
      symbols.push(production.lhs);
      states.push(target);
      nodes.push({ label: production.lhs, children: children });
    }
    if (guard >= 500) throw new Error("Parser exceeded 500 actions");
    return result;
  }

  function renderGrammar() {
    clear(el.grammar);
    grammar.productions.forEach(function (production) {
      var row = make("div", "lr0-production" + (production.augmented ? " is-augmented" : ""));
      row.appendChild(make("span", "lr0-number", production.augmented ? "aug" : String(production.id)));
      row.appendChild(make("span", "lr0-lhs", production.lhs));
      row.appendChild(make("span", "lr0-arrow", "→"));
      row.appendChild(make("span", "", production.rhs.length ? production.rhs.join(" ") : "ε"));
      el.grammar.appendChild(row);
    });
    el.startChip.textContent = "start " + grammar.start;
  }

  function renderItem(item) {
    var production = grammar.productions[item.production];
    var row = make("div", "lr0-item");
    var kernel = item.production === 0 || item.dot > 0;
    row.classList.add(kernel ? "is-kernel" : "is-closure");
    var label = make("span", "lr0-item-label");
    label.appendChild(document.createTextNode(production.lhs + " → "));
    var firstToken = true;
    for (var index = 0; index <= production.rhs.length; index += 1) {
      if (index === item.dot) {
        if (!firstToken) label.appendChild(document.createTextNode(" "));
        label.appendChild(make("b", "lr0-dot", "•"));
        firstToken = false;
      }
      if (index < production.rhs.length) {
        if (!firstToken) label.appendChild(document.createTextNode(" "));
        label.appendChild(document.createTextNode(production.rhs[index]));
        firstToken = false;
      }
    }
    row.appendChild(label);
    row.appendChild(make("small", "", kernel ? "kernel" : "closure"));
    return row;
  }

  function selectState(id) {
    selectedState = id;
    var state = machine.states[id];
    el.stateTitle.textContent = "State I" + id;
    el.stateKind.textContent = state.via ? "GOTO(I" + state.via.from + ", " + state.via.symbol + ")" : "initial closure";
    clear(el.stateItems);
    state.items.forEach(function (item) { el.stateItems.appendChild(renderItem(item)); });
    var kernelCount = state.items.filter(function (item) { return item.production === 0 || item.dot > 0; }).length;
    var closureCount = state.items.length - kernelCount;
    el.stateExplanation.textContent = state.via
      ? "Advance the dot over “" + state.via.symbol + "” in I" + state.via.from + ", then apply CLOSURE. This gives " + kernelCount + " kernel item" + (kernelCount === 1 ? "" : "s") + " and " + closureCount + " closure-added item" + (closureCount === 1 ? "" : "s") + "."
      : "Start with “" + grammar.augmented + " → • " + grammar.start + " $”, then repeatedly add productions for every nonterminal immediately after a dot.";
    clear(el.stateTransitions);
    var outgoing = machine.transitions.filter(function (transition) { return transition.from === id; });
    if (!outgoing.length) {
      el.stateTransitions.appendChild(make("span", "lr0-note", "No outgoing GOTO transitions."));
    } else {
      el.stateTransitions.appendChild(make("strong", "", "GOTO: "));
      outgoing.forEach(function (transition) {
        var button = make("button", "lr0-transition", transition.symbol + " → I" + transition.to);
        button.type = "button";
        button.addEventListener("click", function () { selectState(transition.to); });
        el.stateTransitions.appendChild(button);
      });
    }
    updateDfaSelection();
  }

  function stateBadge(state) {
    if (table.conflicts.some(function (conflict) { return conflict.state === state.id; })) return "!";
    if (state.items.some(function (item) {
      var production = grammar.productions[item.production];
      return production.augmented && production.rhs[item.dot] === END;
    })) return "A";
    if (state.items.some(function (item) {
      var production = grammar.productions[item.production];
      return !production.augmented && item.dot === production.rhs.length;
    })) return "R";
    return "";
  }

  function groupedTransitions() {
    var groups = {};
    machine.transitions.forEach(function (transition) {
      var key = transition.from + ":" + transition.to;
      if (!groups[key]) groups[key] = { from: transition.from, to: transition.to, symbols: [] };
      groups[key].symbols.push(transition.symbol);
    });
    return Object.keys(groups).map(function (key) { return groups[key]; });
  }

  function dotQuote(value) {
    return "\"" + String(value).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"") + "\"";
  }

  function dfaDot() {
    var lines = [
      "digraph LR0 {",
      "graph [rankdir=LR, bgcolor=transparent, pad=0.1, nodesep=0.25, ranksep=0.45, splines=spline, outputorder=edgesfirst];",
      "node [shape=circle, fixedsize=true, width=0.95, height=0.95, margin=0, fontname=Arial, fontsize=16, color=\"#657187\", fontcolor=\"#172033\", penwidth=2.2];",
      "edge [fontname=Arial, fontsize=13, color=\"#8793a5\", fontcolor=\"#3f4b5f\", penwidth=1.7, arrowsize=0.8];",
      "start [shape=point, width=0.05, label=\"\", color=\"#8793a5\"];",
      "start -> I0;"
    ];
    machine.states.forEach(function (state) {
      var badge = stateBadge(state);
      var color = badge === "!" ? "#aa3434" : badge === "A" ? "#18734a" : badge === "R" ? "#1769aa" : "#657187";
      var label = "\"I" + state.id + (badge ? "\\n" + badge : "") + "\"";
      lines.push("I" + state.id + " [label=" + label + ", color=" + dotQuote(color) + (badge ? ", penwidth=3.2" : "") + "];");
    });
    groupedTransitions().forEach(function (edge) {
      lines.push("I" + edge.from + " -> I" + edge.to + " [label=" + dotQuote(edge.symbols.join(", ")) + "];");
    });
    lines.push("}");
    return lines.join("\n");
  }

  function renderDfa() {
    var generation = ++dfaRenderGeneration;
    if (!window.lr0Graphviz) {
      renderFallbackDfa();
      return;
    }
    clear(el.dfa);
    el.dfa.appendChild(make("p", "lr0-dfa-loading", "Laying out the DFA…"));
    window.lr0Graphviz.then(function (viz) {
      if (generation !== dfaRenderGeneration) return;
      var svg = viz.renderSVGElement(dfaDot(), { engine: "dot" });
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.classList.add("lr0-dfa-svg", "is-graphviz");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "DFA of LR(0) item sets");
      clear(el.dfa);
      el.dfa.appendChild(svg);
    }).catch(function () {
      if (generation === dfaRenderGeneration) renderFallbackDfa();
    });
  }

  function renderFallbackDfa() {
    clear(el.dfa);
    var depths = machine.states.map(function () { return null; });
    var queue = [0];
    depths[0] = 0;
    queue.forEach(function (from) {
      machine.transitions.filter(function (transition) { return transition.from === from; }).forEach(function (transition) {
        if (depths[transition.to] === null) {
          depths[transition.to] = depths[from] + 1;
          queue.push(transition.to);
        }
      });
    });
    var maxDepth = Math.max.apply(null, depths.filter(function (depth) { return depth !== null; }));
    var layers = [];
    depths.forEach(function (depth, id) {
      depth = depth === null ? maxDepth + 1 : depth;
      if (!layers[depth]) layers[depth] = [];
      layers[depth].push(id);
    });
    maxDepth = layers.length - 1;
    var largestLayer = Math.max.apply(null, layers.map(function (layer) { return layer ? layer.length : 0; }));
    var width = Math.max(900, 190 + maxDepth * 220);
    var height = Math.max(430, 90 + largestLayer * 100);
    var positions = {};
    layers.forEach(function (layer, depth) {
      if (!layer) return;
      layer.forEach(function (id, index) {
        positions[id] = {
          x: 90 + depth * ((width - 180) / Math.max(1, maxDepth)),
          y: (index + 1) * (height / (layer.length + 1))
        };
      });
    });

    var svg = makeSvg("svg", { "class": "lr0-dfa-svg", viewBox: "0 0 " + width + " " + height, role: "img", "aria-label": "DFA of LR(0) item sets" });
    var defs = makeSvg("defs");
    var marker = makeSvg("marker", { id: "lr0-arrow", markerWidth: "8", markerHeight: "8", refX: "7", refY: "4", orient: "auto", markerUnits: "strokeWidth" });
    marker.appendChild(makeSvg("path", { d: "M 0 0 L 8 4 L 0 8 z" }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    groupedTransitions().forEach(function (edge) {
      var from = positions[edge.from];
      var to = positions[edge.to];
      var group = makeSvg("g", { "class": "lr0-dfa-edge", "aria-label": edge.symbols.join(", ") + " to state I" + edge.to });
      var pathData;
      var labelX;
      var labelY;
      if (edge.from === edge.to) {
        pathData = "M " + (from.x - 18) + " " + (from.y - 28) + " C " + (from.x - 60) + " " + (from.y - 88) + ", " + (from.x + 60) + " " + (from.y - 88) + ", " + (from.x + 18) + " " + (from.y - 28);
        labelX = from.x;
        labelY = from.y - 77;
      } else {
        var dx = to.x - from.x;
        var dy = to.y - from.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var ux = dx / distance;
        var uy = dy / distance;
        var startX = from.x + ux * 34;
        var startY = from.y + uy * 34;
        var endX = to.x - ux * 38;
        var endY = to.y - uy * 38;
        var bend = depths[edge.to] <= depths[edge.from] ? 52 : 0;
        var controlX = (startX + endX) / 2 - uy * bend;
        var controlY = (startY + endY) / 2 + ux * bend;
        pathData = "M " + startX + " " + startY + " Q " + controlX + " " + controlY + " " + endX + " " + endY;
        labelX = controlX;
        labelY = controlY - 8;
      }
      group.appendChild(makeSvg("path", { "class": "lr0-dfa-edge-path", d: pathData, "marker-end": "url(#lr0-arrow)" }));
      group.appendChild(makeSvg("text", { "class": "lr0-dfa-edge-label", x: labelX, y: labelY, "text-anchor": "middle" }, edge.symbols.join(", ")));
      svg.appendChild(group);
    });

    var start = positions[0];
    svg.appendChild(makeSvg("path", { "class": "lr0-dfa-start", d: "M " + (start.x - 76) + " " + start.y + " L " + (start.x - 39) + " " + start.y, "marker-end": "url(#lr0-arrow)" }));
    machine.states.forEach(function (state) {
      var point = positions[state.id];
      var badge = stateBadge(state);
      var badgeClass = badge === "!" ? " is-conflict" : badge === "A" ? " is-accept" : badge === "R" ? " is-reduce" : "";
      var group = makeSvg("g", { "class": "lr0-dfa-node-group" + badgeClass, transform: "translate(" + point.x + " " + point.y + ")", "aria-label": "State I" + state.id });
      group.appendChild(makeSvg("circle", { "class": "lr0-dfa-node", r: "32" }));
      group.appendChild(makeSvg("text", { "class": "lr0-dfa-node-label", x: "0", y: "5", "text-anchor": "middle" }, "I" + state.id));
      if (badge) {
        group.appendChild(makeSvg("circle", { "class": "lr0-dfa-badge", cx: "25", cy: "-25", r: "11" }));
        group.appendChild(makeSvg("text", { "class": "lr0-dfa-badge-label", x: "25", y: "-21", "text-anchor": "middle" }, badge));
      }
      svg.appendChild(group);
    });
    el.dfa.appendChild(svg);
  }

  function renderStateGrid() {
    clear(el.stateGrid);
    machine.states.forEach(function (state) {
      var card = make("section", "lr0-state-card");
      var heading = make("header", "lr0-state-card-header");
      heading.appendChild(make("strong", "", "I" + state.id));
      heading.appendChild(make("span", "", state.via ? "GOTO(I" + state.via.from + ", " + state.via.symbol + ")" : "CLOSURE({" + grammar.augmented + " → • " + grammar.start + " $})"));
      card.appendChild(heading);
      var items = make("div", "lr0-state-card-items");
      state.items.forEach(function (item) { items.appendChild(renderItem(item)); });
      card.appendChild(items);
      el.stateGrid.appendChild(card);
    });
    el.stateCount.textContent = machine.states.length + " states";
  }

  function renderTransitionTable() {
    clear(el.transitionTable);
    var tableNode = make("table", "lr0-table lr0-transition-matrix");
    var head = make("thead");
    var headRow = make("tr");
    headRow.appendChild(make("th", "", "State"));
    grammar.symbols.forEach(function (symbol) { headRow.appendChild(make("th", "", symbol)); });
    head.appendChild(headRow);
    tableNode.appendChild(head);
    var body = make("tbody");
    machine.states.forEach(function (state) {
      var row = make("tr");
      var stateCell = make("th", "", "I" + state.id);
      stateCell.scope = "row";
      row.appendChild(stateCell);
      grammar.symbols.forEach(function (symbol) {
        var target = transitionFrom(state.id, symbol);
        var cell = make("td", "", target === null ? "—" : "I" + target);
        if (target !== null) {
          cell.className = "has-goto";
          cell.addEventListener("click", function () { selectState(target); });
        }
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    tableNode.appendChild(body);
    el.transitionTable.appendChild(tableNode);
  }

  function renderFirstFollow() {
    if (!el.firstFollow) return;
    clear(el.firstFollow);
    var tableNode = make("table", "lr0-table lr0-first-follow-table");
    var head = make("thead");
    var headRow = make("tr");
    ["Nonterminal", "FIRST", "FOLLOW"].forEach(function (label) { headRow.appendChild(make("th", "", label)); });
    head.appendChild(headRow);
    tableNode.appendChild(head);
    var body = make("tbody");
    grammar.nonterminals.forEach(function (nonterminal) {
      var row = make("tr");
      var name = make("th", "", nonterminal);
      name.scope = "row";
      row.appendChild(name);
      var firstValues = firstFollow.first[nonterminal].slice();
      if (firstFollow.nullable[nonterminal]) firstValues.push("ε");
      row.appendChild(make("td", "", "{ " + firstValues.join(", ") + " }"));
      row.appendChild(make("td", "", "{ " + firstFollow.follow[nonterminal].join(", ") + " }"));
      body.appendChild(row);
    });
    tableNode.appendChild(body);
    el.firstFollow.appendChild(tableNode);
  }

  function renderParseTable(snapshot) {
    clear(el.parseTable);
    var tableNode = make("table", "lr0-table lr0-parsing-table");
    var head = make("thead");
    var groupRow = make("tr");
    var stateHeader = make("th", "", "State");
    stateHeader.rowSpan = 2;
    groupRow.appendChild(stateHeader);
    var actionHeader = make("th", "text-center", "ACTION");
    actionHeader.colSpan = grammar.terminals.length;
    groupRow.appendChild(actionHeader);
    var gotoHeader = make("th", "text-center", "GOTO");
    gotoHeader.colSpan = grammar.nonterminals.length;
    groupRow.appendChild(gotoHeader);
    head.appendChild(groupRow);
    var symbolRow = make("tr");
    grammar.terminals.concat(grammar.nonterminals).forEach(function (symbol) { symbolRow.appendChild(make("th", "text-center", symbol)); });
    head.appendChild(symbolRow);
    tableNode.appendChild(head);
    var body = make("tbody");
    machine.states.forEach(function (state) {
      var row = make("tr");
      var stateCell = make("th", "", String(state.id));
      stateCell.scope = "row";
      row.appendChild(stateCell);
      grammar.terminals.forEach(function (terminal) {
        var actions = table.actions[state.id][terminal];
        var cell = make("td", "lr0-action-cell", actions.length ? actions.map(actionText).join(" / ") : "—");
        if (actions.length > 1) cell.classList.add("is-conflict");
        if (snapshot && snapshot.state === state.id && snapshot.lookahead === terminal) cell.classList.add("is-current");
        row.appendChild(cell);
      });
      grammar.nonterminals.forEach(function (nonterminal) {
        var target = table.gotos[state.id][nonterminal];
        row.appendChild(make("td", "lr0-goto-cell", target === undefined ? "—" : String(target)));
      });
      body.appendChild(row);
    });
    tableNode.appendChild(body);
    el.parseTable.appendChild(tableNode);
    if (el.liveParseTable) {
      clear(el.liveParseTable);
      el.liveParseTable.appendChild(tableNode.cloneNode(true));
    }
    if (!table.conflicts.length) {
      el.conflicts.textContent = "No conflicts: grammar is " + (parserKind === "slr1" ? "SLR(1)" : "LR(0)");
      el.conflicts.className = "lr0-conflicts is-clear";
    } else {
      var kinds = uniqueStrings(table.conflicts.map(function (conflict) { return conflictKind(conflict.actions); }));
      el.conflicts.textContent = table.conflicts.length + " conflict cell" + (table.conflicts.length === 1 ? "" : "s") + ": " + kinds.join(", ");
      el.conflicts.className = "lr0-conflicts";
    }
  }

  function renderTape(snapshot) {
    clear(el.tape);
    snapshot.tokens.forEach(function (token, index) {
      var node = make("span", "lr0-token", token);
      if (index < snapshot.cursor) node.classList.add("is-consumed");
      if (index === snapshot.cursor) node.classList.add("is-current");
      el.tape.appendChild(node);
    });
  }

  function renderStack(snapshot) {
    clear(el.stack);
    snapshot.states.forEach(function (state, index) {
      if (index > 0) el.stack.appendChild(make("span", "lr0-stack-symbol", snapshot.symbols[index - 1]));
      el.stack.appendChild(make("span", "lr0-stack-state", String(state)));
    });
  }

  function treeNode(node) {
    var item = make("li", "lr0-tree-item");
    item.appendChild(make("span", "lr0-tree-node" + (isNonterminal(node.label) ? " is-nonterminal" : ""), node.label));
    if (node.children && node.children.length) {
      var children = make("ul", "lr0-tree-list");
      node.children.forEach(function (child) { children.appendChild(treeNode(child)); });
      item.appendChild(children);
    }
    return item;
  }

  function renderTree(snapshot) {
    clear(el.tree);
    if (!snapshot.nodes.length) {
      el.tree.appendChild(make("div", "lr0-tree-empty", "The forest grows as terminals are shifted and productions are reduced."));
      return;
    }
    var forest = make("ul", "lr0-tree-list lr0-tree-forest");
    snapshot.nodes.forEach(function (node) { forest.appendChild(treeNode(node)); });
    el.tree.appendChild(forest);
  }

  function stopPlaying() {
    if (playTimer) window.clearInterval(playTimer);
    playTimer = null;
    el.play.textContent = "Play";
    el.play.setAttribute("aria-pressed", "false");
  }

  function renderTraceStep(index) {
    if (!trace.length) return;
    traceStep = Math.max(0, Math.min(index, trace.length - 1));
    var snapshot = trace[traceStep];
    el.progress.max = String(trace.length - 1);
    el.progress.value = String(traceStep);
    el.stepCount.textContent = "Step " + (traceStep + 1) + " of " + trace.length;
    el.prev.disabled = traceStep === 0;
    el.next.disabled = traceStep === trace.length - 1;
    el.message.textContent = snapshot.message;
    el.reason.textContent = snapshot.reason;
    el.actionLabel.textContent = "State " + snapshot.state + " · lookahead " + snapshot.lookahead;
    el.outcome.className = "lr0-outcome is-" + snapshot.status;
    el.outcome.textContent = snapshot.status === "running" ? "Running" : snapshot.status.charAt(0).toUpperCase() + snapshot.status.slice(1);
    renderParseTable(snapshot);
    renderTape(snapshot);
    renderStack(snapshot);
    renderTree(snapshot);
    if (traceStep === trace.length - 1) stopPlaying();
  }

  function parseCurrentInput() {
    stopPlaying();
    try {
      trace = buildTrace(el.input.value);
      traceStep = 0;
      renderTraceStep(0);
    } catch (error) {
      trace = [];
      el.message.textContent = error.message;
      el.reason.textContent = "Tokens must be separated by spaces and must occur in the grammar.";
      el.outcome.className = "lr0-outcome is-rejected";
      el.outcome.textContent = "Input error";
      renderParseTable(null);
    }
  }

  function setTab(tab) {
    activeTab = tab;
    var itemsActive = tab === "items";
    var tableActive = tab === "parser";
    var runActive = tab === "run";
    el.items.hidden = !itemsActive;
    el.parser.hidden = !tableActive;
    el.run.hidden = !runActive;
    el.tabItems.classList.toggle("is-active", itemsActive);
    el.tabParser.classList.toggle("is-active", tableActive);
    el.tabRun.classList.toggle("is-active", runActive);
    el.tabItems.setAttribute("aria-selected", itemsActive ? "true" : "false");
    el.tabParser.setAttribute("aria-selected", tableActive ? "true" : "false");
    el.tabRun.setAttribute("aria-selected", runActive ? "true" : "false");
  }

  function rebuild(source, start) {
    grammar = parseGrammar(source, start);
    firstFollow = computeFirstFollow();
    machine = buildMachine();
    table = buildTable();
    selectedState = 0;
    renderStateGrid();
    renderDfa();
    renderFirstFollow();
    renderParseTable(null);
    parseCurrentInput();
    el.editorStatus.className = "lr0-editor-status";
    el.editorStatus.textContent = machine.states.length + " states; " + table.conflicts.length + " conflict cell" + (table.conflicts.length === 1 ? "" : "s");
  }

  function loadPreset(name) {
    activePreset = name;
    var preset = presets[name];
    el.source.value = preset.source;
    el.start.value = preset.start;
    el.input.value = preset.input;
    Array.prototype.forEach.call(document.querySelectorAll(".lr0-preset"), function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-preset") === name);
    });
    try {
      setTab("items");
      rebuild(preset.source, preset.start);
    } catch (error) {
      el.editorStatus.className = "lr0-editor-status is-error";
      el.editorStatus.textContent = error.message;
    }
  }

  function bindElements() {
    ["source", "start", "load", "editor-status", "tab-items", "tab-parser", "tab-run", "items", "parser", "run", "dfa", "state-grid", "state-count", "first-follow", "conflicts", "parse-table", "live-parse-table", "input", "parse", "prev", "next", "play", "progress", "step-count", "message", "reason", "action-label", "outcome", "tape", "stack", "tree"].forEach(function (suffix) {
      var key = suffix.replace(/-([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
      el[key] = byId("lr0-" + suffix);
    });
  }

  function bindEvents() {
    Array.prototype.forEach.call(document.querySelectorAll(".lr0-preset"), function (button) {
      button.addEventListener("click", function () { loadPreset(button.getAttribute("data-preset")); });
    });
    el.load.addEventListener("click", function () {
      try {
        setTab("items");
        rebuild(el.source.value, el.start.value);
      } catch (error) {
        el.editorStatus.className = "lr0-editor-status is-error";
        el.editorStatus.textContent = error.message;
      }
    });
    el.tabItems.addEventListener("click", function () { setTab("items"); });
    el.tabParser.addEventListener("click", function () { setTab("parser"); });
    el.tabRun.addEventListener("click", function () { setTab("run"); });
    el.parse.addEventListener("click", parseCurrentInput);
    el.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") parseCurrentInput();
    });
    el.prev.addEventListener("click", function () {
      stopPlaying();
      renderTraceStep(traceStep - 1);
    });
    el.next.addEventListener("click", function () {
      stopPlaying();
      renderTraceStep(traceStep + 1);
    });
    el.progress.addEventListener("input", function () {
      stopPlaying();
      renderTraceStep(Number(el.progress.value));
    });
    el.play.addEventListener("click", function () {
      if (playTimer) {
        stopPlaying();
        return;
      }
      if (!trace.length) parseCurrentInput();
      if (traceStep === trace.length - 1) renderTraceStep(0);
      el.play.textContent = "Pause";
      el.play.setAttribute("aria-pressed", "true");
      playTimer = window.setInterval(function () {
        if (traceStep >= trace.length - 1) stopPlaying();
        else renderTraceStep(traceStep + 1);
      }, 1100);
    });
    document.addEventListener("keydown", function (event) {
      var tag = event.target && event.target.tagName;
      if (activeTab !== "run" || tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stopPlaying();
        renderTraceStep(traceStep - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stopPlaying();
        renderTraceStep(traceStep + 1);
      }
    });
  }

  function init() {
    var root = byId("lr0-demo");
    if (!root) return;
    parserKind = root.getAttribute("data-parser-kind") === "slr1" ? "slr1" : "lr0";
    if (parserKind === "slr1") presets = slrPresets;
    bindElements();
    bindEvents();
    loadPreset(activePreset);
  }

  if (window.addEventListener) {
    window.addEventListener("lr0-graphviz-ready", function () {
      if (grammar && machine && table) renderDfa();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}());
