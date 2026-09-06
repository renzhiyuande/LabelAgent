/**
 * 只替换导入路径中的目录引用，不修改引号、字符串、注释等。
 *
 * 规则：
 * 1. ``../../lib/`` → ``../lib/`` (去掉一层 ../)
 * 2. ``../../utils/`` → 替换为适配器路径，或 ``../adapters/``
 * 3. ``../../types`` → ``../lib/types``
 * 4. ``../../../lib/`` → ``../../lib/``
 * 5. ... 其他项目特有路径
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");

// ─── 替换规则 ───
// 每个规则: [pattern, replacement]
// pattern: 正则匹配，必须匹配 from 语句的整个路径部分 (不含 from 关键字和引号)
// replacement: 替换后的路径字符串 (不含引号)
// 注意：path 在捕获组中，$1 等可引用

const RULES = [
  // ../../lib/id-utils → ../lib/id-utils (从 depth 2 的文件)
  [/\bfrom\s+['"]\.\.\/\.\.\/lib\/id-utils['"]/g, (m) => m.replace("../../lib/", "../lib/")],
  // ../../lib/utils → ../lib/utils
  [/\bfrom\s+['"]\.\.\/\.\.\/lib\/utils['"]/g, (m) => m.replace("../../lib/", "../lib/")],
  // ../../lib/message → 替换为 getMessageService
  [/\bfrom\s+['"]\.\.\/\.\.\/lib\/message['"]/g, (m) => {
    const q = m.includes('"') ? '"' : "'";
    return `from ${q}../global-config${q}`;
  }],
  // ../../utils/apiClient → 替换为 getHttpClient
  [/\bfrom\s+['"]\.\.\/\.\.\/utils\/apiClient['"]/g, (m) => {
    const q = m.includes('"') ? '"' : "'";
    return `from ${q}../global-config${q}`;
  }],
  // ../../types → ../lib/types
  [/\bfrom\s+['"]\.\.\/\.\.\/types['"]/g, (m) => m.replace("../../types", "../lib/types")],

  // ../../../lib/id-utils → ../../lib/id-utils (从 depth 3 的文件)
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/lib\/id-utils['"]/g, (m) => m.replace("../../../lib/", "../../lib/")],
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/lib\/utils['"]/g, (m) => m.replace("../../../lib/", "../../lib/")],
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/lib\/message['"]/g, (m) => {
    const q = m.includes('"') ? '"' : "'";
    return `from ${q}../../global-config${q}`;
  }],
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/lib\/route-meta['"]/g, (m) => {
    const q = m.includes('"') ? '"' : "'";
    return `from ${q}../../global-config${q}`;
  }],
  // ../../../utils/apiClient → 替换
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/utils\/apiClient['"]/g, (m) => {
    const q = m.includes('"') ? '"' : "'";
    return `from ${q}../../global-config${q}`;
  }],
  // ../../../types → ../../lib/types
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/types['"]/g, (m) => m.replace("../../../types", "../../lib/types")],
  // ../../../../types → ../../../lib/types
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/types['"]/g, (m) => m.replace("../../../../types", "../../../lib/types")],

  // ../../../features/assets/* → TODO
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/features\/assets\/([^'"]+)['"]/g, (m) => {
    return m.replace(/\.\.\/\.\.\/\.\.\/features\/assets\/[^'"]+/, () => "");
  }],
  // ../../../../features/assets/* → TODO
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/features\/assets\/([^'"]+)['"]/g, (m) => {
    return m.replace(/\.\.\/\.\.\/\.\.\/\.\.\/features\/assets\/[^'"]+/, () => "");
  }],
  // @/features/assets/* → complete removal  
  [/\bfrom\s+['"]@\/features\/assets\/([^'"]+)['"]/g, (m) => {
    const q = m.includes('"') ? '"' : "'";
    return `from ${q}${q}`;
  }],

  // ../../../../lib/utils → ../../../lib/utils
  [/\bfrom\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/lib\/utils['"]/g, (m) => m.replace("../../../../lib/", "../../../lib/")],
  // @/lib/utils → relative path
  [/\bfrom\s+['"]@\/lib\/utils['"]/g, (m) => m.replace("@/lib/", "../../../lib/")],
  // @/lib/id-utils 
  [/\bfrom\s+['"]@\/lib\/id-utils['"]/g, (m) => m.replace("@/lib/", "../../../lib/")],
];

function processFile(fp) {
  let content = fs.readFileSync(fp, "utf-8");
  const before = content;
  for (const [regex, replacer] of RULES) {
    content = content.replace(regex, replacer);
  }
  if (content !== before) {
    fs.writeFileSync(fp, content, "utf-8");
    return true;
  }
  return false;
}

// Walk files
let count = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== "dist") walk(full);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      if (processFile(full)) {
        console.log(path.relative(SRC, full));
        count++;
      }
    }
  }
})(SRC);

console.log(`\nDone: ${count} files modified.`);
