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
      // depth 3: ../../../dir/module → ../../dir/module
      c = c.replace(/from ['"]\.\.\/\.\.\/\.\.\/(lib|utils|components|adapters|hooks|actions|schema|constants|stores)\//g, (m, d) => `from '../../${d}/`);
      // depth 4: ../../../../dir/module → ../../../dir/module
      c = c.replace(/from ['"]\.\.\/\.\.\/\.\.\/\.\.\/(lib|utils|components|adapters|hooks|actions|schema|constants|stores)\//g, (m, d) => `from '../../../${d}/`);
      if (c !== before) {
        fs.writeFileSync(full, c, "utf-8");
        console.log(path.relative(SRC, full));
      }
    }
  }
}

fix(SRC);
console.log("Done");
