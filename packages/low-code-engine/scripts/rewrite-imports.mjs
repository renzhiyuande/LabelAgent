/**
 * 重写 @labelhub/low-code-engine 包内的导入路径
 *
 * 将原有指向主项目的导入改为指向包内目录或适配器接口。
 *
 * 注意：从 frontend/src/low-code/ 复制到 packages/low-code-engine/src/ 后，
 * 原路径如 ../../../lib/utils → 实际需要的是 ../../lib/utils（少一层 low-code/ 嵌套）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "../src");
const stats = { files: 0, rewrites: 0 };

function collectFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "dist") results.push(...collectFiles(fullPath));
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) results.push(fullPath);
  }
  return results;
}

function depthFromSrc(filePath) {
  const rel = path.relative(SRC_DIR, filePath);
  return rel.split(/[/\\]/).length - 1;
}

function rel(filePath, target) {
  const d = depthFromSrc(filePath);
  return "../".repeat(d) + target;
}

function rewriteFile(fp) {
  let c = fs.readFileSync(fp, "utf-8");
  const orig = c;
  const log = [];

  function repl(regex, target) {
    c = c.replace(regex, (m) => {
      log.push(`${m.substring(0, 70)} → ${target.substring(0, 70)}`);
      return target;
    });
  }

  // ── @/components/ui/* → relative ──
  c = c.replace(/from ['"]@\/components\/ui\/([^'"]+)['"]/g, (m, p1) => {
    const r = rel(fp, `components/ui/${p1}`);
    log.push(`${m.substring(0, 70)} → ${r}`);
    return `from '${r}'`;
  });

  // ── @/lib/utils → relative ──
  c = c.replace(/from ['"]@\/lib\/utils['"]/g, (m) => {
    const r = rel(fp, "lib/utils");
    log.push(`${m} → ${r}`); return `from '${r}'`;
  });

  // ── @/lib/id-utils → relative ──
  c = c.replace(/from ['"]@\/lib\/id-utils['"]/g, (m) => {
    const r = rel(fp, "lib/id-utils");
    log.push(`${m} → ${r}`); return `from '${r}'`;
  });

  // ── @/types → ./lib/types ──
  c = c.replace(/from ['"]@\/types['"]/g, (m) => {
    const r = rel(fp, "lib/types");
    log.push(`${m} → ${r}`); return `from '${r}'`;
  });

  // ── @/lib/message ──
  repl(/from ['"]@\/lib\/message['"]/g,
    `/* LCE-ADAPTER */ from '${rel(fp, "provider")}'`);

  // ── @/utils/apiClient ──
  repl(/from ['"]@\/utils\/apiClient['"]/g,
    `/* LCE-ADAPTER */ from '${rel(fp, "provider")}'`);

  // ── @/features/assets/* ──
  repl(/from ['"]@\/features\/assets\/([^'"]+)['"]/g,
    `/* LCE-ADAPTER */ from '${rel(fp, "provider")}'`);

  // ── @/components/workbench/* ──
  repl(/from ['"]@\/components\/workbench\/([^'"]+)['"]/g,
    `/* LCE-ADAPTER */ from '${rel(fp, "provider")}'`);

  // ── @/features/labeler/* ──
  repl(/from ['"]@\/features\/labeler\/([^'"]+)['"]/g,
    `/* LCE-ADAPTER */ from '${rel(fp, "provider")}'`);

  // ── @/components/workbench/shared/* ──
  repl(/from ['"]@\/components\/workbench\/shared\/([^'"]+)['"]/g,
    `/* LCE-ADAPTER */ from '${rel(fp, "provider")}'`);

  // ── Relative: ../../../lib/utils/id-utils/message → ../../lib/… ──
  c = c.replace(
    /(\.\.\/)(\.\.\/)(\.\.\/)(lib\/(?:utils|id-utils|message))/g,
    (m, a, b, c, lib) => { log.push(`${m.substring(0, 70)} → ${a}${b}${lib}`); return `${a}${b}${lib}`; }
  );

  // ── Relative: ../lib/message → ./provider ──
  repl(/from ['"]\.\.\/lib\/message['"]/g,
    `/* LCE-ADAPTER: useMessageService */ from './provider'`);

  // ── Relative: ../../lib/message → ../provider ──
  repl(/from ['"]\.\.\/\.\.\/lib\/message['"]/g,
    `/* LCE-ADAPTER: useMessageService */ from '../provider'`);

  // ── Relative: ../../../lib/message → ../../provider ──
  repl(/from ['"]\.\.\/\.\.\/\.\.\/lib\/message['"]/g,
    `/* LCE-ADAPTER: useMessageService */ from '../../provider'`);

  // ── Relative: ../../lib/route-meta ──
  c = c.replace(/from ['"](\.\.\/)(\.\.\/)lib\/route-meta['"]/g, (m, a, b) => {
    const r = `/* LCE-ADAPTER */ from '${a}provider'`;
    log.push(`${m.substring(0, 70)} → ${r}`); return r;
  });

  // ── Relative: ../../utils/apiClient ──
  c = c.replace(/from ['"](\.\.\/)(\.\.\/)utils\/apiClient['"]/g, (m, a, b) => {
    const r = `/* LCE-ADAPTER */ from '${a}provider'`;
    log.push(`${m.substring(0, 70)} → ${r}`); return r;
  });
  c = c.replace(/from ['"](\.\.\/)utils\/apiClient['"]/g, (m, a) => {
    const r = `/* LCE-ADAPTER */ from '${a}provider'`;
    log.push(`${m.substring(0, 70)} → ${r}`); return r;
  });

  // ── Relative: ../../types → ../lib/types ──
  c = c.replace(/from ['"](\.\.\/)(\.\.\/)types['"]/g, (m, a, b) => {
    const r = `from '${a}lib/types'`;
    log.push(`${m} → ${r}`); return r;
  });
  c = c.replace(/from ['"](\.\.\/)(\.\.\/)(\.\.\/)types['"]/g, (m, a, b, cC) => {
    const r = `from '${a}lib/types'`;
    log.push(`${m} → ${r}`); return r;
  });
  c = c.replace(/from ['"](\.\.\/)(\.\.\/)(\.\.\/)(\.\.\/)types['"]/g, (m, a, b, cC, d) => {
    const r = `from '${a}${b}lib/types'`;
    log.push(`${m} → ${r}`); return r;
  });

  // ── Relative: ../../../features/assets/* → adapter ──
  c = c.replace(/from ['"](\.\.\/)(\.\.\/)(\.\.\/)features\/assets\/([^'"]+)['"]/g, (m, a, b, cC) => {
    const r = `/* LCE-ADAPTER */ from '${a}provider'`;
    log.push(`${m.substring(0, 70)} → ${r}`); return r;
  });
  c = c.replace(/from ['"](\.\.\/)(\.\.\/)(\.\.\/)(\.\.\/)features\/assets\/([^'"]+)['"]/g, (m, a, b, cC, d) => {
    const r = `/* LCE-ADAPTER */ from '${a}${b}provider'`;
    log.push(`${m.substring(0, 70)} → ${r}`); return r;
  });

  // ── Relative: features/business or features/labeler → adapter ──
  c = c.replace(/from ['"]([^'"]*features\/(?:business|labeler)\/[^'"]+)['"]/g, (m) => {
    // Only if it matches the pattern of ../features/business or similar
    if (m.includes('../../') || m.includes('../../../')) {
      const r = `/* LCE-ADAPTER */ from '${rel(fp, "provider")}'`;
      log.push(`${m.substring(0, 70)} → ${r}`); return r;
    }
    return m;
  });

  // ── Fix ui/layout component paths: remove one "../" level ──
  // ../../components/ui/  →  ../components/ui/
  c = c.replace(/from ['"]\.\.\/\.\.\/components\/(ui|layout)\//g, (m) => {
    const r = m.replace('../../', '../');
    log.push(`${m.substring(0, 70)} → ${r}`); return r;
  });
  // ../../../components/ui/ → ../../components/ui/
  c = c.replace(/from ['"]\.\.\/\.\.\/\.\.\/components\/(ui|layout)\//g, (m) => {
    const r = m.replace('../../../', '../../');
    log.push(`${m.substring(0, 70)} → ${r}`); return r;
  });
  // ../../../../components/ui/ → ../../../components/ui/
  c = c.replace(/from ['"]\.\.\/\.\.\/\.\.\/\.\.\/components\/(ui|layout)\//g, (m) => {
    const r = m.replace('../../../../', '../../../');
    log.push(`${m.substring(0, 70)} → ${r}`); return r;
  });

  if (c !== orig) {
    fs.writeFileSync(fp, c, "utf-8");
    stats.files++;
    stats.rewrites += log.length;
    for (const entry of log) {
      console.log(`  ${path.relative(SRC_DIR, fp)}: ${entry}`);
    }
  }
}

const files = collectFiles(SRC_DIR);
console.log(`Found ${files.length} files`);
for (const f of files) rewriteFile(f);
console.log(`\nDone: ${stats.files} files, ${stats.rewrites} rewrites`);
