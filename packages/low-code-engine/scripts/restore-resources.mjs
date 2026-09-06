import { execSync } from "child_process";
import fs from "fs";

const COMMIT = "316cdb49";
const SRC_DIR = `packages/low-code-engine/src/schema/resources`;
const DEST = "frontend/src/low-code-resources";

const listing = execSync(`git ls-tree -r ${COMMIT} --name-only`, { encoding: "utf-8" });
const files = listing.split("\n").filter((f) => f.startsWith(SRC_DIR) && f.endsWith(".ts"));

fs.mkdirSync(DEST, { recursive: true });

for (const f of files) {
  const name = f.replace(`${SRC_DIR}/`, "");
  const content = execSync(`git show ${COMMIT}:${f}`, { encoding: "utf-8" });
  fs.writeFileSync(`${DEST}/${name}`, content);
  console.log(name);
}
console.log(`\nRestored ${files.length} files to ${DEST}/`);
