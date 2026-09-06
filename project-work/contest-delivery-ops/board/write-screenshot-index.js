const fs = require("node:fs");
const path = require("node:path");
const {
  buildScreenshotIndexMarkdown,
  gatherBoardData,
} = require("./data");

async function main() {
  const root = path.resolve(__dirname, "../../..");
  const boardData = await gatherBoardData(root);
  const targetPath = path.join(root, "project-work", "contest-delivery-ops", "SCREENSHOT_INDEX.md");
  fs.writeFileSync(targetPath, buildScreenshotIndexMarkdown(boardData), "utf8");
  console.log(`Wrote ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
