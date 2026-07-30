import { lstat, readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowedTopLevel = new Set([
  ".git",
  ".gitattributes",
  ".github",
  ".hallmark",
  ".gitignore",
  ".npmrc",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  ".npmrc",
  "SECURITY.md",
  "docs",
  "app",
  "examples",
  "fixtures",
  "index.html",
  "package-lock.json",
  "package.json",
  "packages",
  "playwright.config.mjs",
  "public",
  "scenarios",
  "schemas",
  "scripts",
  "src",
  "tests",
  "tokens.css",
  "vite.config.mjs",
  "wrangler.toml",
]);
const required = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "CHANGELOG.md",
  "docs/ARCHITECTURE.md",
  "docs/CI_CD.md",
  "docs/RESEARCH_STATUS.md",
  "docs/PRODUCT_DEPTH_MODEL.md",
  "docs/EXECUTION_REALISM_MODES.md",
  "docs/PRIVACY_AND_SYNTHETIC_DATA.md",
  "docs/PUBLIC_EXPORT_MANIFEST.md",
  "docs/SENSITIVE_CONTENT_AUDIT.md",
  "docs/LICENCE_REVIEW.md",
  "docs/EXCLUDED_PRIVATE_SURFACES.md",
  "docs/DEPENDENCIES.md",
  "docs/MIGRATION_V0.1_TO_V1.md",
  "docs/ENTERPRISE_DEPTH.md",
  "docs/ENTERPRISE_BENCHMARKS.md",
  "docs/ECOSYSTEM_DEPTH.md",
  "docs/ECOSYSTEM_BENCHMARKS.md",
  "docs/ECONOMY_DEPTH.md",
  "docs/ECONOMY_BENCHMARKS.md",
  "docs/PUBLIC_PRODUCT.md",
  "docs/LOCAL_PROJECT_WORKSPACE.md",
  "docs/PRODUCT_REQUIREMENTS.md",
  "docs/INFORMATION_ARCHITECTURE.md",
  "docs/THREAT_MODEL.md",
  "docs/ACCESSIBILITY.md",
  "docs/DEPLOYMENT.md",
  "docs/adr/ADR-0001-world-kernel.md",
  "docs/adr/ADR-0002-enterprise-depth-modules.md",
  "docs/adr/ADR-0003-ecosystem-boundaries.md",
  "docs/adr/ADR-0004-entity-derived-economy.md",
  "docs/adr/ADR-0005-browser-worker-studio.md",
  "docs/work-packages/WP-AES-01-ACCEPTANCE.md",
  "docs/work-packages/WP-AES-02-ACCEPTANCE.md",
  "docs/work-packages/WP-AES-03-ACCEPTANCE.md",
  "docs/work-packages/WP-AES-04-ACCEPTANCE.md",
  "docs/work-packages/WP-AES-05-ACCEPTANCE.md",
  "docs/work-packages/WP-AES-06-ACCEPTANCE.md",
  "docs/work-packages/WP-AES-07-ACCEPTANCE.md",
  ".github/workflows/ci.yml",
  ".github/dependabot.yml",
];
const allowedGithubFiles = new Set([
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
]);
const blockedNames = [
  /^\.env(?:\.|$)/i,
  /\.(?:pem|key|p12|pfx|crt|cer|db|sqlite|dump|log)$/i,
  /authorization.*receipt/i,
  /governance.*ledger/i,
  /review.*pack/i,
];
const forbiddenWords = [
  Buffer.from("Y29tb3M=", "base64").toString("utf8"),
  Buffer.from("c2Vz", "base64").toString("utf8"),
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (
      entry.name === ".git" ||
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".wrangler" ||
      entry.name === "playwright-report" ||
      entry.name === "test-results"
    ) continue;
    const path = resolve(directory, entry.name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`symbolic link is not allowed: ${path}`);
    if (entry.isDirectory()) results.push(...(await walk(path)));
    else results.push(path);
  }
  return results;
}

const topLevel = await readdir(root);
for (const entry of topLevel) {
  if (
    entry === "node_modules" ||
    entry === "dist" ||
    entry === ".wrangler" ||
    entry === "playwright-report" ||
    entry === "test-results"
  ) continue;
  if (!allowedTopLevel.has(entry)) throw new Error(`unexpected top-level entry: ${entry}`);
}

const files = await walk(root);
const relativeFiles = new Set(files.map((file) => relative(root, file).split(sep).join("/")));
for (const expected of required) {
  if (!relativeFiles.has(expected)) throw new Error(`required file missing: ${expected}`);
}
for (const file of relativeFiles) {
  if (file.startsWith(".github/") && !allowedGithubFiles.has(file)) {
    throw new Error(`unexpected GitHub configuration: ${file}`);
  }
}

for (const file of files) {
  const rel = relative(root, file).split(sep).join("/");
  if (blockedNames.some((pattern) => pattern.test(rel))) {
    throw new Error(`blocked filename: ${rel}`);
  }
  const content = await readFile(file, "utf8");
  for (const word of forbiddenWords) {
    if (new RegExp(`\\b${word}\\b`, "i").test(content)) {
      throw new Error(`prohibited product reference in ${rel}`);
    }
  }
}

process.stdout.write(`Public-tree policy passed for ${files.length} file(s).\n`);
