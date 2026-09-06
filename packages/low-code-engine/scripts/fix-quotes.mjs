import fs from "node:fs";
import path from "node:path";

const SRC = new URL("../src", import.meta.url).pathname;

function fix(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "dist") fix(full);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      let c = fs.readFileSync(full, "utf-8");
      const before = c;

      // Fix mismatched quotes: from '{path}" → from '{path}'
      // and            from "{path}' → from "{path}"
      c = c.replace(/from '([^']*)"(\s*;?\s*)$/gm, "from '$1'$2");
      c = c.replace(/from "([^"]*)'(\s*;?\s*)$/gm, 'from "$1"$2');

      if (c !== before) {
        fs.writeFileSync(full, c, "utf-8");
        console.log(path.relative(SRC, full));
      }
    }
  }
}

console.log("Fixing mismatched quotes...");
fix(SRC);
console.log("Done");
