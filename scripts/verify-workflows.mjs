import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = resolve(root, ".github", "workflows", "ci.yml");
const workflow = await readFile(workflowPath, "utf8");

const requiredFragments = [
  "pull_request:",
  "push:",
  "workflow_dispatch:",
  "permissions:\n  contents: read",
  "cancel-in-progress: true",
  "npm ci --ignore-scripts",
  "npm run verify:ci",
  "npm run verify",
  "runs-on: windows-latest",
  "name: browser studio (chromium)",
  "npx playwright install --with-deps chromium",
  "npm run test:e2e",
  "node-version: 20",
  "- 22",
  "- 24",
];
for (const fragment of requiredFragments) {
  if (!workflow.includes(fragment)) {
    throw new Error(`CI workflow is missing required policy: ${fragment}`);
  }
}

if (/\bpull_request_target\s*:/.test(workflow)) {
  throw new Error("pull_request_target is prohibited for the public quality gate");
}
if (/permissions:[\s\S]*?\bwrite\b/.test(workflow)) {
  throw new Error("write permission is prohibited for the public quality gate");
}

const usesLines = workflow
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("uses:"));
if (usesLines.length === 0) throw new Error("CI workflow has no action references");
for (const line of usesLines) {
  if (!/^uses:\s+[\w.-]+\/[\w.-]+@[0-9a-f]{40}(?:\s+#\s+v?\d[\w.-]*)?$/.test(line)) {
    throw new Error(`action reference is not pinned to a full commit SHA: ${line}`);
  }
}

process.stdout.write(
  `CI workflow policy passed for ${usesLines.length} pinned action reference(s).\n`,
);
