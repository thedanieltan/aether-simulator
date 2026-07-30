export const initialStudioState = Object.freeze({
  phase: "idle",
  activeRoute: "overview",
  activeView: "graph",
  session: null,
  error: null,
  selectedEventId: null,
  selectedEntityId: null,
  selectedZoomEnterpriseId: null,
  selectedZoomCitizenId: null,
});

export function reduceStudioState(state, action) {
  switch (action.type) {
    case "command-started":
      return { ...state, phase: action.command, error: null };
    case "command-completed":
      return {
        ...state,
        phase: action.phase ?? "complete",
        session: action.session ?? state.session,
        error: null,
      };
    case "command-failed":
      return { ...state, phase: "error", error: action.error };
    case "cancelled":
      return {
        ...initialStudioState,
        activeRoute: state.activeRoute,
        activeView: state.activeView,
        phase: "cancelled",
      };
    case "route-selected":
      return {
        ...state,
        activeRoute: action.route,
        activeView: action.view ?? state.activeView,
      };
    case "view-selected":
      return { ...state, activeView: action.view };
    case "event-selected":
      return { ...state, selectedEventId: action.eventId, activeView: "inspector" };
    case "entity-selected":
      return { ...state, selectedEntityId: action.entityId, activeView: "entities" };
    case "zoom-world-selected":
      return {
        ...state,
        selectedZoomEnterpriseId: null,
        selectedZoomCitizenId: null,
        activeView: "zoom",
      };
    case "zoom-enterprise-selected":
      return {
        ...state,
        selectedZoomEnterpriseId: action.enterpriseId,
        selectedZoomCitizenId: null,
        activeView: "zoom",
      };
    case "zoom-citizen-selected":
      return {
        ...state,
        selectedZoomCitizenId: action.citizenId,
        activeView: "zoom",
      };
    default:
      return state;
  }
}

export function commandEnabled(state, command) {
  if (command === "run") {
    return ![
      "running",
      "restoring",
      "replaying",
      "branching",
      "comparing",
      "checkpointing",
      "pausing",
      "resuming",
      "cancelling",
      "experimenting",
    ].includes(state.phase);
  }
  if (command === "cancel") return state.phase !== "idle";
  if (!state.session) return false;
  if (command === "resume") return state.phase === "paused" || Boolean(state.session.checkpoint);
  if (command === "compare") return Boolean(state.session.comparison);
  return true;
}
