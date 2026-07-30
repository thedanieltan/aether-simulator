import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");
const required = ["index.html", "_headers", "_redirects"];
for (const name of required) {
  const path = resolve(dist, name);
  if (!(await stat(path)).isFile()) throw new Error(`static build missing ${name}`);
}
const html = await readFile(resolve(dist, "index.html"), "utf8");
if (!html.includes("Aether Scenario Studio")) {
  throw new Error("static build does not contain the studio title");
}
if (/https?:\/\//i.test(html)) {
  throw new Error("static build HTML contains an external runtime URL");
}
const headers = await readFile(resolve(dist, "_headers"), "utf8");
if (/unsafe-eval/.test(headers)) {
  throw new Error("content policy must prohibit dynamic evaluation");
}
const assets = await readdir(resolve(dist, "assets"));
if (!assets.some((name) => name.endsWith(".js"))) {
  throw new Error("static build contains no JavaScript asset");
}
if (!assets.some((name) => name.endsWith(".css"))) {
  throw new Error("static build contains no stylesheet asset");
}
process.stdout.write(`Static studio build verified across ${assets.length} asset(s).\n`);
