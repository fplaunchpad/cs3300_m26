(function () {
  "use strict";

  var EPS = "epsilon";
  var END = "$";
  var el = {};
  var prepHistory = [];
  var prepCursor = 0;
  var analysisEvents = [];
  var analysisStep = 0;
  var stageIndex = { ready: 0, first: 0, follow: 0, table: 0, parse: -1 };
  var playTimer = null;
  var activeTab = "prepare";
  var activePreset = "pipeline";

  var presets = {
    pipeline: {
      start: "S",
      input: "id a x",
      source: [
        "S -> A x | A y",
        "A -> A a | B | epsilon",
        "B -> C",
        "C -> B | id"
      ].join("\n")
    },
    expression: {
      start: "S",
      input: "id + num * id",
      source: [
        "S -> E",
        "E -> T E'",
        "E' -> + E | - E | epsilon",
        "T -> F T'",
        "T' -> * T | / T | epsilon",
        "F -> num | id"
      ].join("\n")
    },
    nullable: {
      start: "S",
      input: "b",
      source: [
        "S -> A b",
        "A -> a | epsilon"
      ].join("\n")
    }
  };

  function byId(id) { return document.getElementById(id); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function unique(list) {
    var seen = {};
    return list.filter(function (item) {
      var key = Array.isArray(item) ? item.join("\u0001") : String(item);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function isNonterminal(grammar, symbol) { return grammar.order.indexOf(symbol) >= 0; }
  function rhsText(rhs) { return rhs.length ? rhs.join(" ") : EPS; }

  function parseGrammar(source, start) {
    var rows = [];
    var order = [];
    source.split(/\r?\n/).forEach(function (original, index) {
      var line = original.replace(/#.*$/, "").trim();
      if (!line) return;
      var parts = line.split("->");
      if (parts.length !== 2) throw new Error("Line " + (index + 1) + ": expected exactly one ->");
      var lhs = parts[0].trim();
      if (!/^[A-Za-z_][A-Za-z0-9_']*$/.test(lhs)) throw new Error("Line " + (index + 1) + ": invalid nonterminal " + lhs);
      if (order.indexOf(lhs) < 0) order.push(lhs);
      rows.push({ lhs: lhs, alternatives: parts[1].split("|").map(function (part) { return part.trim(); }), line: index + 1 });
    });
    if (!rows.length) throw new Error("Enter at least one production");
    start = start.trim();
    if (order.indexOf(start) < 0) throw new Error("Start symbol " + start + " has no production");
    var rules = {};
    order.forEach(function (name) { rules[name] = []; });
    rows.forEach(function (row) {
      row.alternatives.forEach(function (alternative) {
        if (!alternative) throw new Error("Line " + row.line + ": write epsilon for an empty production");
        var symbols = alternative.split(/\s+/);
        if (symbols.indexOf(EPS) >= 0 && (symbols.length !== 1 || symbols[0] !== EPS)) throw new Error("Line " + row.line + ": epsilon must be the entire alternative");
        rules[row.lhs].push(symbols[0] === EPS ? [] : symbols);
      });
      rules[row.lhs] = unique(rules[row.lhs]);
    });
    return { start: start, order: order, rules: rules };
  }

  function serializeGrammar(grammar) {
    return grammar.order.map(function (lhs) {
      var alternatives = grammar.rules[lhs] || [];
      return lhs + " -> " + (alternatives.length ? alternatives.map(rhsText).join(" | ") : "# no productive alternatives");
    }).join("\n");
  }

  function productions(grammar) {
    var result = [];
    var number = 1;
    grammar.order.forEach(function (lhs) {
      (grammar.rules[lhs] || []).forEach(function (rhs) {
        result.push({ id: number, lhs: lhs, rhs: rhs.slice() });
        number += 1;
      });
    });
    return result;
  }

  function nullableSet(grammar) {
    var nullable = {};
    var changed = true;
    var guard = 0;
    while (changed && guard < 200) {
      changed = false;
      guard += 1;
      grammar.order.forEach(function (lhs) {
        if (nullable[lhs]) return;
        if ((grammar.rules[lhs] || []).some(function (rhs) {
          return rhs.length === 0 || rhs.every(function (symbol) { return isNonterminal(grammar, symbol) && nullable[symbol]; });
        })) {
          nullable[lhs] = true;
          changed = true;
        }
      });
    }
    return nullable;
  }

  function unitReachability(grammar) {
    var reach = {};
    grammar.order.forEach(function (start) {
      var seen = {};
      var queue = [start];
      seen[start] = true;
      while (queue.length) {
        var current = queue.shift();
        (grammar.rules[current] || []).forEach(function (rhs) {
          if (rhs.length === 1 && isNonterminal(grammar, rhs[0]) && !seen[rhs[0]]) {
            seen[rhs[0]] = true;
            queue.push(rhs[0]);
          }
        });
      }
      reach[start] = seen;
    });
    return reach;
  }

  function unitCycles(grammar) {
    var cycles = [];
    grammar.order.forEach(function (start) {
      var queue = [];
      var seen = {};
      (grammar.rules[start] || []).forEach(function (rhs) {
        if (rhs.length === 1 && isNonterminal(grammar, rhs[0])) queue.push(rhs[0]);
      });
      while (queue.length) {
        var current = queue.shift();
        if (current === start) { cycles.push(start); return; }
        if (seen[current]) continue;
        seen[current] = true;
        (grammar.rules[current] || []).forEach(function (rhs) {
          if (rhs.length === 1 && isNonterminal(grammar, rhs[0])) queue.push(rhs[0]);
        });
      }
    });
    return unique(cycles);
  }

  function hasUnitProductions(grammar) {
    return productions(grammar).some(function (p) { return p.rhs.length === 1 && isNonterminal(grammar, p.rhs[0]); });
  }

  function leftRecursiveSymbols(grammar) {
    var nullable = nullableSet(grammar);
    var edges = {};
    grammar.order.forEach(function (lhs) { edges[lhs] = []; });
    productions(grammar).forEach(function (p) {
      for (var i = 0; i < p.rhs.length; i += 1) {
        var symbol = p.rhs[i];
        if (!isNonterminal(grammar, symbol)) break;
        if (edges[p.lhs].indexOf(symbol) < 0) edges[p.lhs].push(symbol);
        if (!nullable[symbol]) break;
      }
    });
    return grammar.order.filter(function (start) {
      var queue = (edges[start] || []).slice();
      var seen = {};
      while (queue.length) {
        var current = queue.shift();
        if (current === start) return true;
        if (seen[current]) continue;
        seen[current] = true;
        queue = queue.concat(edges[current] || []);
      }
      return false;
    });
  }

  function factorableSymbols(grammar) {
    return grammar.order.filter(function (lhs) {
      var groups = {};
      (grammar.rules[lhs] || []).forEach(function (rhs) {
        var key = rhs.length ? rhs[0] : EPS;
        groups[key] = (groups[key] || 0) + 1;
      });
      return Object.keys(groups).some(function (key) { return key !== EPS && groups[key] > 1; });
    });
  }

  function diagnostics(grammar) {
    var nullable = nullableSet(grammar);
    return {
      epsilon: productions(grammar).filter(function (p) { return p.rhs.length === 0; }).map(function (p) { return p.lhs; }),
      nullable: grammar.order.filter(function (name) { return nullable[name]; }),
      cycles: unitCycles(grammar),
      units: hasUnitProductions(grammar),
      factoring: factorableSymbols(grammar),
      leftrec: leftRecursiveSymbols(grammar),
      unreachable: unreachableSymbols(grammar)
    };
  }

  function unreachableSymbols(grammar) {
    var seen = {};
    var queue = [grammar.start];
    while (queue.length) {
      var lhs = queue.shift();
      if (seen[lhs]) continue;
      seen[lhs] = true;
      (grammar.rules[lhs] || []).forEach(function (rhs) {
        rhs.forEach(function (symbol) {
          if (isNonterminal(grammar, symbol) && !seen[symbol]) queue.push(symbol);
        });
      });
    }
    return grammar.order.filter(function (name) { return !seen[name]; });
  }

  function allNullableVariants(rhs, nullable) {
    var variants = [[]];
    rhs.forEach(function (symbol) {
      var next = [];
      variants.forEach(function (prefix) {
        next.push(prefix.concat([symbol]));
        if (nullable[symbol]) next.push(prefix.slice());
      });
      variants = next;
    });
    return unique(variants);
  }

  function eliminateEpsilon(grammar) {
    var result = copy(grammar);
    var nullable = nullableSet(grammar);
    result.order.forEach(function (lhs) {
      var expanded = [];
      (grammar.rules[lhs] || []).forEach(function (rhs) {
        if (rhs.length === 0) return;
        allNullableVariants(rhs, nullable).forEach(function (variant) {
          if (variant.length || (lhs === grammar.start && nullable[grammar.start])) expanded.push(variant);
        });
      });
      result.rules[lhs] = unique(expanded);
    });
    var retained = nullable[grammar.start] && (result.rules[grammar.start] || []).some(function (rhs) { return rhs.length === 0; });
    return {
      grammar: result,
      message: retained ? "Removed nullable alternatives, but retained start → epsilon because epsilon belongs to the language." : "Removed epsilon-productions and added every alternative obtained by omitting nullable occurrences."
    };
  }

  function eliminateCycles(grammar) {
    var reach = unitReachability(grammar);
    var result = copy(grammar);
    grammar.order.forEach(function (lhs) {
      var alternatives = [];
      grammar.order.forEach(function (target) {
        if (!reach[lhs][target]) return;
        (grammar.rules[target] || []).forEach(function (rhs) {
          if (!(rhs.length === 1 && isNonterminal(grammar, rhs[0]))) alternatives.push(rhs.slice());
        });
      });
      result.rules[lhs] = unique(alternatives);
    });
    return { grammar: result, message: "Replaced unit-production paths by their non-unit alternatives, removing cyclic unit derivations." };
  }

  function freshName(grammar, base) {
    var candidate = base;
    var n = 2;
    while (grammar.order.indexOf(candidate) >= 0) { candidate = base + n; n += 1; }
    return candidate;
  }

  function commonPrefix(group) {
    if (!group.length) return [];
    var prefix = group[0].slice();
    for (var i = 1; i < group.length; i += 1) {
      var limit = Math.min(prefix.length, group[i].length);
      var j = 0;
      while (j < limit && prefix[j] === group[i][j]) j += 1;
      prefix = prefix.slice(0, j);
    }
    return prefix;
  }

  function leftFactor(grammar) {
    var result = copy(grammar);
    var changes = [];
    var changed = true;
    var guard = 0;
    while (changed && guard < 100) {
      changed = false;
      guard += 1;
      for (var oi = 0; oi < result.order.length; oi += 1) {
        var lhs = result.order[oi];
        var groups = {};
        (result.rules[lhs] || []).forEach(function (rhs) {
          if (!rhs.length) return;
          groups[rhs[0]] = groups[rhs[0]] || [];
          groups[rhs[0]].push(rhs);
        });
        var key = Object.keys(groups).find(function (name) { return groups[name].length > 1; });
        if (!key) continue;
        var group = groups[key];
        var prefix = commonPrefix(group);
        var name = freshName(result, lhs + "_fact");
        var remaining = (result.rules[lhs] || []).filter(function (rhs) { return group.indexOf(rhs) < 0; });
        remaining.push(prefix.concat([name]));
        result.rules[lhs] = unique(remaining);
        result.rules[name] = unique(group.map(function (rhs) { return rhs.slice(prefix.length); }));
        result.order.splice(oi + 1, 0, name);
        changes.push(lhs + " on prefix " + prefix.join(" "));
        changed = true;
        break;
      }
    }
    return { grammar: result, message: changes.length ? "Factored " + changes.join("; ") + "." : "No alternatives share a non-empty prefix." };
  }

  function eliminateLeftRecursion(grammar) {
    var d = diagnostics(grammar);
    if (d.epsilon.length) throw new Error("Eliminate epsilon-productions before applying the lecture algorithm.");
    if (d.cycles.length) throw new Error("Eliminate cycles before applying the lecture algorithm.");
    var result = copy(grammar);
    var originalOrder = grammar.order.slice();
    var changes = [];
    for (var i = 0; i < originalOrder.length; i += 1) {
      var ai = originalOrder[i];
      for (var j = 0; j < i; j += 1) {
        var aj = originalOrder[j];
        var replaced = [];
        (result.rules[ai] || []).forEach(function (rhs) {
          if (rhs[0] === aj) {
            (result.rules[aj] || []).forEach(function (delta) { replaced.push(delta.concat(rhs.slice(1))); });
            changes.push("Substituted " + aj + " into " + ai);
          } else replaced.push(rhs);
        });
        result.rules[ai] = unique(replaced);
      }
      var recursive = [];
      var base = [];
      (result.rules[ai] || []).forEach(function (rhs) {
        if (rhs[0] === ai) recursive.push(rhs.slice(1));
        else base.push(rhs);
      });
      if (!recursive.length) continue;
      if (!base.length) throw new Error(ai + " has no non-left-recursive alternative, so it derives no finite terminal string.");
      var helper = freshName(result, ai + "_lr");
      result.rules[ai] = unique(base.map(function (beta) { return beta.concat([helper]); }));
      result.rules[helper] = unique(recursive.map(function (alpha) { return alpha.concat([helper]); }).concat([[]]));
      var position = result.order.indexOf(ai);
      result.order.splice(position + 1, 0, helper);
      changes.push("Eliminated direct left recursion in " + ai);
    }
    return { grammar: result, message: changes.length ? changes.join("; ") + "." : "The grammar has no left recursion." };
  }

  function renderGrammar(node, grammar, compact) {
    clear(node);
    productions(grammar).forEach(function (p) {
      var row = make("div", "ll1-production" + (compact ? " is-compact" : ""));
      row.appendChild(make("span", "ll1-number", p.id + "."));
      row.appendChild(make("span", "ll1-lhs", p.lhs));
      row.appendChild(make("span", "ll1-arrow", "→"));
      row.appendChild(make("span", "ll1-rhs", p.rhs.length ? p.rhs.join(" ") : "ε"));
      node.appendChild(row);
    });
  }

  function renderDiagnostics(grammar) {
    var d = diagnostics(grammar);
    var afterLeftRecursion = prepHistory.slice(0, prepCursor + 1).some(function (entry) { return entry.kind === "leftrec"; });
    clear(el.diagnostics);
    var rows = [
      { warning: d.epsilon.length > 0 && !afterLeftRecursion, title: "Epsilon-productions", detail: d.epsilon.length ? (afterLeftRecursion ? "Introduced by left-recursion elimination in " + unique(d.epsilon).join(", ") + "; keep them for FIRST, FOLLOW, and table construction." : "Present in " + unique(d.epsilon).join(", ") + ". Remove them before left-recursion elimination.") : "None in the current grammar." },
      { warning: d.cycles.length > 0, title: "Cycles", detail: d.cycles.length ? "Unit-production cycles involve " + d.cycles.join(", ") + "." : (d.units ? "No cycles, but unit productions remain." : "No unit-production cycles.") },
      { warning: d.factoring.length > 0, title: "Common prefixes", detail: d.factoring.length ? "Left factoring is possible in " + d.factoring.join(", ") + "." : "No alternatives share a leading symbol." },
      { warning: d.leftrec.length > 0, title: "Left recursion", detail: d.leftrec.length ? "Detected through " + d.leftrec.join(", ") + "." : "No left-recursive nonterminal detected." },
      { warning: d.unreachable.length > 0, title: "Reachability", detail: d.unreachable.length ? "Unreachable from " + grammar.start + ": " + d.unreachable.join(", ") + ". They are retained, so their FOLLOW sets may be empty and they still receive table rows." : "Every nonterminal is reachable from " + grammar.start + "." }
    ];
    rows.forEach(function (row) {
      var item = make("div", "ll1-diagnostic" + (row.warning ? " is-warning" : ""));
      item.appendChild(make("i", "", row.warning ? "!" : "✓"));
      var body = make("div");
      body.appendChild(make("strong", "", row.title));
      body.appendChild(make("small", "", row.detail));
      item.appendChild(body);
      el.diagnostics.appendChild(item);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".ll1-transform"), function (button) {
      var kind = button.dataset.transform;
      var needed = kind === "epsilon" ? d.epsilon.length > 0 && !afterLeftRecursion : kind === "cycles" ? d.units : kind === "factor" ? d.factoring.length > 0 : d.leftrec.length > 0;
      var blocked = (kind === "cycles" && d.epsilon.length > 0) || (kind === "factor" && (d.epsilon.length > 0 || d.units)) || (kind === "leftrec" && (d.epsilon.length > 0 || d.cycles.length > 0 || d.factoring.length > 0));
      button.disabled = !needed || blocked;
      button.classList.toggle("is-needed", needed && !blocked);
      button.classList.toggle("is-done", !needed);
    });
  }

  function currentGrammar() { return prepHistory[prepCursor].grammar; }
  function renderPreparation() {
    var entry = prepHistory[prepCursor];
    renderGrammar(el.prepGrammar, entry.grammar, false);
    renderDiagnostics(entry.grammar);
    el.prepStart.textContent = "start: " + entry.grammar.start;
    el.prepMessage.textContent = entry.message;
    el.prepPrev.disabled = prepCursor === 0;
    el.prepNext.disabled = prepCursor === prepHistory.length - 1;
    el.source.value = serializeGrammar(entry.grammar);
    el.start.value = entry.grammar.start;
  }

  function applyTransform(kind) {
    try {
      var operation = kind === "epsilon" ? eliminateEpsilon : kind === "cycles" ? eliminateCycles : kind === "factor" ? leftFactor : eliminateLeftRecursion;
      var result = operation(currentGrammar());
      prepHistory = prepHistory.slice(0, prepCursor + 1);
      prepHistory.push({ grammar: result.grammar, message: result.message, kind: kind });
      prepCursor += 1;
      renderPreparation();
    } catch (error) {
      prepHistory[prepCursor].message = error.message;
      renderPreparation();
    }
  }

  function emptySets(grammar) {
    var result = {};
    grammar.order.forEach(function (name) { result[name] = []; });
    return result;
  }
  function addSet(sets, name, value) {
    if (sets[name].indexOf(value) >= 0) return false;
    sets[name].push(value);
    return true;
  }
  function firstOfSequence(grammar, sequence, first) {
    var result = [];
    if (!sequence.length) return [EPS];
    var allNullable = true;
    for (var i = 0; i < sequence.length; i += 1) {
      var symbol = sequence[i];
      if (!isNonterminal(grammar, symbol)) {
        if (result.indexOf(symbol) < 0) result.push(symbol);
        allNullable = false;
        break;
      }
      (first[symbol] || []).forEach(function (value) { if (value !== EPS && result.indexOf(value) < 0) result.push(value); });
      if ((first[symbol] || []).indexOf(EPS) < 0) { allNullable = false; break; }
    }
    if (allNullable) result.push(EPS);
    return result;
  }

  function cloneTable(table) {
    var result = {};
    Object.keys(table).forEach(function (lhs) {
      result[lhs] = {};
      Object.keys(table[lhs]).forEach(function (terminal) { result[lhs][terminal] = table[lhs][terminal].slice(); });
    });
    return result;
  }
  function analysisSnapshot(state) {
    return {
      first: copy(state.first), follow: copy(state.follow), table: cloneTable(state.table),
      activeSet: state.activeSet ? copy(state.activeSet) : null,
      activeCell: state.activeCell ? copy(state.activeCell) : null,
      parser: state.parser ? copy(state.parser) : null
    };
  }
  function addAnalysisEvent(state, phase, message, outcome) {
    analysisEvents.push({ phase: phase, message: message, outcome: outcome || "running", state: analysisSnapshot(state) });
  }

  function terminalOrder(grammar) {
    var result = [];
    productions(grammar).forEach(function (p) {
      p.rhs.forEach(function (symbol) {
        if (!isNonterminal(grammar, symbol) && result.indexOf(symbol) < 0) result.push(symbol);
      });
    });
    result.push(END);
    return result;
  }

  function tableConflicts(table) {
    var conflicts = [];
    Object.keys(table).forEach(function (lhs) {
      Object.keys(table[lhs]).forEach(function (terminal) {
        if (table[lhs][terminal].length > 1) conflicts.push(lhs + ", " + terminal);
      });
    });
    return conflicts;
  }

  function buildAnalysis(includeParse, skipRender) {
    if (!skipRender) stopPlaying();
    var grammar = currentGrammar();
    var prods = productions(grammar);
    var state = { first: emptySets(grammar), follow: emptySets(grammar), table: {}, activeSet: null, activeCell: null, parser: null };
    grammar.order.forEach(function (name) { state.table[name] = {}; });
    analysisEvents = [];
    stageIndex = { ready: 0, first: 0, follow: 0, table: 0, parse: -1 };
    addAnalysisEvent(state, "READY", "Choose FIRST, FOLLOW, Parse table, or Parse input.", "ready-to-build");

    var changed = true;
    var guard = 0;
    while (changed && guard < 200) {
      changed = false;
      guard += 1;
      prods.forEach(function (p) {
        firstOfSequence(grammar, p.rhs, state.first).forEach(function (value) {
          if (addSet(state.first, p.lhs, value)) {
            changed = true;
          }
        });
      });
    }
    state.activeSet = null;
    addAnalysisEvent(state, "FIRST", "FIRST sets are complete after iterating the production constraints to a fixed point.");
    stageIndex.first = analysisEvents.length - 1;

    addSet(state.follow, grammar.start, END);
    changed = true;
    guard = 0;
    while (changed && guard < 300) {
      changed = false;
      guard += 1;
      prods.forEach(function (p) {
        p.rhs.forEach(function (symbol, index) {
          if (!isNonterminal(grammar, symbol)) return;
          var suffix = p.rhs.slice(index + 1);
          var suffixFirst = firstOfSequence(grammar, suffix, state.first);
          suffixFirst.forEach(function (value) {
            if (value !== EPS && addSet(state.follow, symbol, value)) {
              changed = true;
            }
          });
          if (suffixFirst.indexOf(EPS) >= 0) {
            (state.follow[p.lhs] || []).forEach(function (value) {
              if (addSet(state.follow, symbol, value)) {
                changed = true;
              }
            });
          }
        });
      });
    }
    state.activeSet = null;
    addAnalysisEvent(state, "FOLLOW", "FOLLOW sets are complete after seeding the start symbol with $ and iterating to a fixed point.");
    stageIndex.follow = analysisEvents.length - 1;

    addAnalysisEvent(state, "TABLE", "Use FIRST of each right-hand side; for epsilon, use FOLLOW of its left-hand side.");
    prods.forEach(function (p) {
      var firstRhs = firstOfSequence(grammar, p.rhs, state.first);
      var targets = firstRhs.filter(function (value) { return value !== EPS; });
      if (firstRhs.indexOf(EPS) >= 0) targets = targets.concat(state.follow[p.lhs]);
      unique(targets).forEach(function (terminal) {
        state.table[p.lhs][terminal] = state.table[p.lhs][terminal] || [];
        if (state.table[p.lhs][terminal].indexOf(p.id) < 0) state.table[p.lhs][terminal].push(p.id);
        state.activeCell = { lhs: p.lhs, terminal: terminal };
        var conflict = state.table[p.lhs][terminal].length > 1;
        addAnalysisEvent(state, "TABLE", "From production " + p.id + ": place rule " + p.id + " in M[" + p.lhs + ", " + terminal + "]." + (conflict ? " This cell now has a conflict." : ""), conflict ? "conflict" : "running");
      });
    });
    state.activeCell = null;
    var conflicts = tableConflicts(state.table);
    addAnalysisEvent(state, "TABLE", conflicts.length ? "The table has conflicts at " + conflicts.join("; ") + ". The grammar is not LL(1)." : "Every populated cell contains one production: the grammar is LL(1).", conflicts.length ? "conflict" : "ready");
    stageIndex.table = analysisEvents.length - 1;

    if (includeParse) appendParseEvents(grammar, prods, state);
    if (!skipRender) {
      renderBuildGrammar(grammar);
      renderAnalysis(includeParse && stageIndex.parse >= 0 ? stageIndex.parse : 0);
    }
  }

  function appendParseEvents(grammar, prods, state) {
    var conflicts = tableConflicts(state.table);
    if (conflicts.length) {
      addAnalysisEvent(state, "PARSE", "The parse table has conflicts at " + conflicts.join("; ") + ", so it cannot drive a predictive parser.", "conflict");
      stageIndex.parse = analysisEvents.length - 1;
      return;
    }
    var tokens = el.input.value.trim() ? el.input.value.trim().split(/\s+/) : [];
    tokens.push(END);
    var nextId = 1;
    var nodes = [{ id: nextId, label: grammar.start, kind: "nonterminal", status: "current", children: [] }];
    var stack = [{ symbol: END, nodeId: null }, { symbol: grammar.start, nodeId: nextId }];
    var pos = 0;
    var outcome = "running";
    function parserSnapshot() { return { tokens: tokens.slice(), pos: pos, stack: copy(stack), nodes: copy(nodes), rootId: 1, outcome: outcome }; }
    function findNode(id) { return nodes.find(function (node) { return node.id === id; }); }
    function event(message, result) {
      state.parser = parserSnapshot();
      addAnalysisEvent(state, "PARSE", message, result || outcome);
    }
    stageIndex.parse = analysisEvents.length;
    event("Initialize the stack with $ and the start symbol " + grammar.start + ".");
    var guard = 0;
    while (stack.length && guard < 500 && outcome === "running") {
      guard += 1;
      var top = stack[stack.length - 1];
      var lookahead = tokens[pos];
      if (top.symbol === END) {
        if (lookahead === END) {
          stack.pop();
          outcome = "accepted";
          event("Stack and input both contain $: accept.", "accepted");
        } else {
          outcome = "rejected";
          event("The stack is finished but input remains: reject.", "rejected");
        }
        break;
      }
      if (!isNonterminal(grammar, top.symbol)) {
        if (top.symbol === lookahead) {
          stack.pop();
          var matched = findNode(top.nodeId);
          if (matched) matched.status = "matched";
          pos += 1;
          event("Match terminal " + lookahead + " and advance the input.");
        } else {
          outcome = "rejected";
          event("Expected " + top.symbol + " but saw " + lookahead + ": reject.", "rejected");
        }
        continue;
      }
      var choices = (state.table[top.symbol] && state.table[top.symbol][lookahead]) || [];
      if (choices.length !== 1) {
        outcome = "rejected";
        event("M[" + top.symbol + ", " + lookahead + "] is empty: reject.", "rejected");
        continue;
      }
      var p = prods.find(function (candidate) { return candidate.id === choices[0]; });
      stack.pop();
      var parent = findNode(top.nodeId);
      if (parent) parent.status = "expanded";
      var children = [];
      if (!p.rhs.length) {
        nextId += 1;
        nodes.push({ id: nextId, label: "ε", kind: "terminal", status: "matched", children: [] });
        children.push({ symbol: EPS, nodeId: nextId });
      } else {
        p.rhs.forEach(function (symbol) {
          nextId += 1;
          nodes.push({ id: nextId, label: symbol, kind: isNonterminal(grammar, symbol) ? "nonterminal" : "terminal", status: "new", children: [] });
          children.push({ symbol: symbol, nodeId: nextId });
        });
      }
      if (parent) parent.children = children.map(function (child) { return child.nodeId; });
      for (var ci = children.length - 1; ci >= 0; ci -= 1) {
        if (children[ci].symbol !== EPS) stack.push(children[ci]);
      }
      if (stack.length && stack[stack.length - 1].nodeId) {
        var current = findNode(stack[stack.length - 1].nodeId);
        if (current) current.status = "current";
      }
      event("M[" + p.lhs + ", " + lookahead + "] selects production " + p.id + ": " + p.lhs + " → " + (p.rhs.length ? p.rhs.join(" ") : "epsilon") + ".");
    }
  }

  function renderBuildGrammar(grammar) {
    renderGrammar(el.buildGrammar, grammar, true);
    el.buildStart.textContent = "start: " + grammar.start;
  }

  function renderSets(grammar, state) {
    clear(el.sets);
    grammar.order.forEach(function (name) {
      var row = document.createElement("tr");
      row.appendChild(make("th", "", name));
      ["first", "follow"].forEach(function (kind) {
        var cell = document.createElement("td");
        var values = state[kind][name] || [];
        if (!values.length) cell.textContent = "∅";
        else values.forEach(function (value, index) {
          if (index) cell.appendChild(document.createTextNode(", "));
          var span = make("span", state.activeSet && state.activeSet.kind === kind && state.activeSet.name === name && state.activeSet.value === value ? "ll1-set-new" : "", value === EPS ? "ε" : value);
          cell.appendChild(span);
        });
        row.appendChild(cell);
      });
      el.sets.appendChild(row);
    });
  }

  function renderParseTable(grammar, state) {
    clear(el.parseTable);
    var table = make("table", "ll1-table ll1-table-sm");
    var thead = document.createElement("thead");
    var head = document.createElement("tr");
    head.appendChild(make("th", "", "Nonterminal"));
    var terminals = terminalOrder(grammar);
    terminals.forEach(function (terminal) { head.appendChild(make("th", "", terminal)); });
    thead.appendChild(head);
    table.appendChild(thead);
    var body = document.createElement("tbody");
    grammar.order.forEach(function (lhs) {
      var row = document.createElement("tr");
      row.appendChild(make("th", "", lhs));
      terminals.forEach(function (terminal) {
        var values = (state.table[lhs] && state.table[lhs][terminal]) || [];
        var classes = "ll1-table-cell";
        if (state.activeCell && state.activeCell.lhs === lhs && state.activeCell.terminal === terminal) classes += " is-current";
        if (values.length > 1) classes += " is-conflict";
        row.appendChild(make("td", classes, values.length ? values.map(function (id) { return "rule " + id; }).join(" / ") : ""));
      });
      body.appendChild(row);
    });
    table.appendChild(body);
    el.parseTable.appendChild(table);
    var conflicts = tableConflicts(state.table);
    el.conflicts.textContent = conflicts.length ? conflicts.length + " conflict" + (conflicts.length === 1 ? "" : "s") : "";
  }

  function renderRuntime(parser) {
    clear(el.tape);
    clear(el.stack);
    clear(el.tree);
    if (!parser) {
      var preview = el.input.value.trim() ? el.input.value.trim().split(/\s+/) : [];
      preview.concat([END]).forEach(function (token, index) { el.tape.appendChild(make("span", "ll1-token" + (index === 0 ? " is-current" : ""), token)); });
      el.stack.appendChild(make("span", "ll1-note", "Choose Parse input to start."));
      el.tree.appendChild(make("div", "ll1-tree-empty", "The tree will grow here during parsing."));
      return;
    }
    parser.tokens.forEach(function (token, index) {
      var classes = "ll1-token" + (index < parser.pos ? " is-consumed" : index === parser.pos ? " is-current" : "");
      el.tape.appendChild(make("span", classes, token));
    });
    parser.stack.forEach(function (item) { el.stack.appendChild(make("span", "ll1-stack-symbol", item.symbol)); });
    var lookup = {};
    parser.nodes.forEach(function (node) { lookup[node.id] = node; });
    function branch(id) {
      var node = lookup[id];
      var list = make("ul", "ll1-tree-list");
      var item = make("li", "ll1-tree-item");
      item.appendChild(make("span", "ll1-tree-node is-" + node.kind + " is-" + node.status, node.label));
      if (node.children.length) {
        var children = make("ul", "ll1-tree-list");
        node.children.forEach(function (childId) { children.appendChild(branch(childId).firstChild); });
        item.appendChild(children);
      }
      list.appendChild(item);
      return list;
    }
    el.tree.appendChild(branch(parser.rootId));
  }

  function renderAnalysis(step) {
    analysisStep = Math.max(0, Math.min(step, analysisEvents.length - 1));
    var event = analysisEvents[analysisStep];
    var grammar = currentGrammar();
    el.phase.textContent = event.phase;
    el.message.textContent = event.message;
    el.progress.max = String(analysisEvents.length - 1);
    el.progress.value = String(analysisStep);
    el.stepCount.textContent = "Step " + analysisStep + " of " + (analysisEvents.length - 1);
    el.prev.disabled = analysisStep === 0;
    el.next.disabled = analysisStep === analysisEvents.length - 1;
    el.outcome.className = "ll1-outcome";
    if (event.outcome === "accepted") { el.outcome.classList.add("is-accepted"); el.outcome.textContent = "Accepted"; }
    else if (event.outcome === "rejected") { el.outcome.classList.add("is-rejected"); el.outcome.textContent = "Rejected"; }
    else if (event.outcome === "conflict") { el.outcome.classList.add("is-conflict"); el.outcome.textContent = "Conflict"; }
    else {
      el.outcome.classList.add("is-running");
      el.outcome.textContent = event.phase === "READY" ? "Ready" : event.phase === "PARSE" ? "Running" : event.outcome === "ready" ? "LL(1)" : "Analyzing";
    }
    renderSets(grammar, event.state);
    renderParseTable(grammar, event.state);
    renderRuntime(event.state.parser);
  }

  function stopPlaying() {
    if (playTimer !== null) window.clearInterval(playTimer);
    playTimer = null;
    el.play.textContent = "Play";
    el.play.setAttribute("aria-pressed", "false");
  }
  function startPlaying() {
    if (analysisStep >= analysisEvents.length - 1) renderAnalysis(0);
    el.play.textContent = "Pause";
    el.play.setAttribute("aria-pressed", "true");
    playTimer = window.setInterval(function () {
      if (analysisStep >= analysisEvents.length - 1) { stopPlaying(); return; }
      renderAnalysis(analysisStep + 1);
    }, 650);
  }

  function switchTab(name) {
    activeTab = name;
    var prepare = name === "prepare";
    el.prepare.hidden = !prepare;
    el.build.hidden = prepare;
    el.tabPrepare.classList.toggle("is-active", prepare);
    el.tabBuild.classList.toggle("is-active", !prepare);
    el.tabPrepare.setAttribute("aria-selected", String(prepare));
    el.tabBuild.setAttribute("aria-selected", String(!prepare));
    if (!prepare) buildAnalysis(false);
    else stopPlaying();
  }

  function loadGrammar(grammar, message, input) {
    prepHistory = [{ grammar: grammar, message: message || "Loaded the original grammar. Apply transformations one at a time." }];
    prepCursor = 0;
    el.input.value = input || "";
    renderPreparation();
    switchTab("prepare");
  }

  function choosePreset(name) {
    activePreset = name;
    var preset = presets[name];
    el.source.value = preset.source;
    el.start.value = preset.start;
    Array.prototype.forEach.call(document.querySelectorAll(".ll1-preset"), function (button) { button.classList.toggle("is-active", button.dataset.preset === name); });
    loadGrammar(parseGrammar(preset.source, preset.start), name === "pipeline" ? "This grammar contains an epsilon-production, a unit cycle, a common prefix, and left recursion." : "Loaded a grammar ready for FIRST and FOLLOW computation.", preset.input);
  }

  function initElements() {
    ["source", "start", "load", "editor-status", "tab-prepare", "tab-build", "prepare", "build", "prep-prev", "prep-next", "prep-message", "prep-start", "prep-grammar", "diagnostics", "rebuild", "jump-first", "jump-follow", "jump-table", "input", "parse", "prev", "next", "play", "progress", "step-count", "phase", "message", "outcome", "build-start", "build-grammar", "sets", "parse-table", "conflicts", "tape", "stack", "tree"].forEach(function (name) {
      var camel = name.replace(/-([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
      el[camel] = byId("ll1-" + name);
    });
  }

  function init() {
    initElements();
    el.tabPrepare.addEventListener("click", function () { switchTab("prepare"); });
    el.tabBuild.addEventListener("click", function () { switchTab("build"); });
    el.prepPrev.addEventListener("click", function () { if (prepCursor > 0) { prepCursor -= 1; renderPreparation(); } });
    el.prepNext.addEventListener("click", function () { if (prepCursor < prepHistory.length - 1) { prepCursor += 1; renderPreparation(); } });
    Array.prototype.forEach.call(document.querySelectorAll(".ll1-transform"), function (button) { button.addEventListener("click", function () { applyTransform(button.dataset.transform); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".ll1-preset"), function (button) { button.addEventListener("click", function () { choosePreset(button.dataset.preset); }); });
    el.load.addEventListener("click", function () {
      try {
        activePreset = "custom";
        Array.prototype.forEach.call(document.querySelectorAll(".ll1-preset"), function (button) { button.classList.remove("is-active"); });
        loadGrammar(parseGrammar(el.source.value, el.start.value), "Loaded the custom grammar.", "");
        el.editorStatus.className = "ll1-editor-status";
        el.editorStatus.textContent = "Grammar loaded.";
      } catch (error) {
        el.editorStatus.className = "ll1-editor-status is-error";
        el.editorStatus.textContent = error.message;
      }
    });
    el.rebuild.addEventListener("click", function () { buildAnalysis(false); });
    el.parse.addEventListener("click", function () { buildAnalysis(true); });
    el.input.addEventListener("keydown", function (event) { if (event.key === "Enter") buildAnalysis(true); });
    el.jumpFirst.addEventListener("click", function () { stopPlaying(); renderAnalysis(stageIndex.first); });
    el.jumpFollow.addEventListener("click", function () { stopPlaying(); renderAnalysis(stageIndex.follow); });
    el.jumpTable.addEventListener("click", function () { stopPlaying(); renderAnalysis(stageIndex.table); });
    el.prev.addEventListener("click", function () { stopPlaying(); renderAnalysis(analysisStep - 1); });
    el.next.addEventListener("click", function () { stopPlaying(); renderAnalysis(analysisStep + 1); });
    el.play.addEventListener("click", function () { playTimer === null ? startPlaying() : stopPlaying(); });
    el.progress.addEventListener("input", function () { stopPlaying(); renderAnalysis(Number(el.progress.value)); });
    document.addEventListener("keydown", function (event) {
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.tagName === "SELECT" || event.target.tagName === "BUTTON") return;
      if (activeTab === "build" && event.key === "ArrowRight") { stopPlaying(); renderAnalysis(analysisStep + 1); }
      if (activeTab === "build" && event.key === "ArrowLeft") { stopPlaying(); renderAnalysis(analysisStep - 1); }
      if (activeTab === "build" && event.key === " ") { event.preventDefault(); playTimer === null ? startPlaying() : stopPlaying(); }
    });
    choosePreset("pipeline");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}());
