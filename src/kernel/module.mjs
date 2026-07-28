export function defineModule({
  moduleId,
  version,
  initialize = () => ({}),
  schedule = () => [],
  reduce = (state) => state,
  afterEvent = () => [],
}) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(moduleId ?? "")) {
    throw new TypeError("moduleId must be a stable lowercase identifier");
  }
  if (typeof version !== "string" || version.length === 0) {
    throw new TypeError("module version is required");
  }
  for (const [name, hook] of Object.entries({ initialize, schedule, reduce, afterEvent })) {
    if (typeof hook !== "function") throw new TypeError(`${name} must be a function`);
  }
  return Object.freeze({ moduleId, version, initialize, schedule, reduce, afterEvent });
}
