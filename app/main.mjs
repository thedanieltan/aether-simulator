import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import {
  canonicalDownload,
  evidenceEnvelope,
  scenarioCatalog,
  workerRequest,
} from "./adapter.mjs";
import {
  commandEnabled,
  initialStudioState,
  reduceStudioState,
} from "./state.mjs";

const worker = new Worker(new URL("./worker.mjs", import.meta.url), { type: "module" });
const form = document.querySelector("#scenario-form");
const depthInput = document.querySelector("#depth");
const scenarioInput = document.querySelector("#scenario");
const resultView = document.querySelector("#result-view");
const metrics = document.querySelector("#metrics");
const status = document.querySelector("#run-status");
const gallery = document.querySelector("#scenario-gallery");
const tabs = [...document.querySelectorAll("[data-view]")];
const commandButtons = [...document.querySelectorAll("[data-command]")];
let studioState = { ...initialStudioState };

function element(name, className, text) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function updateState(action) {
  studioState = reduceStudioState(studioState, action);
  status.textContent =
    studioState.phase === "error"
      ? `Error: ${studioState.error}`
      : studioState.phase.replaceAll("-", " ");
  for (const button of commandButtons) {
    button.disabled = !commandEnabled(studioState, button.dataset.command);
    button.dataset.state = studioState.phase === button.dataset.command ? "loading" : "default";
  }
  document.querySelector("#run").disabled = !commandEnabled(studioState, "run");
  render();
}

function populateScenarios() {
  scenarioInput.replaceChildren();
  for (const [value, label] of scenarioCatalog[depthInput.value]) {
    const option = element("option", "", label);
    option.value = value;
    scenarioInput.append(option);
  }
}

function populateGallery() {
  gallery.replaceChildren();
  const cards = [
    ["enterprise", "retail-intervention-baseline", "Enterprise", "One fictional retailer with inventory, finance, workflow, and lineage."],
    ["ecosystem", "vendor-outage-cascade", "Ecosystem", "Declared organizations linked by contracts and a traceable vendor cascade."],
    ["economy", "stable-baseline", "Economy", "Entity-level households, firms, banks, government, markets, and aggregates."],
  ];
  for (const [depth, scenario, title, copy] of cards) {
    const button = element("button", "scenario-card");
    button.type = "button";
    button.setAttribute("role", "listitem");
    button.append(element("output", "", `${depth.toUpperCase()} DEPTH`));
    button.append(element("strong", "", title));
    button.append(element("span", "", copy));
    button.addEventListener("click", () => {
      depthInput.value = depth;
      populateScenarios();
      scenarioInput.value = scenario;
      document.querySelector("#studio").scrollIntoView({ behavior: "smooth" });
      form.querySelector("#seed").focus();
    });
    gallery.append(button);
  }
}

function renderMetrics(session) {
  metrics.replaceChildren();
  if (!session) return;
  const values = [
    ["Events", session.metrics.events],
    ["Entities", session.metrics.entities],
    ["Relations", session.metrics.relationships],
    ["Digest", session.exported.digest.slice(0, 8)],
  ];
  for (const [label, value] of values) {
    const item = element("div", "metric");
    item.append(element("span", "", label), element("strong", "", String(value)));
    metrics.append(item);
  }
}

function renderGraph(session) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("graph");
  svg.setAttribute("viewBox", "0 0 900 500");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Synthetic world entity graph");
  const entities = Object.values(session.exported.world.entities).flat().slice(0, 18);
  const byId = new Map();
  entities.forEach((entityValue, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(entities.length, 1);
    byId.set(entityValue.id, {
      entity: entityValue,
      x: 450 + Math.cos(angle) * 300,
      y: 250 + Math.sin(angle) * 185,
    });
  });
  for (const relationship of session.exported.world.relationships.slice(0, 30)) {
    const from = byId.get(relationship.attributes.from_id);
    const to = byId.get(relationship.attributes.to_id);
    if (!from || !to) continue;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    svg.append(line);
  }
  for (const { entity: entityValue, x, y } of byId.values()) {
    const circle = document.createElementNS(svg.namespaceURI, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "13");
    const title = document.createElementNS(svg.namespaceURI, "title");
    title.textContent = `${entityValue.kind}: ${entityValue.id}`;
    circle.append(title);
    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", x + 18);
    label.setAttribute("y", y + 4);
    label.textContent = entityValue.kind.slice(0, 22);
    svg.append(circle, label);
  }
  resultView.append(svg);
}

function renderTimeline(session) {
  const list = element("div", "timeline");
  for (const event of session.exported.world.event_log) {
    const button = element("button");
    button.type = "button";
    const time = element("time", "", `T${event.tick}`);
    const kind = element("strong", "", event.event_type);
    const cause = element(
      "span",
      "",
      event.causes.length ? `caused by ${event.causes.join(", ")}` : "root event",
    );
    button.append(time, kind, cause);
    button.addEventListener("click", () =>
      updateState({ type: "event-selected", eventId: event.event_id }),
    );
    list.append(button);
  }
  resultView.append(list);
}

function renderInspector(session) {
  const event = session.exported.world.event_log.find(
    ({ event_id: eventId }) => eventId === studioState.selectedEventId,
  );
  const content = event ?? {
    projected_state: session.exported.world.projected_state,
    module_state: session.module_state,
  };
  const pre = element("pre", "json-view", JSON.stringify(content, null, 2));
  resultView.append(pre);
}

function lineageFacts(session) {
  const worldFacts = session.exported.world.observations.filter(({ kind }) =>
    kind.includes("lineage"),
  );
  const moduleFacts = [];
  for (const state of Object.values(session.module_state)) {
    for (const transfer of Object.values(state.data_transfers ?? {})) {
      moduleFacts.push({
        id: transfer.transfer_id ?? transfer.record_id,
        kind: "cross-boundary-lineage",
        attributes: transfer,
      });
    }
    for (const record of Object.values(state.records ?? {})) {
      if (record.lineage) {
        moduleFacts.push({
          id: record.record_id,
          kind: "record-lineage",
          attributes: record.lineage,
        });
      }
    }
  }
  return [...worldFacts, ...moduleFacts];
}

function renderLineage(session) {
  const list = element("div", "lineage-list");
  const facts = lineageFacts(session);
  if (!facts.length) {
    list.append(element("p", "", "This scenario emitted no lineage facts."));
  }
  for (const fact of facts) {
    const item = element("article", "lineage-item");
    item.append(element("h3", "", fact.kind));
    item.append(element("code", "", fact.id));
    item.append(element("pre", "json-view", JSON.stringify(fact.attributes, null, 2)));
    list.append(item);
  }
  resultView.append(list);
}

function renderExports(session) {
  const list = element("div", "export-list");
  const exports = [
    ["scenario.json", session.scenario],
    ["events.json", session.exported.world.event_log],
    ["world-export.json", session.exported],
    ["checkpoint.json", session.checkpoint],
    ["comparison.json", session.comparison],
    ["evidence.json", evidenceEnvelope(session.exported)],
  ].filter(([, value]) => value);
  for (const [name, value] of exports) {
    const button = element("button", "", `Download ${name}`);
    button.type = "button";
    button.addEventListener("click", () => canonicalDownload(name, value));
    list.append(button);
  }
  resultView.append(list);
}

function render() {
  renderMetrics(studioState.session);
  for (const tab of tabs) {
    tab.setAttribute("aria-selected", String(tab.dataset.view === studioState.activeView));
  }
  resultView.replaceChildren();
  if (!studioState.session) {
    const empty = element("div", "empty-state");
    empty.append(element("p", "", "Run a scenario to create a local synthetic world."));
    resultView.append(empty);
    return;
  }
  const renderers = {
    graph: renderGraph,
    timeline: renderTimeline,
    inspector: renderInspector,
    lineage: renderLineage,
    exports: renderExports,
  };
  renderers[studioState.activeView](studioState.session);
}

function payload() {
  const data = new FormData(form);
  return {
    depth: data.get("depth"),
    scenario: data.get("scenario"),
    seed: data.get("seed"),
    scale: Number(data.get("scale")),
    duration: Number(data.get("duration")),
    intervention: Number(data.get("intervention")),
  };
}

async function execute(command) {
  const activePhases = {
    run: "running",
    replay: "replaying",
    branch: "branching",
    compare: "comparing",
    checkpoint: "checkpointing",
    pause: "pausing",
    resume: "resuming",
    cancel: "cancelling",
  };
  updateState({ type: "command-started", command: activePhases[command] });
  try {
    const session = await workerRequest(worker, command, payload());
    if (command === "cancel") updateState({ type: "cancelled" });
    else {
      updateState({
        type: "command-completed",
        phase: command === "pause" ? "paused" : "complete",
        session,
      });
    }
  } catch (error) {
    updateState({ type: "command-failed", error: error.message });
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  execute("run");
});
depthInput.addEventListener("change", populateScenarios);
for (const button of commandButtons) {
  button.addEventListener("click", () => execute(button.dataset.command));
}
for (const tab of tabs) {
  tab.addEventListener("click", () => {
    updateState({ type: "view-selected", view: tab.dataset.view });
    resultView.focus();
  });
}

const dialog = document.querySelector("#command-dialog");
const commandInput = document.querySelector("#command-input");
const commandResults = document.querySelector("#command-results");
const commandViews = ["graph", "timeline", "inspector", "lineage", "exports"];
let commandIndex = 0;

function renderCommands() {
  const filter = commandInput.value.trim().toLowerCase();
  const visible = commandViews.filter((view) => view.includes(filter));
  commandIndex = Math.min(commandIndex, Math.max(visible.length - 1, 0));
  commandResults.replaceChildren();
  visible.forEach((view, index) => {
    const button = element("button", "", `Open ${view}`);
    button.type = "button";
    button.dataset.viewTarget = view;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === commandIndex));
    button.addEventListener("click", () => openView(view));
    commandResults.append(button);
  });
}

function openDialog() {
  dialog.classList.add("is-open");
  dialog.setAttribute("aria-hidden", "false");
  commandInput.value = "";
  renderCommands();
  commandInput.focus();
}

function closeDialog() {
  dialog.classList.remove("is-open");
  dialog.setAttribute("aria-hidden", "true");
  document.querySelector("#command-open").focus();
}

function openView(view) {
  updateState({ type: "view-selected", view });
  closeDialog();
  document.querySelector("#studio").scrollIntoView({ behavior: "smooth" });
}

document.querySelector("#command-open").addEventListener("click", openDialog);
document.querySelector("[data-dialog-close]").addEventListener("click", closeDialog);
commandInput.addEventListener("input", renderCommands);
commandInput.addEventListener("keydown", (event) => {
  const visible = [...commandResults.querySelectorAll("button")];
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (visible.length === 0) return;
    const delta = event.key === "ArrowDown" ? 1 : -1;
    commandIndex = (commandIndex + delta + visible.length) % visible.length;
    renderCommands();
  } else if (event.key === "Enter") {
    event.preventDefault();
    visible[commandIndex]?.click();
  } else if (event.key === "Escape") closeDialog();
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openDialog();
  } else if (event.key === "Escape" && dialog.classList.contains("is-open")) {
    closeDialog();
  } else if (event.key === "Tab" && dialog.classList.contains("is-open")) {
    const focusable = [...dialog.querySelectorAll("input, button")].filter(
      (node) => !node.disabled,
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

populateScenarios();
populateGallery();
updateState({ type: "view-selected", view: "graph" });
