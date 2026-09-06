import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("packages/low-code-engine/src/components/fields/controls");
let count = 0;

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
  const fp = path.join(DIR, f);
  let content = fs.readFileSync(fp, "utf-8");
  const before = content;

  // Fix ../../components/ui/ → ../../../components/ui/ for depth-3 files
  content = content.replace(
    /from ['"]\.\.\/\.\.\/(components\/ui\/)/g,
    (m) => m.replace("../../components/", "../../../components/"),
  );
  // Fix ../../lib/ → ../../../lib/ for depth-3 files
  content = content.replace(
    /from ['"]\.\.\/\.\.\/(lib\/(?:utils|id-utils))/g,
    (m) => m.replace("../../lib/", "../../../lib/"),
  );

  if (content !== before) {
    fs.writeFileSync(fp, content, "utf-8");
    count++;
    console.log(f);
  }
}

console.log(`\nFixed ${count} files`);
