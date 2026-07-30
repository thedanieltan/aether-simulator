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
  textDownload,
  workerRequest,
} from "./adapter.mjs";
import {
  commandEnabled,
  initialStudioState,
  reduceStudioState,
} from "./state.mjs";
import {
  parseProductRoute,
  productRouteHref,
  productRoutes,
  routeForView,
} from "./routes.mjs";
import {
  ACTIVE_PROJECT_KEY,
  createProjectDocument,
  parseProjectFile,
  ProjectRepository,
  reviseProject,
  serializeProject,
} from "./project-store.mjs";
import { buildUnifiedEntityIndex } from "../src/entities/unified.mjs";
import {
  buildSemanticZoomModel,
  resolveSemanticZoom,
} from "../src/entities/semantic-zoom.mjs";
import {
  compileScenarioBlueprint,
  createScenarioBlueprint,
  serializeScenarioBlueprint,
  validateScenarioBlueprint,
} from "../src/scenarios/blueprint.mjs";
import {
  filterScenarioLibrary,
  guidedFirstRun,
  scenarioLibrary,
} from "../src/scenarios/library.mjs";
import {
  createExperimentDefinition,
  serializeExperiment,
  summarizeExperiment,
} from "../src/experiments/laboratory.mjs";
import { analyzeSyntheticWorld } from "../src/analysis/workspace.mjs";
import {
  assertBrowserWorkload,
  estimateBrowserWorkload,
} from "./runtime-control.mjs";

function createRuntimeWorker() {
  return new Worker(new URL("./worker.mjs", import.meta.url), { type: "module" });
}

let worker = createRuntimeWorker();
const form = document.querySelector("#scenario-form");
const depthInput = document.querySelector("#depth");
const scenarioInput = document.querySelector("#scenario");
const resultView = document.querySelector("#result-view");
const metrics = document.querySelector("#metrics");
const status = document.querySelector("#run-status");
const runProgress = document.querySelector("#run-progress");
const runtimePhase = document.querySelector("#runtime-phase");
const runtimeElapsed = document.querySelector("#runtime-elapsed");
const runtimeEstimate = document.querySelector("#runtime-estimate");
const gallery = document.querySelector("#scenario-gallery");
const libraryDepth = document.querySelector("#library-depth");
const librarySearch = document.querySelector("#library-search");
const libraryStatus = document.querySelector("#library-status");
const tabs = [...document.querySelectorAll("[data-view]")];
const commandButtons = [...document.querySelectorAll("[data-command]")];
const productNav = document.querySelector("#product-nav");
const productIndex = document.querySelector("#product-index");
const routeContext = document.querySelector("#route-context");
const projectContext = document.querySelector("#project-context");
const projectForm = document.querySelector("#project-form");
const projectName = document.querySelector("#project-name");
const projectDescription = document.querySelector("#project-description");
const projectRevision = document.querySelector("#project-revision");
const projectStatus = document.querySelector("#project-status");
const projectList = document.querySelector("#project-list");
const projectCount = document.querySelector("#project-count");
const projectSave = document.querySelector("#project-save");
const projectExport = document.querySelector("#project-export");
const projectImport = document.querySelector("#project-import");
const blueprintForm = document.querySelector("#blueprint-form");
const blueprintGraph = document.querySelector("#blueprint-graph");
const blueprintDepth = document.querySelector("#blueprint-depth");
const blueprintScenario = document.querySelector("#blueprint-scenario");
const blueprintScale = document.querySelector("#blueprint-scale");
const blueprintDuration = document.querySelector("#blueprint-duration");
const blueprintIntervention = document.querySelector("#blueprint-intervention");
const blueprintSeed = document.querySelector("#blueprint-seed");
const blueprintStatus = document.querySelector("#blueprint-status");
const blueprintApply = document.querySelector("#blueprint-apply");
const blueprintExport = document.querySelector("#blueprint-export");
const experimentForm = document.querySelector("#experiment-form");
const experimentStatus = document.querySelector("#experiment-status");
const experimentResults = document.querySelector("#experiment-results");
const experimentRun = document.querySelector("#experiment-run");
const experimentExport = document.querySelector("#experiment-export");
let studioState = { ...initialStudioState };
let projectRepository = null;
let localProjects = [];
let activeProject = null;
let lastExperiment = null;
let activeController = null;
let elapsedTimer = null;
let operationStartedAt = null;

function element(name, className, text) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setProjectStatus(message, state = "default") {
  projectStatus.textContent = message;
  projectStatus.dataset.state = state;
}

function setRuntimeProgress({ phase, value, detail }) {
  runProgress.value = value;
  runProgress.textContent = `${value}%`;
  runtimePhase.textContent = `${phase}: ${detail}`;
}

function startElapsedClock() {
  stopElapsedClock();
  operationStartedAt = performance.now();
  runtimeElapsed.textContent = "0.0 s";
  elapsedTimer = setInterval(() => {
    runtimeElapsed.textContent =
      `${((performance.now() - operationStartedAt) / 1000).toFixed(1)} s`;
  }, 100);
}

function stopElapsedClock() {
  if (elapsedTimer) clearInterval(elapsedTimer);
  elapsedTimer = null;
  if (operationStartedAt !== null) {
    runtimeElapsed.textContent =
      `${((performance.now() - operationStartedAt) / 1000).toFixed(1)} s`;
  }
  operationStartedAt = null;
}

function updateWorkloadEstimate() {
  try {
    const estimate = estimateBrowserWorkload(payload());
    const scaleInput = form.querySelector("#scale");
    scaleInput.max = String(estimate.envelope.maximumScale);
    runtimeEstimate.textContent =
      `${estimate.band} · ~${estimate.estimatedEventUnits} relative event units · `
      + `browser scale ≤ ${estimate.envelope.maximumScale}`
      + (estimate.depth === "economy"
        ? ` · duration ≤ ${estimate.envelope.maximumDuration}`
        : "");
  } catch (error) {
    runtimeEstimate.textContent = error.message;
  }
}

function cancelActiveOperation() {
  if (!activeController) return false;
  activeController.abort();
  activeController = null;
  worker.terminate();
  worker = createRuntimeWorker();
  stopElapsedClock();
  setRuntimeProgress({
    phase: "cancelled",
    value: 0,
    detail: "The in-flight worker was terminated. A fresh worker is ready.",
  });
  updateState({ type: "cancelled" });
  return true;
}

function resetRuntimeWorker() {
  if (cancelActiveOperation()) return;
  worker.terminate();
  worker = createRuntimeWorker();
  stopElapsedClock();
  setRuntimeProgress({
    phase: "reset",
    value: 0,
    detail: "A fresh local worker is ready. The previous session was discarded.",
  });
  updateState({ type: "cancelled" });
}

async function controlledWorkerRequest(command, requestPayload, controller) {
  return workerRequest(worker, command, requestPayload, {
    signal: controller.signal,
    onProgress: setRuntimeProgress,
  });
}

function rememberActiveProject(projectId) {
  try {
    if (projectId) localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    else localStorage.removeItem(ACTIVE_PROJECT_KEY);
  } catch {
    setProjectStatus("The active project cannot be remembered in this browser.", "error");
  }
}

function recalledActiveProject() {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

function applyProjectConfig(config) {
  depthInput.value = config.depth;
  populateScenarios();
  if ([...scenarioInput.options].some(({ value }) => value === config.scenario)) {
    scenarioInput.value = config.scenario;
  } else {
    throw new TypeError("the project references a scenario unavailable in this version");
  }
  form.querySelector("#seed").value = config.seed;
  form.querySelector("#scale").value = String(config.scale);
  form.querySelector("#duration").value = String(config.duration);
  form.querySelector("#intervention").value = String(config.intervention);
  syncBlueprintFromRun();
  updateWorkloadEstimate();
}

function renderProjectEditor() {
  const title = document.querySelector("#project-editor-title");
  if (activeProject) {
    title.textContent = "Project details";
    projectName.value = activeProject.name;
    projectDescription.value = activeProject.description;
    projectRevision.textContent = `Revision ${activeProject.revision}`;
    projectSave.textContent = "Save details";
    projectExport.disabled = false;
    projectContext.textContent = activeProject.name;
  } else {
    title.textContent = "Create a project";
    projectName.value = "";
    projectDescription.value = "";
    projectRevision.textContent = "Not saved";
    projectSave.textContent = "Create project";
    projectExport.disabled = true;
    projectContext.textContent = "No project open";
  }
}

function renderProjectList() {
  projectList.replaceChildren();
  projectCount.textContent = `${localProjects.length} ${localProjects.length === 1 ? "project" : "projects"}`;
  if (!localProjects.length) {
    projectList.append(
      element("p", "empty-copy", "No projects are stored in this browser."),
    );
    return;
  }
  for (const project of localProjects) {
    const row = element("article", "project-row");
    if (project.project_id === activeProject?.project_id) {
      row.setAttribute("aria-current", "true");
    }
    const copy = element("div", "project-row-copy");
    copy.append(
      element("strong", "", project.name),
      element(
        "span",
        "",
        `${project.config.depth} · revision ${project.revision}`
          + (project.last_run ? ` · ${project.last_run.digest.slice(0, 8)}` : ""),
      ),
    );
    const actions = element("div", "project-row-actions");
    const open = element("button", "", "Open");
    open.type = "button";
    open.addEventListener("click", () => openProject(project));
    const remove = element("button", "", "Delete");
    remove.type = "button";
    remove.addEventListener("click", () => deleteProject(project));
    actions.append(open, remove);
    row.append(copy, actions);
    projectList.append(row);
  }
}

async function refreshProjects() {
  localProjects = await projectRepository.list();
  if (activeProject) {
    activeProject = localProjects.find(
      ({ project_id: projectId }) => projectId === activeProject.project_id,
    ) ?? null;
  }
  renderProjectEditor();
  renderProjectList();
}

async function storeProject(project, message) {
  activeProject = await projectRepository.put(project);
  rememberActiveProject(activeProject.project_id);
  await refreshProjects();
  setProjectStatus(message, "success");
  return activeProject;
}

async function openProject(project, { restore = true } = {}) {
  try {
    activeProject = project;
    rememberActiveProject(project.project_id);
    applyProjectConfig(project.config);
    renderProjectEditor();
    renderProjectList();
    setProjectStatus(`Opened ${project.name}.`, "success");
    if (restore && project.last_run) {
      setProjectStatus("Verifying the stored run against this simulator version.");
      await execute("restore", { expectedDigest: project.last_run.digest });
      if (studioState.phase !== "error") {
        setProjectStatus("Project and last run restored locally.", "success");
      }
    }
  } catch (error) {
    setProjectStatus(error.message, "error");
  }
}

async function deleteProject(project) {
  if (!confirm(`Delete the local project “${project.name}”? This cannot be undone.`)) {
    return;
  }
  try {
    await projectRepository.delete(project.project_id);
    if (activeProject?.project_id === project.project_id) {
      activeProject = null;
      rememberActiveProject(null);
      if (!cancelActiveOperation()) await workerRequest(worker, "cancel");
      updateState({ type: "cancelled" });
    }
    await refreshProjects();
    setProjectStatus(`Deleted ${project.name} from this browser.`, "success");
  } catch (error) {
    setProjectStatus(error.message, "error");
  }
}

async function saveActiveConfiguration() {
  if (!activeProject || !projectRepository) return;
  try {
    const revised = reviseProject(activeProject, {
      config: payload(),
      last_run: null,
    });
    await storeProject(revised, "Project configuration saved locally.");
  } catch (error) {
    setProjectStatus(error.message, "error");
  }
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
  updateProductNavigation();
  render();
}

function routeAvailability(route) {
  if (route.availability === "available") return "Available";
  return studioState.session ? "Available" : "Requires a completed run";
}

function populateProductNavigation() {
  productNav.replaceChildren();
  productIndex.replaceChildren();
  for (const [index, route] of productRoutes.entries()) {
    const railLink = element("a", "rail-link");
    railLink.href = productRouteHref(route.id);
    railLink.dataset.route = route.id;
    railLink.append(
      element("span", "", route.eyebrow),
      element("strong", "", route.label),
    );
    productNav.append(railLink);

    const item = element("li", "product-index-item");
    const link = element("a");
    link.href = productRouteHref(route.id);
    link.dataset.route = route.id;
    link.append(
      element("span", "index-number", String(index + 1).padStart(2, "0")),
      element("strong", "", route.label),
      element("span", "index-purpose", route.eyebrow),
      element("span", "index-status", routeAvailability(route)),
    );
    item.append(link);
    productIndex.append(item);
  }
}

function updateProductNavigation() {
  const route = productRoutes.find(({ id }) => id === studioState.activeRoute)
    ?? productRoutes[0];
  routeContext.textContent = `${route.eyebrow} / ${route.label}`;
  for (const link of document.querySelectorAll("[data-route]")) {
    const active = link.dataset.route === route.id;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
    const statusNode = link.querySelector(".index-status");
    const linkedRoute = productRoutes.find(({ id }) => id === link.dataset.route);
    if (statusNode && linkedRoute) statusNode.textContent = routeAvailability(linkedRoute);
  }
}

function applyProductRoute({ focus = false } = {}) {
  const route = parseProductRoute(globalThis.location.hash);
  updateState({ type: "route-selected", route: route.id, view: route.view });
  const target = document.querySelector(`#${route.target}`);
  target?.scrollIntoView({ behavior: focus ? "smooth" : "auto", block: "start" });
  if (focus) target?.focus({ preventScroll: true });
}

function populateScenarios() {
  scenarioInput.replaceChildren();
  for (const [value, label] of scenarioCatalog[depthInput.value]) {
    const option = element("option", "", label);
    option.value = value;
    scenarioInput.append(option);
  }
}

function blueprintConfiguration() {
  return {
    depth: blueprintDepth.value,
    scenario: blueprintScenario.value,
    scale: Number(blueprintScale.value),
    duration: Number(blueprintDuration.value),
    intervention: Number(blueprintIntervention.value),
    seed: blueprintSeed.value,
  };
}

function populateBlueprintScenarios() {
  const previous = blueprintScenario.value;
  blueprintScenario.replaceChildren();
  for (const [value, label] of scenarioCatalog[blueprintDepth.value]) {
    const option = element("option", "", label);
    option.value = value;
    blueprintScenario.append(option);
  }
  if ([...blueprintScenario.options].some(({ value }) => value === previous)) {
    blueprintScenario.value = previous;
  }
}

function setBlueprintStatus(message, state = "default") {
  blueprintStatus.textContent = message;
  blueprintStatus.dataset.state = state;
}

function renderBlueprint() {
  blueprintGraph.replaceChildren();
  try {
    const blueprint = createScenarioBlueprint(blueprintConfiguration());
    const validation = validateScenarioBlueprint(blueprint, scenarioCatalog);
    if (!validation.valid) throw new TypeError(validation.errors.join("; "));
    const values = {
      premise: `${blueprint.configuration.depth} · ${blueprint.configuration.scenario}`,
      population: `${blueprint.configuration.scale}× construction scale`,
      time: `${blueprint.configuration.duration} logical ticks`,
      intervention: String(blueprint.configuration.intervention),
      reproducibility: blueprint.configuration.seed,
    };
    const focusTargets = {
      premise: blueprintDepth,
      population: blueprintScale,
      time: blueprintDuration,
      intervention: blueprintIntervention,
      reproducibility: blueprintSeed,
    };
    for (const node of blueprint.nodes) {
      const item = element("li", "blueprint-node");
      const button = element("button");
      button.type = "button";
      button.dataset.blueprintNode = node.node_id;
      button.append(
        element("span", "index-number", String(node.order).padStart(2, "0")),
        element("strong", "", node.label),
        element("span", "", values[node.node_id]),
      );
      button.addEventListener("click", () => focusTargets[node.node_id].focus());
      item.append(button);
      blueprintGraph.append(item);
    }
    blueprintApply.disabled = false;
    blueprintExport.disabled = false;
    setBlueprintStatus("Blueprint valid and ready to compile.", "success");
  } catch (error) {
    blueprintApply.disabled = true;
    blueprintExport.disabled = true;
    setBlueprintStatus(error.message, "error");
  }
}

function syncBlueprintFromRun() {
  blueprintDepth.value = depthInput.value;
  populateBlueprintScenarios();
  blueprintScenario.value = scenarioInput.value;
  blueprintScale.value = form.querySelector("#scale").value;
  blueprintDuration.value = form.querySelector("#duration").value;
  blueprintIntervention.value = form.querySelector("#intervention").value;
  blueprintSeed.value = form.querySelector("#seed").value;
  renderBlueprint();
}

function populateGallery() {
  gallery.replaceChildren();
  const entries = filterScenarioLibrary({
    depth: libraryDepth.value,
    query: librarySearch.value,
  }, scenarioLibrary);
  libraryStatus.textContent =
    `${entries.length} of ${scenarioLibrary.entries.length} committed scenarios`;
  if (!entries.length) {
    gallery.append(
      element("p", "empty-copy", "No committed scenario matches this filter."),
    );
    return;
  }
  for (const entry of entries) {
    const button = element("button", "scenario-card");
    button.type = "button";
    button.setAttribute("role", "listitem");
    button.dataset.depth = entry.depth;
    button.dataset.scenario = entry.scenario_id;
    button.append(
      element(
        "output",
        "",
        `${entry.depth.toUpperCase()} DEPTH`
          + (entry.recommended ? " · RECOMMENDED" : ""),
      ),
      element("strong", "", entry.label),
      element("span", "", entry.summary),
      element("small", "", entry.tags.join(" · ")),
    );
    button.addEventListener("click", () => {
      depthInput.value = entry.depth;
      populateScenarios();
      scenarioInput.value = entry.scenario_id;
      updateWorkloadEstimate();
      syncBlueprintFromRun();
      globalThis.location.hash = productRouteHref("run");
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

function renderEntityDetail(record, index) {
  const detail = element("article", "entity-detail");
  const heading = element("div", "entity-detail-heading");
  const title = element("div");
  title.append(
    element("p", "signal", `${record.entity_type.toUpperCase()} · ${record.kind}`),
    element("h3", "", record.label),
  );
  const boundary = element("span", "entity-boundary", "Synthetic · non-authoritative");
  heading.append(title, boundary);
  detail.append(heading);

  const facts = element("dl", "entity-facts");
  const values = [
    ["Entity ID", record.entity_id],
    ["Role contexts", record.contexts.length],
    ["Referenced events", record.event_ids.length],
    ["Lineage facts", record.lineage_fact_ids.length],
  ];
  for (const [label, value] of values) {
    const item = element("div");
    item.append(element("dt", "", label), element("dd", "", String(value)));
    facts.append(item);
  }
  detail.append(facts);

  const contextHeading = element("h4", "", "Role and relationship contexts");
  detail.append(contextHeading);
  if (!record.contexts.length) {
    detail.append(element("p", "empty-copy", "No declared contexts for this entity."));
  } else {
    const contexts = element("div", "entity-contexts");
    const byId = new Map(index.records.map((item) => [item.entity_id, item]));
    for (const context of record.contexts) {
      const item = element("section", "entity-context");
      const counterpart = byId.get(context.counterpart_id);
      item.append(
        element("strong", "", context.role ?? context.kind),
        element(
          "span",
          "",
          `${context.direction} · ${counterpart?.label ?? context.counterpart_id}`,
        ),
      );
      if (context.status) item.append(element("span", "", `status: ${context.status}`));
      item.append(element("code", "", context.context_id));
      contexts.append(item);
    }
    detail.append(contexts);
  }

  const attributes = element("details", "entity-attributes");
  attributes.append(
    element("summary", "", "Synthetic source attributes"),
    element("pre", "json-view", JSON.stringify(record.attributes, null, 2)),
  );
  detail.append(attributes);
  return detail;
}

function renderEntities(session) {
  const index = buildUnifiedEntityIndex(session.exported.world);
  const explorer = element("div", "entity-explorer");
  const controls = element("div", "entity-controls");
  const searchLabel = element("label");
  searchLabel.append(
    element("span", "", "Find an entity"),
  );
  const search = element("input");
  search.type = "search";
  search.placeholder = "Search fictional labels, kinds, or IDs";
  searchLabel.append(search);
  const typeLabel = element("label");
  typeLabel.append(element("span", "", "Entity type"));
  const type = element("select");
  for (const [value, label] of [
    ["all", `All (${index.records.length})`],
    ["people", `Citizens and people (${index.counts.people})`],
    ["households", `Households (${index.counts.households})`],
    ["organizations", `Organizations (${index.counts.organizations})`],
    ["institutions", `Institutions (${index.counts.institutions})`],
    ["systems", `Systems (${index.counts.systems})`],
    ["assets", `Assets (${index.counts.assets})`],
  ]) {
    const option = element("option", "", label);
    option.value = value;
    type.append(option);
  }
  typeLabel.append(type);
  controls.append(searchLabel, typeLabel);

  const body = element("div", "entity-explorer-body");
  const list = element("div", "entity-list");
  list.setAttribute("aria-label", "Synthetic entities");
  const detailHost = element("div", "entity-detail-host");
  body.append(list, detailHost);
  explorer.append(controls, body);
  resultView.append(explorer);

  function renderEntityList() {
    const query = search.value.trim().toLowerCase();
    const visible = index.records.filter((record) =>
      (type.value === "all" || record.collection === type.value)
      && `${record.label} ${record.kind} ${record.entity_id}`.toLowerCase().includes(query));
    list.replaceChildren();
    if (!visible.length) {
      list.append(element("p", "empty-copy", "No entities match this local filter."));
    }
    const selected = visible.find(
      ({ entity_id: entityId }) => entityId === studioState.selectedEntityId,
    ) ?? visible[0] ?? index.records.find(
      ({ entity_id: entityId }) => entityId === studioState.selectedEntityId,
    ) ?? index.records[0];
    for (const record of visible) {
      const button = element("button", "entity-list-item");
      button.type = "button";
      button.dataset.entityId = record.entity_id;
      button.setAttribute(
        "aria-pressed",
        String(record.entity_id === selected?.entity_id),
      );
      button.append(
        element("strong", "", record.label),
        element("span", "", `${record.entity_type} · ${record.contexts.length} contexts`),
      );
      button.addEventListener("click", () =>
        updateState({ type: "entity-selected", entityId: record.entity_id }));
      list.append(button);
    }
    detailHost.replaceChildren();
    if (selected) detailHost.append(renderEntityDetail(selected, index));
  }

  search.addEventListener("input", renderEntityList);
  type.addEventListener("change", renderEntityList);
  renderEntityList();
}

function renderSemanticZoom(session) {
  const model = buildSemanticZoomModel(session.exported.world);
  let selection;
  try {
    selection = resolveSemanticZoom(model, {
      enterpriseId: studioState.selectedZoomEnterpriseId,
      citizenId: studioState.selectedZoomCitizenId,
    });
  } catch {
    selection = resolveSemanticZoom(model);
  }
  const byId = new Map(model.records.map((record) => [record.entity_id, record]));
  const zoom = element("div", "semantic-zoom");
  const trail = element("nav", "zoom-trail");
  trail.setAttribute("aria-label", "Semantic zoom path");
  const worldButton = element("button", "", "World");
  worldButton.type = "button";
  worldButton.addEventListener("click", () => updateState({ type: "zoom-world-selected" }));
  trail.append(worldButton);
  if (selection.enterprise) {
    trail.append(element("span", "", "›"));
    const enterpriseButton = element("button", "", selection.enterprise.label);
    enterpriseButton.type = "button";
    enterpriseButton.addEventListener("click", () =>
      updateState({
        type: "zoom-enterprise-selected",
        enterpriseId: selection.enterprise.enterprise_id,
      }));
    trail.append(enterpriseButton);
  }
  if (selection.citizen) {
    trail.append(
      element("span", "", "›"),
      element("strong", "", selection.citizen.label),
    );
  }
  zoom.append(trail);

  if (selection.level === "world") {
    const heading = element("div", "zoom-heading");
    heading.append(
      element("p", "signal", "WORLD LEVEL"),
      element("h3", "", "Choose a synthetic enterprise"),
      element(
        "p",
        "empty-copy",
        `${model.enterprises.length} organizations · `
          + `${model.world.connected_citizen_count} of ${model.world.citizen_count} `
          + "citizens have a declared enterprise context.",
      ),
    );
    const grid = element("div", "zoom-grid");
    for (const enterprise of model.enterprises) {
      const button = element("button", "zoom-card");
      button.type = "button";
      button.dataset.enterpriseId = enterprise.enterprise_id;
      button.dataset.citizenCount = String(enterprise.citizen_ids.length);
      button.append(
        element("span", "signal", enterprise.kind.toUpperCase()),
        element("strong", "", enterprise.label),
        element(
          "span",
          "",
          `${enterprise.citizen_ids.length} declared citizen `
            + `${enterprise.citizen_ids.length === 1 ? "context" : "contexts"}`,
        ),
      );
      button.addEventListener("click", () =>
        updateState({
          type: "zoom-enterprise-selected",
          enterpriseId: enterprise.enterprise_id,
        }));
      grid.append(button);
    }
    zoom.append(heading, grid);
  } else if (selection.level === "enterprise") {
    const enterprise = selection.enterprise;
    const heading = element("div", "zoom-heading");
    heading.append(
      element("p", "signal", `ENTERPRISE LEVEL · ${enterprise.kind}`),
      element("h3", "", enterprise.label),
      element(
        "p",
        "empty-copy",
        `${enterprise.citizen_ids.length} citizens · `
          + `${enterprise.event_ids.length} referenced events · `
          + `${enterprise.lineage_fact_ids.length} lineage facts`,
      ),
    );
    const citizens = element("div", "zoom-grid");
    if (!enterprise.citizen_ids.length) {
      citizens.append(
        element(
          "p",
          "empty-copy",
          "No citizen has a declared relationship or identity context in this organization.",
        ),
      );
    }
    for (const citizenId of enterprise.citizen_ids) {
      const citizen = byId.get(citizenId);
      const relevantContexts = citizen.contexts.filter(
        ({ counterpart_id: counterpartId }) =>
          counterpartId === enterprise.enterprise_id);
      const button = element("button", "zoom-card zoom-citizen");
      button.type = "button";
      button.dataset.citizenId = citizen.entity_id;
      button.append(
        element("span", "signal", "SYNTHETIC CITIZEN"),
        element("strong", "", citizen.label),
        element(
          "span",
          "",
          relevantContexts.map(({ role, kind }) => role ?? kind).join(" · "),
        ),
      );
      button.addEventListener("click", () =>
        updateState({ type: "zoom-citizen-selected", citizenId }));
      citizens.append(button);
    }
    zoom.append(heading, citizens);
  } else {
    const context = selection.citizen.contexts.filter(
      ({ counterpart_id: counterpartId }) =>
        counterpartId === selection.enterprise.enterprise_id);
    const contextBoundary = element("section", "zoom-context-boundary");
    contextBoundary.append(
      element("strong", "", `Context inside ${selection.enterprise.label}`),
      element(
        "span",
        "",
        context.map(({ role, kind }) => role ?? kind).join(" · "),
      ),
      element(
        "p",
        "empty-copy",
        "This view shows declared synthetic relationships only; it does not infer a real identity.",
      ),
    );
    zoom.append(
      contextBoundary,
      renderEntityDetail(selection.citizen, { records: model.records }),
    );
  }
  resultView.append(zoom);
}

function analysisTable(headings, rows) {
  const wrap = element("div", "table-wrap");
  const table = element("table", "experiment-table");
  const head = element("thead");
  const headingRow = element("tr");
  for (const heading of headings) headingRow.append(element("th", "", heading));
  head.append(headingRow);
  const body = element("tbody");
  for (const values of rows) {
    const row = element("tr");
    for (const value of values) row.append(element("td", "", String(value)));
    body.append(row);
  }
  table.append(head, body);
  wrap.append(table);
  return wrap;
}

function renderAnalysis(session) {
  const analysis = analyzeSyntheticWorld(session.exported);
  const workspace = element("div", "analysis-workspace");
  const heading = element("div", "analysis-heading");
  heading.append(
    element("p", "signal", "DESCRIPTIVE RUN ANALYSIS"),
    element("h3", "", "Inspect what this synthetic run emitted"),
    element("p", "empty-copy", analysis.interpretation.statement),
  );
  const exportButton = element("button", "", "Download analysis.json");
  exportButton.type = "button";
  exportButton.addEventListener("click", () =>
    canonicalDownload("analysis.json", analysis));
  heading.append(exportButton);

  const measureGrid = element("section", "analysis-measures");
  measureGrid.setAttribute("aria-label", "Descriptive measures");
  for (const [label, value] of Object.entries(analysis.measures)) {
    const card = element("article");
    card.append(
      element("span", "", label.replaceAll("_", " ")),
      element("strong", "", String(value)),
    );
    measureGrid.append(card);
  }

  const cohorts = element("section", "analysis-section");
  cohorts.append(
    element("h4", "", "Explicit entity cohorts"),
    element(
      "p",
      "empty-copy",
      "Cohorts group emitted entities by collection and declared kind.",
    ),
    analysisTable(
      ["Collection", "Declared kind", "Count"],
      analysis.cohorts.map(({ collection, kind, count }) => [
        collection,
        kind,
        count,
      ]),
    ),
  );

  const ancestry = element("section", "analysis-section");
  ancestry.append(
    element("h4", "", "Declared event ancestry"),
    element(
      "p",
      "empty-copy",
      analysis.declared_event_ancestry.length
        ? `${analysis.declared_event_ancestry.length} explicit event links.`
        : "This run emitted no explicit event ancestry links.",
    ),
  );
  if (analysis.declared_event_ancestry.length) {
    ancestry.append(
      analysisTable(
        ["Cause event", "Effect event", "Resolved"],
        analysis.declared_event_ancestry.map(
          ({ cause_event_id: cause, effect_event_id: effect, resolved }) => [
            cause.slice(0, 20),
            effect.slice(0, 20),
            resolved ? "yes" : "no",
          ],
        ),
      ),
    );
  }

  const uncertainty = element("section", "analysis-boundary");
  uncertainty.append(
    element("h4", "", "Uncertainty and claim boundary"),
    element(
      "p",
      "",
      "No statistical uncertainty, calibration, prediction, or real-world causal effect is estimated.",
    ),
  );
  const limitations = element("ul");
  for (const limitation of analysis.interpretation.limitations) {
    limitations.append(element("li", "", limitation));
  }
  uncertainty.append(limitations);
  workspace.append(heading, measureGrid, cohorts, ancestry, uncertainty);
  resultView.append(workspace);
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
    entities: renderEntities,
    zoom: renderSemanticZoom,
    analysis: renderAnalysis,
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

function experimentDefinition() {
  return createExperimentDefinition({
    name: document.querySelector("#experiment-name").value,
    seed: document.querySelector("#experiment-seed").value,
    scale: Number(document.querySelector("#experiment-scale").value),
    duration: Number(document.querySelector("#experiment-duration").value),
    variants: [
      {
        variant_id: "variant-a",
        label: "Variant A",
        intervention: Number(document.querySelector("#experiment-a").value),
      },
      {
        variant_id: "variant-b",
        label: "Variant B",
        intervention: Number(document.querySelector("#experiment-b").value),
      },
    ],
  });
}

function renderExperimentResult(result) {
  experimentResults.replaceChildren();
  const summary = element("div", "experiment-summary");
  summary.append(
    element("span", "", `Baseline ${result.baseline_digest.slice(0, 8)}`),
    element("span", "", `${result.results.length} declared variants`),
    element("span", "", "Synthetic comparison"),
  );
  const tableWrap = element("div", "table-wrap");
  const table = element("table", "experiment-table");
  const head = element("thead");
  const headingRow = element("tr");
  for (const label of [
    "Variant",
    "Intervention",
    "Public expenditure Δ",
    "Event Δ",
    "Branch digest",
  ]) {
    headingRow.append(element("th", "", label));
  }
  head.append(headingRow);
  const body = element("tbody");
  for (const variant of result.results) {
    const row = element("tr");
    row.append(
      element("td", "", variant.label),
      element("td", "", String(variant.intervention)),
      element(
        "td",
        "",
        String(variant.outcomes.public_expenditure?.difference ?? "not emitted"),
      ),
      element("td", "", String(variant.event_count_difference)),
      element("td", "", variant.branch_digest.slice(0, 8)),
    );
    body.append(row);
  }
  table.append(head, body);
  tableWrap.append(table);
  const boundary = element(
    "p",
    "control-help",
    "Differences are synthetic model outputs, not real-world causal estimates.",
  );
  experimentResults.append(summary, tableWrap, boundary);
}

async function runExperiment() {
  const definition = experimentDefinition();
  experimentRun.disabled = true;
  experimentExport.disabled = true;
  experimentStatus.dataset.state = "default";
  experimentStatus.textContent = "Running fixed baseline locally.";
  updateState({ type: "command-started", command: "experimenting" });
  const controller = new AbortController();
  activeController = controller;
  startElapsedClock();
  try {
    assertBrowserWorkload(definition.baseline);
    const baseline = await controlledWorkerRequest("run", definition.baseline, controller);
    const variants = [];
    for (const [index, variant] of definition.variants.entries()) {
      experimentStatus.textContent =
        `Running ${variant.label} (${index + 1} of ${definition.variants.length}).`;
      variants.push(
        await controlledWorkerRequest("branch", {
          ...definition.baseline,
          intervention: variant.intervention,
        }, controller),
      );
    }
    lastExperiment = summarizeExperiment(definition, baseline, variants);
    renderExperimentResult(lastExperiment);
    updateState({
      type: "command-completed",
      phase: "complete",
      session: variants.at(-1),
    });
    experimentExport.disabled = false;
    experimentStatus.dataset.state = "success";
    experimentStatus.textContent = "Experiment complete. All variants share one baseline.";
  } catch (error) {
    if (error.name === "AbortError") {
      experimentStatus.dataset.state = "default";
      experimentStatus.textContent = "Experiment cancelled. The local worker was replaced.";
      return;
    }
    updateState({ type: "command-failed", error: error.message });
    experimentStatus.dataset.state = "error";
    experimentStatus.textContent = error.message;
  } finally {
    if (activeController === controller) activeController = null;
    stopElapsedClock();
    experimentRun.disabled = false;
  }
}

async function execute(command, overrides = {}) {
  if (command === "cancel" && cancelActiveOperation()) return;
  const activePhases = {
    run: "running",
    restore: "restoring",
    replay: "replaying",
    branch: "branching",
    compare: "comparing",
    checkpoint: "checkpointing",
    pause: "pausing",
    resume: "resuming",
    cancel: "cancelling",
  };
  updateState({ type: "command-started", command: activePhases[command] });
  const controller = new AbortController();
  activeController = controller;
  startElapsedClock();
  try {
    const requestPayload = { ...payload(), ...overrides };
    if (command === "run" || command === "restore") {
      assertBrowserWorkload(requestPayload);
    }
    const session = await controlledWorkerRequest(command, requestPayload, controller);
    if (command === "cancel") updateState({ type: "cancelled" });
    else {
      updateState({
        type: "command-completed",
        phase: command === "pause" ? "paused" : "complete",
        session,
      });
      if (command === "run" && activeProject && projectRepository) {
        const completedRevision = activeProject.revision + 1;
        const revised = reviseProject(activeProject, {
          config: requestPayload,
          last_run: {
            digest: session.exported.digest,
            completed_revision: completedRevision,
          },
        });
        await storeProject(revised, "Run completed and project saved locally.");
      }
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    updateState({ type: "command-failed", error: error.message });
    setRuntimeProgress({ phase: "error", value: 0, detail: error.message });
  } finally {
    if (activeController === controller) activeController = null;
    stopElapsedClock();
    if (studioState.phase === "complete" || studioState.phase === "paused") {
      setRuntimeProgress({
        phase: studioState.phase,
        value: 100,
        detail: "The deterministic result is ready.",
      });
    }
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  execute("run");
});
depthInput.addEventListener("change", () => {
  populateScenarios();
  updateWorkloadEstimate();
});
form.querySelector("#scale").addEventListener("input", updateWorkloadEstimate);
form.querySelector("#duration").addEventListener("input", updateWorkloadEstimate);
document.querySelector("#runtime-reset").addEventListener("click", resetRuntimeWorker);
for (const button of commandButtons) {
  button.addEventListener("click", () => execute(button.dataset.command));
}
for (const tab of tabs) {
  tab.addEventListener("click", () => {
    updateState({ type: "view-selected", view: tab.dataset.view });
    globalThis.history.replaceState(null, "", routeForView(tab.dataset.view));
    applyProductRoute();
    resultView.focus();
  });
}

const dialog = document.querySelector("#command-dialog");
const commandInput = document.querySelector("#command-input");
const commandResults = document.querySelector("#command-results");
const commandItems = [
  ...productRoutes.map((route) => ({
    id: route.id,
    label: route.label,
    hint: route.eyebrow,
    href: productRouteHref(route.id),
  })),
  ...["entities", "zoom", "analysis", "graph", "timeline", "inspector", "lineage", "exports"].map((view) => ({
    id: view,
    label: `${view[0].toUpperCase()}${view.slice(1)} view`,
    hint: "Result view",
    href: routeForView(view),
    view,
  })),
];
let commandIndex = 0;

function renderCommands() {
  const filter = commandInput.value.trim().toLowerCase();
  const visible = commandItems.filter(({ id, label, hint }) =>
    `${id} ${label} ${hint}`.toLowerCase().includes(filter),
  );
  commandIndex = Math.min(commandIndex, Math.max(visible.length - 1, 0));
  commandResults.replaceChildren();
  visible.forEach((item, index) => {
    const button = element("button");
    button.type = "button";
    button.append(
      element("strong", "", item.label),
      element("span", "", item.hint),
    );
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === commandIndex));
    button.addEventListener("click", () => openCommandItem(item));
    commandResults.append(button);
  });
}

function openDialog() {
  commandInput.value = "";
  renderCommands();
  if (!dialog.open) dialog.showModal();
  commandInput.focus();
}

function closeDialog() {
  dialog.close();
  document.querySelector("#command-open").focus();
}

function openCommandItem(item) {
  closeDialog();
  globalThis.location.hash = item.href;
  applyProductRoute({ focus: true });
}

document.querySelector("#command-open").addEventListener("click", openDialog);
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
  }
});

blueprintDepth.addEventListener("change", () => {
  populateBlueprintScenarios();
  renderBlueprint();
});
libraryDepth.addEventListener("change", populateGallery);
librarySearch.addEventListener("input", populateGallery);
document.querySelector("#guided-start").addEventListener("click", () => {
  applyProjectConfig(guidedFirstRun);
  globalThis.location.hash = productRouteHref("run");
  form.querySelector("#run").focus();
});
blueprintForm.addEventListener("input", (event) => {
  if (event.target !== blueprintDepth) renderBlueprint();
});
blueprintForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const configuration = compileScenarioBlueprint(
      createScenarioBlueprint(blueprintConfiguration()),
      scenarioCatalog,
    );
    applyProjectConfig(configuration);
    await saveActiveConfiguration();
    setBlueprintStatus(
      activeProject
        ? "Blueprint compiled and saved to the active project."
        : "Blueprint compiled into the run workspace.",
      "success",
    );
    globalThis.location.hash = productRouteHref("run");
  } catch (error) {
    setBlueprintStatus(error.message, "error");
  }
});
blueprintExport.addEventListener("click", () => {
  try {
    const blueprint = createScenarioBlueprint(blueprintConfiguration());
    const filename = `${blueprint.configuration.depth}-${blueprint.configuration.scenario}.blueprint.json`;
    textDownload(
      filename,
      serializeScenarioBlueprint(blueprint, scenarioCatalog),
    );
    setBlueprintStatus("Canonical blueprint prepared for download.", "success");
  } catch (error) {
    setBlueprintStatus(error.message, "error");
  }
});

experimentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void runExperiment();
});
experimentExport.addEventListener("click", () => {
  if (!lastExperiment) return;
  textDownload("aether-experiment-results.json", serializeExperiment(lastExperiment));
  experimentStatus.dataset.state = "success";
  experimentStatus.textContent = "Canonical experiment results prepared for download.";
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!projectRepository) return;
  try {
    const details = {
      name: projectName.value,
      description: projectDescription.value,
      config: payload(),
    };
    const project = activeProject
      ? reviseProject(activeProject, details)
      : createProjectDocument(details);
    await storeProject(
      project,
      activeProject ? "Project details saved locally." : "Project created locally.",
    );
  } catch (error) {
    setProjectStatus(error.message, "error");
  }
});

document.querySelector("#project-new").addEventListener("click", async () => {
  activeProject = null;
  rememberActiveProject(null);
  renderProjectEditor();
  renderProjectList();
  if (!cancelActiveOperation()) await workerRequest(worker, "cancel");
  updateState({ type: "cancelled" });
  projectName.focus();
  setProjectStatus("Ready to create a new local project.");
});

projectExport.addEventListener("click", () => {
  if (!activeProject) return;
  const filename = activeProject.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "aether-project";
  textDownload(
    `${filename}.aether-project.json`,
    serializeProject(activeProject),
  );
  setProjectStatus("Canonical project file prepared for download.", "success");
});

projectImport.addEventListener("change", async () => {
  const [file] = projectImport.files;
  if (!file || !projectRepository) return;
  try {
    const imported = parseProjectFile(await file.text());
    const existing = await projectRepository.get(imported.project_id);
    if (
      existing
      && !confirm(`Replace the local project “${existing.name}” with this imported revision?`)
    ) {
      setProjectStatus("Import cancelled.");
      return;
    }
    const stored = await storeProject(imported, "Project imported into this browser.");
    await openProject(stored);
  } catch (error) {
    setProjectStatus(error.message, "error");
  } finally {
    projectImport.value = "";
  }
});

form.addEventListener("change", () => {
  syncBlueprintFromRun();
  void saveActiveConfiguration();
});

async function initializeProjects() {
  try {
    projectRepository = new ProjectRepository();
    await refreshProjects();
    const activeId = recalledActiveProject();
    const recalled = activeId
      ? localProjects.find(({ project_id: projectId }) => projectId === activeId)
      : null;
    if (recalled) await openProject(recalled);
    else setProjectStatus("Local workspace ready.");
  } catch (error) {
    projectRepository = null;
    projectSave.disabled = true;
    projectImport.disabled = true;
    document.querySelector("#project-new").disabled = true;
    setProjectStatus(`Local project storage unavailable: ${error.message}`, "error");
  }
}

populateScenarios();
updateWorkloadEstimate();
populateBlueprintScenarios();
populateGallery();
syncBlueprintFromRun();
populateProductNavigation();
globalThis.addEventListener("hashchange", () => applyProductRoute({ focus: true }));
if (!globalThis.location.hash) {
  globalThis.history.replaceState(null, "", productRouteHref("overview"));
}
applyProductRoute();
void initializeProjects();
