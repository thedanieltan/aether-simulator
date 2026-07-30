export const PROJECT_CONTRACT = "aether-project.v1";
export const PROJECT_DATABASE = "aether-enterprise-simulator";
export const PROJECT_STORE = "projects";
export const ACTIVE_PROJECT_KEY = "aether.active-project.v1";
export const MAX_PROJECT_FILE_BYTES = 20 * 1024 * 1024;

const depths = new Set(["enterprise", "ecosystem", "economy"]);

function plainObject(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function cleanText(value, field, maximum) {
  if (typeof value !== "string") throw new TypeError(`${field} must be text`);
  const cleaned = value.trim();
  if (!cleaned) throw new TypeError(`${field} is required`);
  if (cleaned.length > maximum) {
    throw new TypeError(`${field} must contain at most ${maximum} characters`);
  }
  return cleaned;
}

export function validateProjectConfig(config) {
  if (!plainObject(config)) throw new TypeError("project config must be an object");
  if (!depths.has(config.depth)) throw new TypeError("project depth is unsupported");
  const scenario = cleanText(config.scenario, "scenario", 120);
  const seed = cleanText(config.seed, "seed", 160);
  const scale = Number(config.scale);
  const duration = Number(config.duration);
  const intervention = Number(config.intervention);
  if (!Number.isSafeInteger(scale) || scale < 1 || scale > 10_000) {
    throw new TypeError("scale must be an integer from 1 to 10000");
  }
  if (!Number.isSafeInteger(duration) || duration < 1 || duration > 1_000_000) {
    throw new TypeError("duration must be an integer from 1 to 1000000");
  }
  if (!Number.isFinite(intervention)) {
    throw new TypeError("intervention must be a finite number");
  }
  return {
    depth: config.depth,
    scenario,
    seed,
    scale,
    duration,
    intervention,
  };
}

export function createProjectDocument({
  projectId = `project-${crypto.randomUUID()}`,
  name,
  description = "",
  config,
}) {
  return validateProjectDocument({
    contract_version: PROJECT_CONTRACT,
    project_id: projectId,
    name,
    description,
    revision: 1,
    config,
    last_run: null,
  });
}

export function validateProjectDocument(value) {
  if (!plainObject(value)) throw new TypeError("project must be an object");
  if (value.contract_version !== PROJECT_CONTRACT) {
    throw new TypeError(`unsupported project contract: ${value.contract_version}`);
  }
  const projectId = cleanText(value.project_id, "project id", 100);
  if (!/^project-[a-zA-Z0-9-]+$/.test(projectId)) {
    throw new TypeError("project id has an invalid format");
  }
  const revision = Number(value.revision);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new TypeError("project revision must be a positive integer");
  }
  let lastRun = null;
  if (value.last_run !== null && value.last_run !== undefined) {
    if (!plainObject(value.last_run)) throw new TypeError("last run must be an object");
    const digest = cleanText(value.last_run.digest, "last run digest", 128);
    if (!/^[a-f0-9]{64}$/i.test(digest)) {
      throw new TypeError("last run digest must be a SHA-256 value");
    }
    const completedRevision = Number(value.last_run.completed_revision);
    if (!Number.isSafeInteger(completedRevision) || completedRevision < 1) {
      throw new TypeError("last run revision must be a positive integer");
    }
    lastRun = { digest: digest.toLowerCase(), completed_revision: completedRevision };
  }
  const description = typeof value.description === "string"
    ? value.description.trim()
    : "";
  if (description.length > 500) {
    throw new TypeError("description must contain at most 500 characters");
  }
  return {
    contract_version: PROJECT_CONTRACT,
    project_id: projectId,
    name: cleanText(value.name, "project name", 100),
    description,
    revision,
    config: validateProjectConfig(value.config),
    last_run: lastRun,
  };
}

export function reviseProject(project, changes = {}) {
  const current = validateProjectDocument(project);
  return validateProjectDocument({
    ...current,
    ...changes,
    project_id: current.project_id,
    contract_version: PROJECT_CONTRACT,
    revision: current.revision + 1,
  });
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (plainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, sortValue(value[key])]),
    );
  }
  return value;
}

export function serializeProject(project) {
  return `${JSON.stringify(sortValue(validateProjectDocument(project)), null, 2)}\n`;
}

export function parseProjectFile(text) {
  if (typeof text !== "string") throw new TypeError("project file must be text");
  if (new TextEncoder().encode(text).byteLength > MAX_PROJECT_FILE_BYTES) {
    throw new TypeError("project file exceeds the 20 MB local limit");
  }
  try {
    return validateProjectDocument(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw new TypeError("project file is not valid JSON");
    throw error;
  }
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

export class ProjectRepository {
  #indexedDB;
  #databasePromise;

  constructor(indexedDB = globalThis.indexedDB) {
    if (!indexedDB) throw new TypeError("browser project storage is unavailable");
    this.#indexedDB = indexedDB;
    this.#databasePromise = null;
  }

  async #database() {
    if (!this.#databasePromise) {
      this.#databasePromise = new Promise((resolve, reject) => {
        const request = this.#indexedDB.open(PROJECT_DATABASE, 1);
        request.addEventListener("upgradeneeded", () => {
          if (!request.result.objectStoreNames.contains(PROJECT_STORE)) {
            request.result.createObjectStore(PROJECT_STORE, { keyPath: "project_id" });
          }
        });
        request.addEventListener("success", () => resolve(request.result), { once: true });
        request.addEventListener("error", () => reject(request.error), { once: true });
        request.addEventListener("blocked", () => {
          reject(new Error("project storage upgrade is blocked by another tab"));
        }, { once: true });
      });
    }
    return this.#databasePromise;
  }

  async list() {
    const database = await this.#database();
    const transaction = database.transaction(PROJECT_STORE, "readonly");
    const projects = await requestResult(transaction.objectStore(PROJECT_STORE).getAll());
    return projects
      .map(validateProjectDocument)
      .sort((left, right) =>
        left.name.localeCompare(right.name) || left.project_id.localeCompare(right.project_id));
  }

  async get(projectId) {
    const database = await this.#database();
    const transaction = database.transaction(PROJECT_STORE, "readonly");
    const project = await requestResult(
      transaction.objectStore(PROJECT_STORE).get(projectId),
    );
    return project ? validateProjectDocument(project) : null;
  }

  async put(project) {
    const validated = validateProjectDocument(project);
    const database = await this.#database();
    const transaction = database.transaction(PROJECT_STORE, "readwrite");
    await requestResult(transaction.objectStore(PROJECT_STORE).put(validated));
    return validated;
  }

  async delete(projectId) {
    const database = await this.#database();
    const transaction = database.transaction(PROJECT_STORE, "readwrite");
    await requestResult(transaction.objectStore(PROJECT_STORE).delete(projectId));
  }
}
