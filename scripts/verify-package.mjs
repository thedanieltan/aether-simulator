import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmEntryPoint = process.env.npm_execpath;
if (!npmEntryPoint) {
  throw new Error("verify-package must be run through npm");
}
const result = spawnSync(
  process.execPath,
  [npmEntryPoint, "pack", "--dry-run", "--json"],
  {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  },
);
if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error([result.stdout, result.stderr].filter(Boolean).join("\n"));
}

const [manifest] = JSON.parse(result.stdout);
const files = new Set(
  manifest.files.map(({ path }) => path.replaceAll("\\", "/")),
);
const required = [
  "LICENSE",
  "README.md",
  "package.json",
  "src/cli.mjs",
  "src/index.mjs",
  "src/analysis/workspace.mjs",
  "src/entities/semantic-zoom.mjs",
  "src/scenarios/library.mjs",
  "app/runtime-control.mjs",
  "index.html",
  "docs/PRODUCT_REQUIREMENTS.md",
  "docs/PRIVACY_AND_SYNTHETIC_DATA.md",
  "schemas/kernel/aether-world.v1.schema.json",
  "scenarios/kernel-baseline.json",
];
for (const path of required) {
  if (!files.has(path)) throw new Error(`package is missing required file: ${path}`);
}

const forbiddenPrefixes = [
  ".git/",
  ".github/",
  ".wrangler/",
  "dist/",
  "playwright-report/",
  "test-results/",
  "tests/",
  "scripts/",
  "node_modules/",
];
for (const path of files) {
  if (forbiddenPrefixes.some((prefix) => path.startsWith(prefix))) {
    throw new Error(`package contains repository-only file: ${path}`);
  }
  if (
    /^\.env(?:\.|$)/i.test(path) ||
    /\.(?:log|tmp|db|sqlite|dump)$/i.test(path)
  ) {
    throw new Error(`package contains blocked file: ${path}`);
  }
}

process.stdout.write(
  `Package boundary passed for ${manifest.entryCount} file(s), ${manifest.unpackedSize} unpacked byte(s).\n`,
);
