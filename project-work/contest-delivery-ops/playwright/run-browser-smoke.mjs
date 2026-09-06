import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const configPath = path.join(rootDir, "project-work", "contest-delivery-ops", "playwright", "browser-smoke.config.json");
const reportJsonPath = path.join(rootDir, "project-work", "contest-delivery-ops", "playwright", "browser-smoke-report.json");
const reportMdPath = path.join(rootDir, "project-work", "contest-delivery-ops", "playwright", "browser-smoke-report.md");

const frontendBaseUrl = process.env.FRONTEND_BASE_URL ?? "http://127.0.0.1:5176";
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8082";
const username = process.env.SMOKE_USERNAME ?? "admin";
const password = process.env.SMOKE_PASSWORD;
const screenshotTimeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? "45000");
const waitAfterLoadMs = Number(process.env.SMOKE_WAIT_AFTER_LOAD_MS ?? "2500");
const refreshScreenshotIndex = process.env.REFRESH_SCREENSHOT_INDEX !== "0";
const authMode = process.env.SMOKE_AUTH_MODE ?? "api";
const homeDir = os.homedir();

async function main() {
  if (!password) {
    throw new Error("SMOKE_PASSWORD is required for browser smoke runs.");
  }
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const storageStatePath = await resolveStorageStatePath();
  const startedAt = new Date().toISOString();
  const pageResults = [];

  try {
    for (const page of config.pages) {
      const result = await capturePage(page, storageStatePath);
      pageResults.push(result);
    }
  } finally {
    await fs.rm(storageStatePath, { force: true });
  }

  if (refreshScreenshotIndex) {
    await execNodeScript("project-work/contest-delivery-ops/board/write-screenshot-index.js");
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    startedAt,
    frontendBaseUrl,
    apiBaseUrl,
    username,
    passwordProvided: Boolean(password),
    pageResults,
    success: pageResults.every((item) => item.status === "passed"),
  };

  await fs.writeFile(reportJsonPath, JSON.stringify(summary, null, 2), "utf8");
  await fs.writeFile(reportMdPath, buildMarkdownReport(summary), "utf8");

  if (!summary.success) {
    process.exitCode = 1;
  }
}

async function resolveStorageStatePath() {
  if (authMode === "ui") {
    return writeUiLoginStorageState();
  }
  const tokens = await login();
  return writeStorageState(tokens);
}

async function login() {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.code !== "SUCCESS" || !payload?.data?.accessToken) {
    throw new Error(`Login failed for browser smoke: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

async function writeStorageState(tokens) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "labelhub-browser-smoke-"));
  const storageStatePath = path.join(tempDir, "storage-state.json");
  const origin = new URL(frontendBaseUrl).origin;
  const state = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: "labelhub.accessToken", value: tokens.accessToken },
          { name: "labelhub.refreshToken", value: tokens.refreshToken },
        ],
      },
    ],
  };
  await fs.writeFile(storageStatePath, JSON.stringify(state, null, 2), "utf8");
  return storageStatePath;
}

async function writeUiLoginStorageState() {
  const { chromium } = await loadPlaywright();
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "labelhub-browser-smoke-ui-"));
  const storageStatePath = path.join(tempDir, "storage-state.json");

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1080 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(screenshotTimeoutMs);
    await page.goto(new URL("/login", frontendBaseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: screenshotTimeoutMs,
    });

    const submitButton = page.getByRole("button", { name: "进入后台" });
    await submitButton.waitFor({ state: "visible", timeout: screenshotTimeoutMs });
    const usernameInput = page.getByRole("textbox", { name: "用户名" });
    await usernameInput.fill(username);
    await page.getByRole("textbox", { name: "密码" }).fill(password);
    await submitButton.click();
    await page.waitForTimeout(waitAfterLoadMs);
    await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
      timeout: screenshotTimeoutMs,
    });
    await context.storageState({ path: storageStatePath });
    await context.close();
    return storageStatePath;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

async function capturePage(page, storageStatePath) {
  const screenshotPath = path.join(rootDir, page.screenshot);
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  const url = new URL(page.route, frontendBaseUrl).toString();
  const startedAt = Date.now();
  let browser;
  try {
    const { chromium } = await loadPlaywright();
    const executablePath = await resolveChromiumExecutable();
    browser = await chromium.launch({
      executablePath,
      headless: true,
    });
    const context = await browser.newContext({
      storageState: storageStatePath,
      viewport: { width: 1440, height: 1080 },
    });
    const smokePage = await context.newPage();
    smokePage.setDefaultTimeout(screenshotTimeoutMs);
    await smokePage.goto(url, { waitUntil: "domcontentloaded", timeout: screenshotTimeoutMs });
    await smokePage.waitForSelector(page.selector, { timeout: screenshotTimeoutMs });
    await smokePage.waitForTimeout(waitAfterLoadMs);
    await smokePage.screenshot({ path: screenshotPath, fullPage: true });
    await context.close();
    return {
      key: page.key,
      route: page.route,
      selector: page.selector,
      screenshot: page.screenshot,
      status: "passed",
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      key: page.key,
      route: page.route,
      selector: page.selector,
      screenshot: page.screenshot,
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: formatExecError(error),
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

async function resolvePlaywrightModulePath() {
  const candidates = [
    path.join(rootDir, "node_modules", "playwright", "index.mjs"),
    path.join(rootDir, "frontend", "node_modules", "playwright", "index.mjs"),
  ];

  const cachedModulePath = await findLatestCachedPlaywrightModulePath();
  if (cachedModulePath) {
    candidates.push(cachedModulePath);
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "Playwright module not found. Install it locally or warm the npm cache with `npx playwright install chromium` first.",
  );
}

async function loadPlaywright() {
  const modulePath = await resolvePlaywrightModulePath();
  return import(pathToFileURL(modulePath).href);
}

async function findLatestCachedPlaywrightModulePath() {
  const npxRoot = path.join(homeDir, ".npm", "_npx");
  let entries = [];
  try {
    entries = await fs.readdir(npxRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  const cliPaths = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const cliPath = path.join(npxRoot, entry.name, "node_modules", "playwright", "index.mjs");
        try {
          const stats = await fs.stat(cliPath);
          return { cliPath, mtimeMs: stats.mtimeMs };
        } catch {
          return null;
        }
      }),
  );

  const latest = cliPaths
    .filter(Boolean)
    .sort((left, right) => right.mtimeMs - left.mtimeMs)[0];

  return latest?.cliPath ?? null;
}

async function resolveChromiumExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    path.join(
      homeDir,
      "Library",
      "Caches",
      "ms-playwright",
      "chromium-1223",
      "chrome-mac-arm64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing",
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "Chromium executable not found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH or install Playwright Chromium.",
  );
}

async function execNodeScript(relativePath) {
  await execFileAsync("node", [relativePath], {
    cwd: rootDir,
    maxBuffer: 1024 * 1024 * 4,
  });
}

function formatExecError(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout.trim() : "";
  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
  return [error.message, stdout, stderr].filter(Boolean).join("\n");
}

function buildMarkdownReport(summary) {
  const lines = [
    "# Browser Smoke Report",
    "",
    `Generated At: ${summary.generatedAt}`,
    "",
    "## Runtime",
    "",
    `- frontend: \`${summary.frontendBaseUrl}\``,
    `- api: \`${summary.apiBaseUrl}\``,
    `- username: \`${summary.username}\``,
    `- overall: \`${summary.success ? "passed" : "failed"}\``,
    "",
    "## Pages",
    "",
  ];

  for (const item of summary.pageResults) {
    lines.push(`- ${item.key} | ${item.status} | route=\`${item.route}\` | selector=\`${item.selector}\` | screenshot=\`${item.screenshot}\``);
    if (item.error) {
      lines.push(`  error: \`${item.error.replace(/\n+/g, " | ")}\``);
    }
  }

  return `${lines.join("\n")}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
