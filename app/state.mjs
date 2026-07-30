export const initialStudioState = Object.freeze({
  phase: "idle",
  activeView: "graph",
  session: null,
  error: null,
  selectedEventId: null,
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
      return { ...initialStudioState, activeView: state.activeView, phase: "cancelled" };
    case "view-selected":
      return { ...state, activeView: action.view };
    case "event-selected":
      return { ...state, selectedEventId: action.eventId, activeView: "inspector" };
    default:
      return state;
  }
}

export function commandEnabled(state, command) {
  if (command === "run") return !["running", "replaying", "branching"].includes(state.phase);
  if (command === "cancel") return state.phase !== "idle";
  if (!state.session) return false;
  if (command === "resume") return state.phase === "paused" || Boolean(state.session.checkpoint);
  if (command === "compare") return Boolean(state.session.comparison);
  return true;
}
