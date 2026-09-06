import fs from "node:fs";
import path from "node:path";

const SRC = new URL("../src", import.meta.url).pathname;
let count = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== "dist") walk(f);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      let c = fs.readFileSync(f, "utf-8");
      const before = c;
      // ../../../lib/ → ../../lib/
      c = c.replace(/from ['"]\.\.\/\.\.\/\.\.\/lib\/(utils|id-utils|types)['"]/g, (m) => m.replace("../../../lib/", "../../lib/"));
      // ../../../components/ → ../../components/
      c = c.replace(/from ['"]\.\.\/\.\.\/\.\.\/components\/(ui|layout)\//g, (m) => m.replace("../../../components/", "../../components/"));
      if (c !== before) {
        fs.writeFileSync(f, c, "utf-8");
        console.log(path.relative(SRC, f));
        count++;
      }
    }
  }
}

walk(SRC);
console.log(`\nFixed ${count} files`);
