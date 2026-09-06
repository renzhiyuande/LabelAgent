import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// Use tsup output to find which files have these errors
const SRC = path.resolve("packages/low-code-engine/src");
let count = 0;

function walk(dir, depthLimit = null) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== "dist") {
      walk(f, depthLimit);
    } else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      const rel = path.relative(SRC, f);
      const depth = rel.split(/[/\\]/).length - 1; // exclude filename
      if (depthLimit !== null && depth !== depthLimit) continue;

      let c = fs.readFileSync(f, "utf-8");
      const before = c;

      // For depth-2 files (src/dir/file.ts): ../../../prefix → ../../prefix
      c = c.replace(/from ['"]\.\.\/\.\.\/\.\.\/(components\/(?:ui|layout)\/)/g, (m) =>
        m.replace("../../../", "../../"),
      );

      if (c !== before) {
        fs.writeFileSync(f, c, "utf-8");
        count++;
        console.log(rel);
      }
    }
  }
}

console.log("Fixing depth-2 files...");
walk(SRC, 2);
console.log(`\nFixed ${count} files`);
