import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectDocument,
  parseProjectFile,
  reviseProject,
  serializeProject,
  validateProjectDocument,
} from "../app/project-store.mjs";

const config = {
  depth: "enterprise",
  scenario: "retail-intervention-baseline",
  seed: "project-test-seed",
  scale: 1,
  duration: 80,
  intervention: 12,
};

test("project documents validate and serialize byte-identically", () => {
  const project = createProjectDocument({
    projectId: "project-00000000-0000-4000-8000-000000000001",
    name: "Fictional retailer",
    description: "A local research project.",
    config,
  });
  const first = serializeProject(project);
  const second = serializeProject(parseProjectFile(first));
  assert.equal(first, second);
  assert.equal(parseProjectFile(first).contract_version, "aether-project.v1");
});

test("project revisions preserve identity and validate run digests", () => {
  const project = createProjectDocument({
    projectId: "project-00000000-0000-4000-8000-000000000002",
    name: "Baseline",
    config,
  });
  const revised = reviseProject(project, {
    name: "Intervention baseline",
    last_run: {
      digest: "a".repeat(64),
      completed_revision: 2,
    },
  });
  assert.equal(revised.project_id, project.project_id);
  assert.equal(revised.revision, 2);
  assert.equal(revised.last_run.digest, "a".repeat(64));
});

test("project validation rejects unsupported, unsafe, and malformed input", () => {
  assert.throws(
    () => validateProjectDocument({ contract_version: "unknown" }),
    /unsupported project contract/,
  );
  assert.throws(
    () => createProjectDocument({
      projectId: "invalid id",
      name: "Invalid",
      config,
    }),
    /invalid format/,
  );
  assert.throws(
    () => createProjectDocument({
      projectId: "project-invalid-scale",
      name: "Invalid",
      config: { ...config, scale: 0 },
    }),
    /scale/,
  );
  assert.throws(() => parseProjectFile("{"), /not valid JSON/);
});
