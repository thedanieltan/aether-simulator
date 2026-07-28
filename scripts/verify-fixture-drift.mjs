import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
    );
  }
  return result.stdout;
}

run(process.execPath, ["scripts/demo.mjs"]);
run(process.execPath, ["scripts/generate-enterprise-fixtures.mjs"]);

const status = run("git", [
  "status",
  "--porcelain",
  "--untracked-files=all",
  "--",
  "fixtures",
]);
if (status.trim()) {
  throw new Error(
    `Committed fixtures do not match deterministic regeneration:\n${status.trim()}`,
  );
}

process.stdout.write("Deterministic fixture regeneration produced no drift.\n");
