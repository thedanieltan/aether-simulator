import assert from "node:assert/strict";
import test from "node:test";
import {
  parseProductRoute,
  productRouteHref,
  productRoutes,
  routeForView,
} from "../app/routes.mjs";

test("product routes have unique stable identifiers and resolvable targets", () => {
  assert.equal(new Set(productRoutes.map(({ id }) => id)).size, productRoutes.length);
  assert.deepEqual(
    productRoutes.map(({ id }) => id),
    ["overview", "projects", "design", "run", "lab", "explore", "analysis", "compare", "export", "boundary"],
  );
  for (const route of productRoutes) {
    assert.equal(parseProductRoute(productRouteHref(route.id)).id, route.id);
  }
});

test("route parser supports result deep links and fails safely to overview", () => {
  assert.deepEqual(
    { id: parseProductRoute("#/explore/timeline").id, view: parseProductRoute("#/explore/timeline").view },
    { id: "explore", view: "timeline" },
  );
  assert.equal(parseProductRoute("#/explore/not-a-view").view, "graph");
  assert.equal(parseProductRoute("#/explore/entities").view, "entities");
  assert.equal(parseProductRoute("#/explore/zoom").view, "zoom");
  assert.equal(parseProductRoute("#/unknown").id, "overview");
  assert.equal(routeForView("lineage"), "#/explore/lineage");
  assert.equal(routeForView("zoom"), "#/explore/zoom");
  assert.equal(routeForView("analysis"), "#/analysis");
  assert.equal(routeForView("exports"), "#/export");
});
