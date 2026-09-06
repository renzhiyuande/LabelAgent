import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("packages/low-code-engine/src/components/ui");
let count = 0;

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
  const fp = path.join(DIR, f);
  let c = fs.readFileSync(fp, "utf-8");
  const before = c;

  // Fix ../../../lib/utils → ../../lib/utils
  c = c.replace(/from ['"]\.\.\/\.\.\/\.\.\/lib\/utils['"]/g, 'from "../../lib/utils"');
  // Fix ../lib/utils → ../../lib/utils
  c = c.replace(/from ['"]\.\.\/lib\/utils['"]/g, 'from "../../lib/utils"');

  if (c !== before) {
    fs.writeFileSync(fp, c, "utf-8");
    count++;
    console.log(f);
  }
}

console.log(`\nFixed ${count} files`);
