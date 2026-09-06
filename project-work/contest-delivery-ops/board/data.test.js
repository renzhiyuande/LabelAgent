const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  buildArtifactInventory,
  buildScreenshotIndexMarkdown,
  resolveWorkspaceRoots,
} = require("./data");

function createFile(filePath, content = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

test("resolveWorkspaceRoots includes the shared root for nested worktrees", () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "board-data-"));
  const sharedRoot = path.join(sandbox, "repo");
  const currentRoot = path.join(sharedRoot, "worktrees", "dashboard-and-qa");
  createFile(path.join(sharedRoot, ".git"), "gitdir: ../.git/worktrees/dashboard-and-qa");
  fs.mkdirSync(currentRoot, { recursive: true });

  assert.deepEqual(resolveWorkspaceRoots(currentRoot), [currentRoot, sharedRoot]);
});

test("artifact inventory falls back to shared submission docs and prefers current screenshots", async () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "board-artifacts-"));
  const sharedRoot = path.join(sandbox, "repo");
  const currentRoot = path.join(sharedRoot, "worktrees", "dashboard-and-qa");
  createFile(path.join(sharedRoot, ".git"), "gitdir: ../.git/worktrees/dashboard-and-qa");
  fs.mkdirSync(currentRoot, { recursive: true });

  createFile(path.join(sharedRoot, "submission", "README.md"), "# shared readme");
  createFile(path.join(sharedRoot, "project-docs", "static", "img", "generated", "shared-shot.png"), "shared");
  createFile(path.join(currentRoot, "project-docs", "static", "img", "generated", "current-shot.png"), "current");
  createFile(path.join(currentRoot, "project-docs", "static", "img", "generated", "shared-shot.png"), "preferred-current");

  const inventory = await buildArtifactInventory(currentRoot, [currentRoot, sharedRoot]);
  const readme = inventory.docs.find((doc) => doc.name === "README.md");
  const sharedShot = inventory.screenshots.find((shot) => shot.name === "shared-shot.png");

  assert.equal(readme.exists, true);
  assert.equal(readme.source, "shared");
  assert.equal(sharedShot.source, "current");
  assert.equal(inventory.screenshots.length, 2);
});

test("screenshot index markdown includes sources and paths", () => {
  const markdown = buildScreenshotIndexMarkdown({
    generatedAt: "2026-06-08T00:00:00.000Z",
    workspaceRoots: [
      { label: "current", path: "/tmp/current" },
      { label: "shared", path: "/tmp/shared" },
    ],
    screenshots: [
      {
        name: "owner-dashboard-home.png",
        source: "current",
        updatedAt: "2026-06-08T01:00:00.000Z",
        sizeKb: 80,
        displayPath: "project-docs/static/img/generated/owner-dashboard-home.png",
      },
    ],
    docs: [
      {
        name: "README.md",
        exists: true,
        source: "shared",
        displayPath: "/tmp/shared/submission/README.md",
      },
      {
        name: "SMOKE_REPORT.md",
        exists: false,
      },
    ],
  });

  assert.match(markdown, /owner-dashboard-home\.png \| source=current/);
  assert.match(markdown, /README\.md \| source=shared/);
  assert.match(markdown, /SMOKE_REPORT\.md \| MISSING/);
});
