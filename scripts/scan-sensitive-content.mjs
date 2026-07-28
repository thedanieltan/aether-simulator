import { readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rules = new Map([
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ["cloud access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["provider secret key", /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/],
  ["bearer token", /\bbearer\s+[A-Za-z0-9._~+/-]{16,}/i],
  [
    "assigned secret",
    /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|password|cookie)\s*[:=]\s*["'][^"']{8,}["']/i,
  ],
  [
    "database connection",
    /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"']+/i,
  ],
  ["webhook", /https:\/\/[^\s"']*(?:webhook|hooks\.)[^\s"']*/i],
  ["email address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  [
    "IP address",
    /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/,
  ],
  [
    "private network address",
    /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/,
  ],
  ["absolute Windows path", /\b[A-Z]:\\(?:Users|Projects|home|var|tmp)\\/i],
  ["absolute Unix path", /(?:^|[\s"'`])\/(?:home|Users|var|tmp|opt|srv)\/[^\s"'`]+/m],
  ["internal hostname", /\b[a-z0-9.-]+\.(?:local|internal|corp)\b/i],
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await walk(path)));
    else output.push(path);
  }
  return output;
}

const findings = [];
for (const file of await walk(root)) {
  const content = await readFile(file, "utf8");
  for (const [label, pattern] of rules) {
    if (pattern.test(content)) findings.push(`${relative(root, file)}: ${label}`);
  }
}

if (findings.length > 0) {
  throw new Error(`Sensitive-content scan failed:\n${findings.join("\n")}`);
}
process.stdout.write("Sensitive-content scan passed with zero findings.\n");
