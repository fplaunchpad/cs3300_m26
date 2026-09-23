(function () {
  "use strict";
  const host = document.getElementById("sdd-demo");
  if (!host) return;
  const S = window.SDD, el = {}, drafts = new Map();
  const ids = ["presets", "note", "source", "output", "restore", "form", "input", "status", "workspace", "prev", "next", "play", "progress", "finish", "count", "action", "reason", "tree", "node-detail", "result-label", "result-title", "result", "result-note", "dependencies", "attributes", "runtime", "run-form", "env", "run", "run-status", "run-result"];
  ids.push("program-options", "example", "load-example", "input-label", "replay", "source-preview", "tree-title", "tree-eyebrow", "tree-section", "tree-summary", "run-controls", "run-first", "run-prev", "run-next", "run-progress", "run-count", "run-action", "run-values", "run-output");
  ids.forEach(id => { el[id] = document.getElementById(`sdd-${id}`); });
  let active = "ast", model = null, step = 0, selectedNode = 0, selectedKey = null, timer = null;
  let runState = null, runStep = 0, selectedInstruction = null, nodeAttrs = new Map();
  const isProgram = () => Boolean(S.presets[active].program);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shorten = (text, n = 130) => text.length > n ? `${text.slice(0, n)}…` : text;
  const production = node => `${node.symbol} → ${node.prod.rhs.map(p => p.symbol).join(" ") || "ε"}`;
  const known = key => model.initial.has(key) || (model.byKey.has(key) && model.byKey.get(key).step <= step);
  const displayValue = key => known(key) ? S.format(model.values.get(key)) : "not evaluated";
  function stop() { if (timer) clearInterval(timer); timer = null; el.play.textContent = "Play"; el.play.setAttribute("aria-pressed", "false"); }
  function clearRun() {
    runState = null; el["run-controls"].hidden = true; el["run-result"].replaceChildren();
    el["run-status"].textContent = ""; el["run-status"].className = "";
  }
  function stale() {
    stop(); el.workspace.hidden = true; el.status.className = "sdd-status is-stale";
    el.status.textContent = "Changes pending. Build / reset to evaluate this SDD and input.";
  }
  function build() {
    stop(); clearRun(); selectedInstruction = null;
    try {
      model = S.compile(el.source.value, el.input.value, el.output.value, S.presets[active].limits);
      nodeAttrs = new Map(model.nodes.map(node => [node.id, []]));
      model.equations.forEach(eq => nodeAttrs.get(eq.target.id).push(eq));
      step = isProgram() ? model.trace.length : 0; selectedNode = 0;
      selectedKey = isProgram() ? model.resultKey : model.trace[0]?.eq.key || null;
      el.workspace.hidden = false; el.status.className = "sdd-status";
      el.status.textContent = `Parsed ${model.tokens.length} tokens · ${model.nodes.length} tree nodes · ${model.trace.length} attribute equations. One valid dependency order is shown.`;
      el.progress.max = model.trace.length; el.runtime.hidden = model.output !== "code";
      el["tree-section"].open = !isProgram();
      render();
    } catch (error) {
      model = null; el.workspace.hidden = true; el.status.className = "sdd-status is-error"; el.status.textContent = error.message;
    }
  }
  function choose(name, restore = false) {
    stop();
    if (!restore) drafts.set(active, { source: el.source.value, input: el.input.value, output: el.output.value, env: el.env.value });
    active = name;
    const preset = S.presets[name], draft = restore ? null : drafts.get(name);
    el.source.value = draft?.source || preset.source;
    el.input.value = draft?.input ?? preset.input;
    el.output.value = draft?.output || preset.output;
    el.env.value = draft?.env ?? preset.env ?? "x=10, y=3, z=1";
    el.note.textContent = preset.note;
    host.classList.toggle("is-program", isProgram());
    el["program-options"].hidden = el.replay.hidden = el["source-preview"].hidden = el["tree-summary"].hidden = !isProgram();
    el.input.rows = isProgram() ? 13 : 1;
    el["input-label"].textContent = isProgram() ? "Source program" : "Expression";
    el["tree-title"].textContent = isProgram() ? "Source program" : "Annotated parse tree";
    el["tree-eyebrow"].textContent = isProgram() ? "Select an IR instruction to highlight its source" : "Grammar occurrences · select a node";
    if (isProgram()) el.example.innerHTML = Object.entries(preset.examples).map(([key, example]) => `<option value="${key}">${escape(example.title)}</option>`).join("");
    history.replaceState(null, "", `#${name}`);
    for (const button of el.presets.children) { const match = button.dataset.preset === name; button.classList.toggle("is-active", match); button.setAttribute("aria-pressed", String(match)); }
    build();
  }
  function move(value) {
    step = Math.max(0, Math.min(model.trace.length, value));
    selectedKey = model.trace[Math.max(0, step - 1)]?.eq.key || null;
    selectedNode = model.trace[Math.max(0, step - 1)]?.eq.target.id || 0;
    selectedInstruction = null;
    if (step === model.trace.length) stop();
    clearRun(); render();
  }
  function treeSVG(root, parseTree) {
    const positions = [], edges = []; let x = 0, deepest = 0;
    function layout(node, depth) {
      const children = node.children || []; const points = children.map(child => layout(child, depth + 1));
      const point = { node, x: points.length ? (points[0].x + points[points.length - 1].x) / 2 : 56 + x++ * 100, y: 35 + depth * 82 };
      deepest = Math.max(deepest, depth); positions.push(point); points.forEach(child => edges.push([point, child])); return point;
    }
    layout(root, 0);
    const width = Math.max(240, x * 100 + 12), height = deepest * 82 + 82;
    const current = step ? model.trace[step - 1].eq : null;
    const deps = new Set(current?.deps.map(key => Number(key.match(/^n(\d+)/)[1])) || []);
    const lines = edges.map(([a,b]) => `<line class="sdd-tree-edge" x1="${a.x}" y1="${a.y+23}" x2="${b.x}" y2="${b.y-23}"/>`).join("");
    const nodes = positions.map(({ node, x, y }) => {
      const attrs = parseTree ? nodeAttrs.get(node.id) : [];
      const title = parseTree ? `n${node.id}: ${node.symbol}${node.token ? ` = ${node.token.lexeme}` : ""}` : S.format(node);
      const label = parseTree ? node.symbol : node.label;
      const small = parseTree ? node.token ? node.token.lexeme : `n${node.id} · ${attrs.filter(e => e.step <= step).length}/${attrs.length} attrs` : "";
      let cls = "sdd-tree-node";
      if (parseTree && node.id === selectedNode) cls += " is-selected";
      if (parseTree && deps.has(node.id)) cls += " is-dependency";
      if (parseTree && current?.target.id === node.id) cls += " is-current";
      const action = parseTree ? ` role="button" tabindex="0" data-node="${node.id}" aria-label="${escape(title)}"` : "";
      return `<g class="${cls}" transform="translate(${x},${y})"${action}><title>${escape(title)}</title><rect x="-44" y="-23" width="88" height="46" rx="7"/><text text-anchor="middle" y="${small ? -3 : 4}">${escape(shorten(label, 10))}</text>${small ? `<text class="sdd-tree-small" text-anchor="middle" y="13">${escape(shorten(small, 15))}</text>` : ""}</g>`;
    }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="${parseTree ? "group" : "img"}" aria-label="${parseTree ? "Parse tree; select a node to inspect its attributes" : "Abstract syntax tree"}">${lines}${nodes}</svg>`;
  }
  function nodeDetail() {
    const node = model.nodes[selectedNode];
    const attrs = nodeAttrs.get(node.id);
    el["node-detail"].innerHTML = `<strong>n${node.id} · ${escape(node.token ? `${node.symbol} = ${node.token.lexeme}` : production(node))}</strong>${node.token ? `<p>Lexical attribute: <code>n${node.id}.lexeme = ${escape(node.token.lexeme)}</code> (available before evaluation).</p>` : `<ul>${attrs.map(eq => `<li><button type="button" data-key="${escape(eq.key)}">${escape(eq.rule.attr)}</button> <span class="sdd-${eq.kind}">${eq.kind}</span>: <code>${escape(shorten(displayValue(eq.key)))}</code></li>`).join("") || "<li>No attributes defined on this occurrence.</li>"}</ul>`}`;
  }
  function dependencies() {
    if (!selectedKey) { el.dependencies.textContent = "No attribute equations."; return; }
    const eq = model.byKey.get(selectedKey), deps = eq?.deps || [], users = model.equations.filter(e => e.deps.includes(selectedKey));
    const button = (key, cls = "") => `<button type="button" class="${cls}" data-key="${escape(key)}" title="${escape(shorten(displayValue(key), 300))}">${escape(key)}</button>`;
    el.dependencies.innerHTML = `<p>${eq ? `<strong>${escape(production(eq.owner))}</strong> at n${eq.owner.id} · line ${eq.rule.line}: <code>${escape(eq.rule.text)}</code>` : "Lexer-supplied attribute"}</p><div class="sdd-dependency-row"><div><small>Reads these attributes</small>${deps.map(k => button(k)).join("") || "<small>No dependencies</small>"}</div><span aria-label="feeds">→</span><div>${button(selectedKey, "sdd-dep-focus")}<small>${eq ? `${eq.kind} · step ${eq.step}` : "lexical · initially available"}</small></div><span aria-label="feeds">→</span><div><small>Used by these attributes</small>${users.map(e => button(e.key)).join("") || "<small>No consumers</small>"}</div></div><p><strong>${escape(selectedKey)}</strong> = <code>${escape(shorten(displayValue(selectedKey), 700))}</code></p><p class="sdd-note">Arrows run from an input attribute to the attribute that reads it. This is the selected attribute’s immediate neighborhood; select another attribute to follow the graph.</p>`;
  }
  function attributes() {
    const current = step ? model.trace[step - 1].eq : null;
    el.attributes.innerHTML = model.trace.map(({ eq }) => {
      const cls = eq === current ? "is-current" : current?.deps.includes(eq.key) ? "is-dependency" : eq.step > step ? "is-pending" : "";
      const preview = shorten(displayValue(eq.key).replace(/\n/g, " ⏎ "), 160);
      return `<tr class="${cls}"><td>${eq.step}${eq.step > step ? " · pending" : " · done"}</td><td><button type="button" data-key="${escape(eq.key)}">${escape(eq.key)}</button></td><td class="sdd-${eq.kind}">${eq.kind}</td><td><code>${escape(eq.rule.text)}</code><br><small>at n${eq.owner.id}: ${escape(production(eq.owner))}</small></td><td>${escape(preview)}</td></tr>`;
    }).join("");
    const row = el.attributes.querySelector(".is-current"), viewport = el.attributes.closest(".sdd-table-wrap");
    if (!row) viewport.scrollTop = 0;
    else {
      const bounds = viewport.getBoundingClientRect(), target = row.getBoundingClientRect();
      if (target.bottom > bounds.bottom) viewport.scrollTop += target.bottom - bounds.bottom;
      else if (target.top < bounds.top + 38) viewport.scrollTop -= bounds.top + 38 - target.top;
    }
  }
  function result() {
    const rootKnown = known(model.resultKey);
    let item = rootKnown ? { value: model.result, key: model.resultKey } : null;
    if (!item) {
      for (let i = step - 1; i >= 0; i--) {
        const entry = model.trace[i];
        if (model.output === "node" ? S.isAST(entry.value) : S.isCode(entry.value)) { item = { value: entry.value, key: entry.eq.key }; break; }
      }
    }
    el["result-title"].textContent = model.output === "node" ? rootKnown ? "Generated AST" : "AST under construction" : rootKnown ? "Generated IR" : "Code fragment under construction";
    el["result-label"].textContent = item ? item.key : "Waiting for the first construction rule";
    if (!item) el.result.innerHTML = '<p class="sdd-pad sdd-note">Step through the equations to construct the output.</p>';
    else if (model.output === "node") el.result.innerHTML = treeSVG(item.value, false);
    else if (isProgram() && rootKnown) {
      el.result.innerHTML = `<ol class="sdd-ir-list">${item.value.map((instruction, i) => `<li><button type="button" data-instruction="${i}" class="${selectedInstruction === i ? "is-current" : ""}"><span class="sdd-line-number">${i + 1}</span><code>${escape(S.formatInstruction(instruction))}</code><small>line ${instruction.origin?.line || "—"}</small></button></li>`).join("")}</ol>`;
    } else el.result.innerHTML = `<pre>${escape(S.format(item.value))}</pre>`;
    el["result-note"].textContent = !item ? "Lexemes are already available from the lexer." : rootKnown ? model.output === "node" ? `Root AST: ${S.format(item.value)}` : isProgram() ? `${item.value.length} instructions. Select one to inspect its source and SDD equation. Run IR below, or replay the translation above.` : `Root code is available.${known("n0.addr") ? ` Result address: ${displayValue("n0.addr")}.` : " L_true and L_false are the enclosing context's exit destinations."}` : `Showing the most recently computed ${model.output === "node" ? "AST subtree" : "code fragment"}. The complete root output appears when ${model.resultKey} is evaluated.`;
    el.run.disabled = step !== model.trace.length;
  }
  function sourcePreview(line) {
    if (!isProgram()) return;
    const current = line ?? model.byKey.get(selectedKey)?.owner.span?.line;
    el["source-preview"].innerHTML = `<ol class="sdd-source-lines">${model.input.split("\n").map((text, index) => `<li class="${index + 1 === current ? "is-current" : ""}" data-source-line="${index + 1}"><span class="sdd-line-number">${index + 1}</span><code>${escape(text) || " "}</code></li>`).join("")}</ol>`;
    const row = el["source-preview"].querySelector(".is-current");
    if (row) {
      const bounds = el["source-preview"].getBoundingClientRect(), target = row.getBoundingClientRect();
      if (target.top < bounds.top || target.bottom > bounds.bottom) el["source-preview"].scrollTop += target.top - bounds.top - 40;
    }
  }
  function showInstruction(index) {
    const instruction = model.result[index], origin = instruction?.origin;
    if (!origin) return;
    selectedInstruction = index; selectedNode = origin.node; selectedKey = origin.equation;
    sourcePreview(origin.line); dependencies(); nodeDetail();
    for (const button of el.result.querySelectorAll("[data-instruction]")) button.classList.toggle("is-current", Number(button.dataset.instruction) === index);
  }
  function render() {
    el.progress.value = step; el.count.textContent = `${step} / ${model.trace.length} equations`;
    el.prev.disabled = step === 0; el.next.disabled = el.finish.disabled = step === model.trace.length;
    el.play.disabled = step === model.trace.length;
    if (!step) {
      el.action.textContent = "Parse complete. Attribute evaluation has not started.";
      el.reason.textContent = "Terminal .lexeme attributes are available. Next equation evaluates a rule whose dependencies are all ready.";
    } else {
      const entry = model.trace[step - 1], eq = entry.eq;
      el.action.textContent = `${eq.key} ← ${eq.rule.text.split(" = ")[1]} = ${shorten(S.format(entry.value), 150)}`;
      el.reason.textContent = `${eq.kind === "inherited" ? "Inherited: set on a child occurrence" : "Synthesized: set on this production's left-hand side"}. ${eq.deps.length ? `Ready because ${eq.deps.join(", ")} ${eq.deps.length === 1 ? "is" : "are"} available.` : "This equation has no attribute dependencies."}${step === model.trace.length ? " Evaluation complete." : ""}`;
    }
    sourcePreview();
    if (el["tree-section"].open) renderTree();
    nodeDetail(); dependencies(); attributes(); result();
  }
  function renderTree() {
    const scrollLeft = el.tree.scrollLeft, scrollTop = el.tree.scrollTop;
    el.tree.innerHTML = treeSVG(model.root, true); el.tree.scrollLeft = scrollLeft; el.tree.scrollTop = scrollTop;
    const activeNode = el.tree.querySelector(`[data-node="${selectedNode}"]`);
    if (activeNode) {
      const viewport = el.tree.getBoundingClientRect(), bounds = activeNode.getBoundingClientRect();
      if (bounds.left < viewport.left || bounds.right > viewport.right) el.tree.scrollLeft += (bounds.left + bounds.right - viewport.left - viewport.right) / 2;
      if (bounds.top < viewport.top || bounds.bottom > viewport.bottom) el.tree.scrollTop += (bounds.top + bounds.bottom - viewport.top - viewport.bottom) / 2;
    }
  }
  function inspect(event) {
    const target = event.target.closest("[data-key], [data-node], [data-instruction]");
    if (!target || !model) return;
    if (event.type === "keydown") { if (!["Enter", " "].includes(event.key) || !target.hasAttribute("data-node")) return; event.preventDefault(); }
    stop();
    if (target.dataset.instruction !== undefined) { showInstruction(Number(target.dataset.instruction)); return; }
    if (target.dataset.key) {
      selectedKey = target.dataset.key; selectedNode = Number(selectedKey.match(/^n(\d+)/)[1]);
      dependencies(); nodeDetail(); sourcePreview();
    } else { selectedNode = Number(target.dataset.node); nodeDetail(); }
    for (const group of el.tree.querySelectorAll("[data-node]")) group.classList.toggle("is-selected", Number(group.dataset.node) === selectedNode);
  }
  for (const [name, preset] of Object.entries(S.presets)) {
    const button = document.createElement("button"); button.type = "button"; button.dataset.preset = name; button.textContent = preset.title;
    button.addEventListener("click", () => choose(name)); el.presets.append(button);
  }
  el.form.addEventListener("submit", event => { event.preventDefault(); build(); });
  el.input.addEventListener("keydown", event => {
    if (!isProgram() && event.key === "Enter" && !event.shiftKey) { event.preventDefault(); build(); }
  });
  el["load-example"].addEventListener("click", () => {
    const example = S.presets[active].examples[el.example.value];
    el.input.value = example.input; el.env.value = example.env; build();
  });
  el.replay.addEventListener("click", () => { stop(); move(0); });
  el["tree-section"].addEventListener("toggle", () => { if (model && el["tree-section"].open) renderTree(); });
  [el.source, el.input, el.output].forEach(input => input.addEventListener("input", stale));
  el.restore.addEventListener("click", () => choose(active, true));
  el.env.addEventListener("input", () => {
    clearRun();
    el["run-status"].textContent = "Variable values changed. Run IR to evaluate again.";
  });
  el.prev.addEventListener("click", () => { stop(); move(step - 1); });
  el.next.addEventListener("click", () => { stop(); move(step + 1); });
  el.finish.addEventListener("click", () => { stop(); move(model.trace.length); });
  el.progress.addEventListener("input", () => { stop(); move(Number(el.progress.value)); });
  el.play.addEventListener("click", () => {
    if (timer) { stop(); return; }
    timer = setInterval(() => move(step + 1), 850); el.play.textContent = "Pause"; el.play.setAttribute("aria-pressed", "true");
  });
  host.addEventListener("click", inspect); el.tree.addEventListener("keydown", inspect);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  function renderRun() {
    const values = new Map(runState.initialValues), output = [], counts = new Map();
    for (const entry of runState.trace.slice(0, runStep)) {
      counts.set(entry.index, (counts.get(entry.index) || 0) + 1);
      if (entry.write) values.set(...entry.write);
      if (entry.printed !== null) output.push(entry.printed);
    }
    const current = runStep ? runState.trace[runStep - 1] : null;
    el["run-progress"].value = runStep;
    el["run-count"].textContent = `${runStep} / ${runState.trace.length} instructions`;
    el["run-prev"].disabled = el["run-first"].disabled = runStep === 0;
    el["run-next"].disabled = runStep === runState.trace.length;
    el["run-action"].textContent = current ? `${S.formatInstruction(model.result[current.index])} — ${current.effect}` : "Before the first instruction. Initial variable values are shown.";
    el["run-values"].textContent = [...values].filter(([name]) => !name.startsWith("%t")).map(([name, value]) => `${name} = ${value}`).join("\n") || "(no variables assigned)";
    el["run-output"].textContent = output.length ? output.join("\n") : "(no output yet)";
    const complete = runStep === runState.trace.length;
    el["run-result"].innerHTML = `<ol class="sdd-runtime-code">${model.result.map((instruction, i) => `<li class="${counts.has(i) ? "is-visited" : "is-skipped"}${current?.index === i ? " is-current" : ""}"><button type="button" data-instruction="${i}">${i+1}. ${escape(S.formatInstruction(instruction))}</button><small>${counts.has(i) ? `executed × ${counts.get(i)}` : !complete ? "not yet executed" : runState.error ? "not reached" : "skipped"}</small></li>`).join("")}</ol><details><summary>Execution trace${runStep > 100 ? " (last 100 steps at this position)" : ""}</summary><ol start="${Math.max(1, runStep - 99)}">${runState.trace.slice(Math.max(0, runStep - 100), runStep).map(t => `<li><code>${escape(S.formatInstruction(model.result[t.index]))}</code> — ${escape(t.effect)}</li>`).join("")}</ol></details>`;
    if (isProgram()) {
      if (current) showInstruction(current.index);
      else {
        selectedInstruction = null; sourcePreview(0);
        el.result.querySelectorAll(".is-current").forEach(node => node.classList.remove("is-current"));
      }
    }
  }
  function moveRun(value) {
    if (!runState) return;
    runStep = Math.max(0, Math.min(runState.trace.length, value)); renderRun();
  }
  el["run-first"].addEventListener("click", () => moveRun(0));
  el["run-prev"].addEventListener("click", () => moveRun(runStep - 1));
  el["run-next"].addEventListener("click", () => moveRun(runStep + 1));
  el["run-progress"].addEventListener("input", () => moveRun(Number(el["run-progress"].value)));
  el["run-form"].addEventListener("submit", event => {
    event.preventDefault(); if (!model || step !== model.trace.length) return;
    clearRun();
    try {
      runState = S.execute(model.result, el.env.value, model.values.get("n0.addr"), { maxSteps: isProgram() ? 10000 : 1000, captureErrors: true });
      runStep = runState.trace.length;
      el["run-status"].className = runState.error ? "is-error" : "";
      el["run-status"].textContent = runState.error ? `Stopped: ${runState.error} Trace retained through ${runStep} completed instructions.` : `${isProgram() ? "Program finished" : `Result: ${runState.result === null ? "reached end of code" : runState.result}`} · ${runStep} instructions executed.`;
      el["run-controls"].hidden = false; el["run-progress"].max = runStep;
      renderRun();
    } catch (error) { el["run-status"].className = "is-error"; el["run-status"].textContent = error.message; }
  });
  const initialPreset = location.hash.slice(1);
  choose(Object.hasOwn(S.presets, initialPreset) ? initialPreset : "ast", true);
})();
