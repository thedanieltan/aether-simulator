import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
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

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path);
  }
  return files;
}

async function snapshot() {
  const directories = [
    resolve(root, "fixtures"),
    resolve(root, "scenarios", "interventions"),
  ];
  const files = (await Promise.all(directories.map(filesUnder))).flat().sort();
  return new Map(
    await Promise.all(
      files.map(async (path) => [
        relative(root, path).replaceAll("\\", "/"),
        await readFile(path, "utf8"),
      ]),
    ),
  );
}

const before = await snapshot();
run(process.execPath, ["scripts/demo.mjs"]);
run(process.execPath, ["scripts/generate-enterprise-fixtures.mjs"]);
run(process.execPath, ["scripts/generate-ecosystem-fixtures.mjs"]);
run(process.execPath, ["scripts/generate-economy-fixtures.mjs"]);
const after = await snapshot();
const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
const changed = paths.filter((path) => before.get(path) !== after.get(path));
if (changed.length > 0) {
  throw new Error(`Deterministic fixture drift:\n${changed.join("\n")}`);
}

process.stdout.write("Deterministic fixture regeneration produced no drift.\n");
