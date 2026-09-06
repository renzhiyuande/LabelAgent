import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("packages/low-code-engine/src/components/fields/controls");

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
  const fp = path.join(DIR, f);
  let c = fs.readFileSync(fp, "utf-8");
  const before = c;

  // Fix mixed quotes in import lines where opening ' has closing "
  c = c.replace(/(from\s+)'([^']*?)"(\s*;?\s*$)/gm, "$1'$2'$3");

  if (c !== before) {
    fs.writeFileSync(fp, c, "utf-8");
    console.log(f);
  }
}

console.log("Done");
