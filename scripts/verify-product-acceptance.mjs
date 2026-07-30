import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { productRoutes } from "../app/routes.mjs";
import { scenarioLibrary } from "../src/scenarios/library.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (manifest.version !== "1.0.0-rc.1") {
  throw new Error("product acceptance requires version 1.0.0-rc.1");
}

const requiredRoutes = [
  "overview",
  "projects",
  "design",
  "run",
  "lab",
  "explore",
  "analysis",
  "compare",
  "export",
  "boundary",
];
if (
  JSON.stringify(productRoutes.map(({ id }) => id))
  !== JSON.stringify(requiredRoutes)
) {
  throw new Error("the accepted product route map has drifted");
}
if (scenarioLibrary.entries.length !== 16) {
  throw new Error("the accepted committed scenario library has drifted");
}

for (let number = 6; number <= 16; number += 1) {
  const path = resolve(
    root,
    "docs",
    "work-packages",
    `WP-AES-${String(number).padStart(2, "0")}-ACCEPTANCE.md`,
  );
  await access(path);
}

const requirements = await readFile(
  resolve(root, "docs", "PRODUCT_REQUIREMENTS.md"),
  "utf8",
);
if (/Planned for WP-AES-(?:0[6-9]|1[0-6])/.test(requirements)) {
  throw new Error("an accepted product area is still marked planned");
}
const readme = await readFile(resolve(root, "README.md"), "utf8");
const normalizedReadme = readme.replace(/\s+/g, " ").toLowerCase();
for (const boundary of [
  "research software",
  "not production-ready",
  "No real personal data",
  "Synthetic output does not establish real-world compliance",
]) {
  if (!normalizedReadme.includes(boundary.toLowerCase())) {
    throw new Error(`README claim boundary is missing: ${boundary}`);
  }
}

process.stdout.write(
  "Product acceptance contract passed for 10 routes, 16 scenarios, and WP-AES-06 through WP-AES-16.\n",
);
