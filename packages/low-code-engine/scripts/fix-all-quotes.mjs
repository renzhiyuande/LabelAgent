import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("packages/low-code-engine/src");
const seen = new Set();

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== "dist") walk(f);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      let c = fs.readFileSync(f, "utf-8");
      const before = c;
      // Fix all mixed quotes in import statements
      c = c.replace(/from '(.*)"/g, (m, p1) => `from '${p1}'`);
      c = c.replace(/from "(.*)'/g, (m, p1) => `from "${p1}"`);
      // Fix all mixed quotes in JSX attributes
      c = c.replace(/="([^"]*)'/g, (m, p1) => `="${p1}"`);
      // Fix all mixed quotes in assignments
      c = c.replace(/'([^']*)"/g, (m, p1) => `'${p1}'`);
      if (c !== before) {
        fs.writeFileSync(f, c, "utf-8");
        const rel = path.relative(SRC, f);
        if (!seen.has(rel)) {
          console.log(rel);
          seen.add(rel);
        }
      }
    }
  }
}

walk(SRC);
console.log(`Fixed ${seen.size} files`);
