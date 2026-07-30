import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageManifest = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
const lockManifest = JSON.parse(
  await readFile(resolve(root, "package-lock.json"), "utf8"),
);

if (lockManifest.lockfileVersion !== 3) {
  throw new Error("package-lock.json must use lockfileVersion 3");
}
if (lockManifest.name !== packageManifest.name) {
  throw new Error("package-lock.json does not match the package name");
}
if (lockManifest.version !== packageManifest.version) {
  throw new Error("package-lock.json does not match the package version");
}
if (!lockManifest.packages?.[""]) {
  throw new Error("package-lock.json is missing its root package entry");
}

process.stdout.write("Locked npm manifest policy passed (lockfileVersion 3).\n");
