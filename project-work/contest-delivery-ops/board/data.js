const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { execSync } = require("node:child_process");

const DOC_OUTPUTS = [
  "README.md",
  "REQUIREMENT_MATRIX.md",
  "VERIFICATION_STATUS.md",
  "SMOKE_REPORT.md",
  "SCREENSHOT_INDEX.md",
  "API_DOCS.md",
  "DEMO_ENVIRONMENT.md",
  "DEMO_VIDEO.md",
];

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function listFromSection(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${heading}[\\s\\S]*?(?=\\n## |$)`));
  if (!match) return [];
  return match[0]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-0-9]/.test(line))
    .map((line) => line.replace(/^[-0-9. ]+/, "").trim())
    .filter(Boolean);
}

function firstMeaningfulLine(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${heading}[\\s\\S]*?(?=\\n## |$)`));
  if (!match) return "";
  return (
    match[0]
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !/^[-0-9.]/.test(line)) || ""
  );
}

function parseChecklistSections(markdown) {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((chunk) => {
      const [titleLine, ...rest] = chunk.split("\n");
      const items = rest
        .map((line) => line.trim())
        .filter((line) => /^- \[[ x]\]/.test(line))
        .map((line) => ({
          done: line.includes("[x]"),
          label: line.replace(/^- \[[ x]\]\s*/, "").trim(),
        }));
      return { title: titleLine.trim(), items };
    })
    .filter((section) => section.items.length > 0);
}

function markdownPreview(markdown, maxLines = 10) {
  return markdown
    .split("\n")
    .filter((line) => line.trim())
    .slice(0, maxLines)
    .join("\n");
}

function runGit(command, cwd) {
  try {
    return execSync(command, {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function resolveWorkspaceRoots(currentRoot) {
  const roots = [currentRoot];
  const parent = path.dirname(currentRoot);
  if (path.basename(parent) !== "worktrees") {
    return roots;
  }
  const sharedRoot = path.dirname(parent);
  if (sharedRoot !== currentRoot && fs.existsSync(path.join(sharedRoot, ".git"))) {
    roots.push(sharedRoot);
  }
  return roots;
}

function rootLabelFor(root, currentRoot) {
  return root === currentRoot ? "current" : "shared";
}

function relativeDisplayPath(currentRoot, filePath) {
  const relativePath = path.relative(currentRoot, filePath);
  return relativePath && !relativePath.startsWith("..") ? relativePath : filePath;
}

function readFirstExistingFile(workspaceRoots, relativePath) {
  for (const root of workspaceRoots) {
    const filePath = path.join(root, relativePath);
    if (fs.existsSync(filePath)) {
      return {
        root,
        filePath,
        text: fs.readFileSync(filePath, "utf8"),
      };
    }
  }
  return {
    root: null,
    filePath: null,
    text: "",
  };
}

async function collectScreenshots(currentRoot, workspaceRoots) {
  const screenshotMap = new Map();

  for (const root of workspaceRoots) {
    const generatedDir = path.join(root, "project-docs", "static", "img", "generated");
    if (!fs.existsSync(generatedDir)) {
      continue;
    }
    const label = rootLabelFor(root, currentRoot);
    const names = await fsp.readdir(generatedDir);
    for (const name of names) {
      if (!/\.(png|jpg|jpeg|webp)$/i.test(name) || screenshotMap.has(name)) {
        continue;
      }
      const filePath = path.join(generatedDir, name);
      const stat = fs.statSync(filePath);
      screenshotMap.set(name, {
        name,
        url: `/generated/${label}/${encodeURIComponent(name)}`,
        updatedAt: stat.mtime.toISOString(),
        sizeKb: Math.round(stat.size / 1024),
        source: label,
        filePath,
        displayPath: relativeDisplayPath(currentRoot, filePath),
      });
    }
  }

  return [...screenshotMap.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function collectDocs(currentRoot, workspaceRoots) {
  return DOC_OUTPUTS.map((name) => {
    const match = workspaceRoots
      .map((root) => {
        const filePath = path.join(root, "submission", name);
        return fs.existsSync(filePath)
          ? {
              root,
              filePath,
            }
          : null;
      })
      .find(Boolean);

    if (!match) {
      return {
        name,
        exists: false,
        source: null,
        displayPath: null,
      };
    }

    return {
      name,
      exists: true,
      source: rootLabelFor(match.root, currentRoot),
      displayPath: relativeDisplayPath(currentRoot, match.filePath),
    };
  });
}

function buildScreenshotIndexMarkdown(boardData) {
  const lines = [
    "# Screenshot Index",
    "",
    `Generated At: ${boardData.generatedAt}`,
    "",
    "## Workspace Roots",
    "",
    ...boardData.workspaceRoots.map((root) => `- ${root.label}: \`${root.path}\``),
    "",
    "## Screenshots",
    "",
  ];

  if (!boardData.screenshots.length) {
    lines.push("- No screenshots saved yet.");
  } else {
    for (const screenshot of boardData.screenshots) {
      lines.push(
        `- ${screenshot.name} | source=${screenshot.source} | updated=${screenshot.updatedAt} | size=${screenshot.sizeKb}KB | path=\`${screenshot.displayPath}\``,
      );
    }
  }

  lines.push("", "## Submission Outputs", "");

  for (const doc of boardData.docs) {
    if (doc.exists) {
      lines.push(`- ${doc.name} | source=${doc.source} | path=\`${doc.displayPath}\``);
    } else {
      lines.push(`- ${doc.name} | MISSING`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

async function buildArtifactInventory(currentRoot, workspaceRoots) {
  const screenshots = await collectScreenshots(currentRoot, workspaceRoots);
  const docs = collectDocs(currentRoot, workspaceRoots);
  return { screenshots, docs };
}

async function gatherBoardData(currentRoot) {
  const workspaceRoots = resolveWorkspaceRoots(currentRoot);
  const statusFile = readFirstExistingFile([currentRoot], path.join("project-work", "contest-delivery-ops", "STATUS.md"));
  const tasksFile = readFirstExistingFile([currentRoot], path.join("project-work", "contest-delivery-ops", "TASKS.md"));
  const worklogFile = readFirstExistingFile([currentRoot], path.join("project-work", "contest-delivery-ops", "WORKLOG.md"));
  const reactFile = readFirstExistingFile([currentRoot], path.join("project-work", "contest-delivery-ops", "REACT_LOOP.md"));
  const statusMd = statusFile.text;
  const tasksMd = tasksFile.text;
  const worklogMd = worklogFile.text;
  const reactMd = reactFile.text;
  const { screenshots, docs } = await buildArtifactInventory(currentRoot, workspaceRoots);

  const currentBranch = runGit("git branch --show-current", currentRoot);
  const branchList = runGit("git branch --list 'codex/*'", currentRoot)
    .split("\n")
    .map((line) => line.replace(/^[*+ ]+/, "").trim())
    .filter(Boolean);
  const dirtyFiles = runGit("git status --short", currentRoot)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const checklistSections = parseChecklistSections(tasksMd);
  const validation = checklistSections.find((section) => section.title === "Validation Gates") || {
    title: "Validation Gates",
    items: [],
  };

  return {
    generatedAt: new Date().toISOString(),
    workspaceRoots: workspaceRoots.map((root) => ({
      label: rootLabelFor(root, currentRoot),
      path: root,
    })),
    currentBranch,
    branchList,
    dirtyFiles,
    phase: firstMeaningfulLine(statusMd, "Current Priority"),
    findings: listFromSection(statusMd, "Current Findings"),
    blockers: listFromSection(statusMd, "Known Blockers / Risks"),
    nextActions: listFromSection(statusMd, "Next Actions"),
    taskSections: checklistSections.filter((section) => section.title !== "Validation Gates"),
    validation,
    screenshots,
    docs,
    worklogPreview: markdownPreview(worklogMd, 18),
    reactPreview: markdownPreview(reactMd, 18),
    statusPreview: markdownPreview(statusMd, 18),
  };
}

function resolveGeneratedFile(currentRoot, workspaceRoots, source, fileName) {
  const targetRoot =
    source === "shared"
      ? workspaceRoots.find((root) => root !== currentRoot)
      : workspaceRoots.find((root) => root === currentRoot);
  if (!targetRoot) {
    return null;
  }
  const filePath = path.join(targetRoot, "project-docs", "static", "img", "generated", fileName);
  if (!filePath.startsWith(path.join(targetRoot, "project-docs", "static", "img", "generated"))) {
    return null;
  }
  return fs.existsSync(filePath) ? filePath : null;
}

module.exports = {
  buildArtifactInventory,
  buildScreenshotIndexMarkdown,
  gatherBoardData,
  readText,
  resolveGeneratedFile,
  resolveWorkspaceRoots,
};
