const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const {
  gatherBoardData,
  readText,
  resolveGeneratedFile,
  resolveWorkspaceRoots,
} = require("./data");

const PORT = Number(process.env.PORT || 3001);
const ROOT = path.resolve(__dirname, "../../..");
const WORKSPACE_ROOTS = resolveWorkspaceRoots(ROOT);
const BOARD_ROOT = __dirname;
const PUBLIC_DIR = path.join(BOARD_ROOT, "public");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function contentType(filePath) {
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  return "text/html; charset=utf-8";
}

function send(res, statusCode, body, type = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": type });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  if (url.pathname === "/api/board") {
    const data = await gatherBoardData(ROOT);
    return send(res, 200, JSON.stringify(data), "application/json; charset=utf-8");
  }

  if (url.pathname.startsWith("/generated/")) {
    const [, , source, encodedFileName] = url.pathname.split("/");
    const fileName = decodeURIComponent(encodedFileName || "");
    const filePath = resolveGeneratedFile(ROOT, WORKSPACE_ROOTS, source, fileName);
    if (!filePath) {
      return send(res, 404, "Not found");
    }
    return send(res, 200, fs.readFileSync(filePath), contentType(filePath));
  }

  const target = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const filePath = path.join(PUBLIC_DIR, target);
  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath)) {
    return send(
      res,
      404,
      `<!doctype html><title>404</title><pre>${escapeHtml(url.pathname)} not found</pre>`,
      "text/html; charset=utf-8",
    );
  }
  return send(res, 200, fs.readFileSync(filePath), contentType(filePath));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Contest delivery board running at http://127.0.0.1:${PORT}`);
});
