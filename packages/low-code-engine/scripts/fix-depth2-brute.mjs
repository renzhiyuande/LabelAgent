import fs from "node:fs";
import path from "node:path";

const DIRS = [
  "components/assignment",
  "components/card",
  "components/common",
  "components/data-table",
  "components/dialogs",
  "components/drawers",
  "components/field-shell",
  "components/fields",
  "components/fields/adapters",
  "components/forms",
  "components/layout",
  "components/metrics",
  "components/pagination",
  "components/query-bar",
  "components/resource-page",
  "components/user",
  "hooks",
  "actions",
  "utils",
  "api",
];

const BASE = path.resolve("packages/low-code-engine/src");
let count = 0;

for (const dir of DIRS) {
  const fullDir = path.join(BASE, dir);
  if (!fs.existsSync(fullDir)) continue;
  for (const f of fs.readdirSync(fullDir)) {
    if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
    const fp = path.join(fullDir, f);
    const rel = path.relative(BASE, fp);
    const depth = rel.split(/[/\\]/).length - 1;

    let c = fs.readFileSync(fp, "utf-8");
    const before = c;

    // Fix: ../../../ -> ../../ for depth-2 files
    if (depth === 2) {
      c = c.replace(/from ['"]\.\.\/\.\.\/\.\.\/(components\/(?:ui|layout)\/|lib\/(?:utils|id-utils|types))['"]/g, (m) =>
        m.replace("../../../", "../../"),
      );
    }

    if (c !== before) {
      fs.writeFileSync(fp, c, "utf-8");
      count++;
      console.log(rel);
    }
  }
}

console.log(`\nFixed ${count} files`);
