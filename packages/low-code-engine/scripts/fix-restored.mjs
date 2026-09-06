import fs from "node:fs";

// Fix DateRangeFieldControl.tsx: @/ → relative paths
let fp = "packages/low-code-engine/src/components/fields/controls/DateRangeFieldControl.tsx";
let c = fs.readFileSync(fp, "utf-8");
c = c.replace(/from ['"]@\/components\/ui\//g, "from '../../../components/ui/");
fs.writeFileSync(fp, c);
console.log("Fixed DateRangeFieldControl");

// Fix JsonEditorFieldControl.tsx: @/ → relative paths
fp = "packages/low-code-engine/src/components/fields/controls/JsonEditorFieldControl.tsx";
c = fs.readFileSync(fp, "utf-8");
c = c.replace(/from ['"]@\/components\/ui\//g, "from '../../../components/ui/");
fs.writeFileSync(fp, c);
console.log("Fixed JsonEditorFieldControl");
