import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("packages/low-code-engine/src");

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== "dist") walk(f);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      let c = fs.readFileSync(f, "utf-8");
      const before = c;
      // Fix mixed quotes: "\x27...\" and \"...\x27"
      c = c.replace(/from '([^']*)"(\s*;?\s*)$/gm, "from '$1'$2");
      if (c !== before) {
        fs.writeFileSync(f, c, "utf-8");
        console.log(path.relative(SRC, f));
      }
    }
  }
}

walk(SRC);
