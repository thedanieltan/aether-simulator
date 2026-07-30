export const productRoutes = Object.freeze([
  {
    id: "overview",
    label: "Overview",
    eyebrow: "Orient",
    target: "overview",
    availability: "available",
  },
  {
    id: "design",
    label: "Scenario design",
    eyebrow: "Configure",
    target: "gallery",
    availability: "available",
  },
  {
    id: "run",
    label: "Run workspace",
    eyebrow: "Simulate",
    target: "studio",
    availability: "available",
  },
  {
    id: "explore",
    label: "Explore results",
    eyebrow: "Inspect",
    target: "studio",
    availability: "available",
    view: "graph",
  },
  {
    id: "compare",
    label: "Compare branches",
    eyebrow: "Evaluate",
    target: "studio",
    availability: "after-run",
  },
  {
    id: "export",
    label: "Export artifacts",
    eyebrow: "Reproduce",
    target: "studio",
    availability: "after-run",
    view: "exports",
  },
  {
    id: "boundary",
    label: "Research boundary",
    eyebrow: "Qualify",
    target: "boundaries",
    availability: "available",
  },
]);

const routeById = new Map(productRoutes.map((route) => [route.id, route]));
const viewIds = new Set(["graph", "timeline", "inspector", "lineage", "exports"]);

export function parseProductRoute(hash = "") {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const route = routeById.get(parts[0]) ?? routeById.get("overview");
  const view = route.id === "explore" && viewIds.has(parts[1])
    ? parts[1]
    : route.view;
  return { ...route, view };
}

export function productRouteHref(routeId, view) {
  const route = routeById.get(routeId) ?? routeById.get("overview");
  const suffix = route.id === "explore" && viewIds.has(view) ? `/${view}` : "";
  return `#/${route.id}${suffix}`;
}

export function routeForView(view) {
  return view === "exports"
    ? productRouteHref("export")
    : productRouteHref("explore", view);
}
