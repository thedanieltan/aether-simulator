import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["src", "packages", "scripts", "tests"].map((entry) =>
  resolve(root, entry),
);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : [path];
    }),
  );
  return nested.flat();
}

const files = (await Promise.all(roots.map(sourceFiles)))
  .flat()
  .filter((file) => extname(file) === ".mjs")
  .sort();

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

process.stdout.write(`Syntax checked ${files.length} module(s).\n`);
