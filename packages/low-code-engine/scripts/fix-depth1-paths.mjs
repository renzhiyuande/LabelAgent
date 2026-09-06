import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("packages/low-code-engine/src");
let count = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== "dist") walk(f);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      const depth = path.relative(SRC, f).split(/[/\\]/).length - 1;
      if (depth !== 1) continue;

      let c = fs.readFileSync(f, "utf-8");
      const before = c;
      // depth 1 (src/utils/file.ts): ../../components/ → ../components/
      c = c.replace(/from ['"]\.\.\/\.\.\/(components\/(?:ui|layout)\/)/g, (m) => m.replace("../../", "../"));

      if (c !== before) {
        fs.writeFileSync(f, c, "utf-8");
        count++;
        console.log(path.relative(SRC, f));
      }
    }
  }
}

walk(SRC);
console.log(`\nFixed ${count} files`);
