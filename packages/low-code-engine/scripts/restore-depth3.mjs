import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("packages/low-code-engine/src/components/fields/controls");

for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
  const fp = path.join(DIR, f);
  let content = fs.readFileSync(fp, "utf-8");
  const before = content;

  content = content.replace(
    /from ['"]\.\.\/\.\.\/(components\/ui\/|lib\/(?:utils|id-utils))['"]/g,
    (m) => m.replace("../../", "../../../"),
  );

  if (content !== before) {
    fs.writeFileSync(fp, content, "utf-8");
    console.log(f);
  }
}
