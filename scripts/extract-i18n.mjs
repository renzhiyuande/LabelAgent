#!/usr/bin/env node

/**
 * extract-i18n.mjs — 提取前端项目中所有硬编码的中文字符串，
 * 生成资源文件 zh.json / en.json，并在源码中安全替换为 t() 调用。
 *
 * 替换策略（保守）:
 *   ✅  JSX 属性值:  title="中文"  →  title={t('key')}
 *   ✅  对象属性值:  label: "中文"  →  label: t('key')
 *   ✅  JSX 文本:    >中文</       →  >{t('key')}</
 *   ❌  跳过 {…} 表达式内的字符串
 *
 * 用法:
 *   node scripts/extract-i18n.mjs                     # 扫描全部并替换
 *   node scripts/extract-i18n.mjs --dry-run           # 只扫描不修改
 *   node scripts/extract-i18n.mjs --file <path>       # 指定单个文件
 *   node scripts/extract-i18n.mjs --extract-only      # 只生成资源文件，不替换
 */

import fs from "node:fs";
import path from "node:path";

// ─── 配置 ───────────────────────────────────────────────────

const SRC_DIR = path.resolve(process.cwd(), "frontend/src");
const I18N_DIR = path.resolve(SRC_DIR, "i18n");
const ZH_JSON = path.resolve(I18N_DIR, "zh.json");
const EN_JSON = path.resolve(I18N_DIR, "en.json");

const SKIP_DIRS = new Set(["node_modules", "generated", "__pycache__", ".git"]);
const SKIP_SUFFIXES = [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".d.ts"];

const DRY_RUN = process.argv.includes("--dry-run");
const EXTRACT_ONLY = process.argv.includes("--extract-only");
const singleFileArg = process.argv.includes("--file")
  ? process.argv[process.argv.indexOf("--file") + 1]
  : null;

// ─── 常用中文→英文映射 ──────────────────────────────────────

const COMMON_MAP = {
  "提交":"submit","取消":"cancel","保存":"save","删除":"delete",
  "编辑":"edit","新增":"create","创建":"create","更新":"update",
  "查询":"search","搜索":"search","重置":"reset","确认":"confirm",
  "返回":"back","关闭":"close","打开":"open","导入":"import",
  "导出":"export","上传":"upload","下载":"download","预览":"preview",
  "查看":"view","操作":"actions","管理":"manage","设置":"settings",
  "配置":"config","信息":"info","详情":"detail","列表":"list",
  "标题":"title","名称":"name","类型":"type","状态":"status",
  "时间":"time","日期":"date","描述":"description","备注":"note",
  "全部":"all","无":"none","有":"has","是":"yes","否":"no",
  "启用":"enable","禁用":"disable","开启":"enable","关闭":"disable",
  "显示":"show","隐藏":"hide","成功":"success","失败":"failure",
  "错误":"error","警告":"warning","提示":"hint","加载中":"loading",
  "登录":"login","注册":"register","退出":"logout",
  "个人中心":"profile","退出登录":"logout_confirm","未登录":"not_logged_in",
  "用户名":"username","密码":"password","角色":"role","权限":"permission",
  "菜单":"menu","用户":"user","系统":"system","主题":"theme",
  "语言":"locale","界面密度":"density","紧凑":"density_compact",
  "标准":"density_standard","宽松":"density_relaxed","标签页":"tabs",
  "开启多标签":"enable_multi_tabs","卡片式":"tab_style_card",
  "线条式":"tab_style_line","通知铃铛":"notification_bell",
  "语言切换":"locale_switch","主题切换":"theme_toggle",
  "刷新当前页":"refresh_page","后台工作区":"workspace",
  "界面设置":"page_settings","Header 显示项":"header_display_items",
  "个人设置":"personal_settings","系统管理":"system_admin",
  "任务":"task","模板":"template","标注":"label","标注员":"annotator",
  "审核":"review","审核员":"reviewer","验收":"acceptance","分配":"assign",
  "认领":"claim","结算":"settlement","数据":"data","字段":"field",
  "表单":"form","资源":"resource","选择":"select","输入":"input",
  "输出":"output","单行输入":"single_line_input","多行输入":"multi_line_input",
  "下拉选择":"dropdown_select","单选":"radio","多选":"checkbox",
  "开关":"switch","评分":"rating","颜色":"color","图片":"image",
  "文件":"file","附件":"attachment","音频":"audio","视频":"video",
  "分割线":"divider","容器":"container","布局":"layout","尺寸":"size",
  "小":"small","中":"medium","大":"large","自动":"auto","手动":"manual",
  "默认":"default","自定义":"custom","高级":"advanced","基础":"basic",
  "通用":"general","其他":"other","帮助":"help","关于":"about",
  "版本":"version","帮助文档":"help_docs","确定":"ok","暂不":"not_now",
  "我知道了":"got_it","跳过":"skip","下一步":"next_step","上一步":"prev_step",
  "完成":"finish","试标":"trial_label","待分配":"pending_assign",
  "进行中":"in_progress","已完成":"completed","已结束":"ended",
  "已关闭":"closed","已作废":"voided","全部任务":"all_tasks","我的任务":"my_tasks",
  "界面":"ui","用户信息":"user_info",
};

// ─── 工具函数 ────────────────────────────────────────────────

function keyPrefix(filePath) {
  const rel = path.relative(SRC_DIR, filePath).replace(/\.(tsx|ts)$/, "");
  return rel.replace(/[/\\]/g, ".").replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").toLowerCase();
}

function toKeySegment(text) {
  if (COMMON_MAP[text]) return COMMON_MAP[text];
  const parts = text.split(/[，。、；：！？\s,.;:!?]+/).filter(Boolean);
  if (parts.length > 1) {
    const mapped = parts.map((p) => COMMON_MAP[p]).filter(Boolean);
    if (mapped.length === parts.length) return mapped.join("_");
  }
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) + text.charCodeAt(i);
  return `zh${Math.abs(h).toString(36).slice(0, 6)}`;
}

function genKey(prefix, zhText, seen) {
  const base = `${prefix}.${toKeySegment(zhText)}`;
  let key = base;
  for (let i = 1; seen.has(key); i++) key = `${base}_${i}`;
  seen.add(key);
  return key;
}

function collectFiles(dir, singleFile) {
  if (singleFile) {
    const abs = path.resolve(process.cwd(), singleFile);
    if (fs.existsSync(abs) && /\.tsx?$/.test(abs)) return [{ path: abs, rel: path.relative(SRC_DIR, abs) }];
    console.warn(`⚠ 文件不存在或不是 TS/TSX: ${singleFile}`);
    return [];
  }
  const results = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const fp = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(fp); }
      else if (e.isFile() && /\.tsx?$/.test(e.name) && !SKIP_SUFFIXES.some((s) => e.name.endsWith(s)))
        results.push({ path: fp, rel: path.relative(SRC_DIR, fp) });
    }
  }
  walk(dir);
  return results;
}

function isCommentLine(lineStr) {
  const t = lineStr.trim();
  if (t.startsWith("{/*") || t.includes("{/*") || t.startsWith("/*") || t.startsWith("*")) return true;
  const ci = t.indexOf("//");
  if (ci >= 0) {
    const before = t.slice(0, ci);
    if (!before.includes('"') && !before.includes("'")) return true;
  }
  return false;
}

/** 安全替换判定：检查匹配位置之前的字符 */
function isSafeReplace(content, matchStart) {
  const before = content.slice(Math.max(0, matchStart - 40), matchStart);
  // JSX 属性值:  title="中文"  (propName=)
  if (/[\w-]+\s*=\s*$/.test(before.trim())) return true;
  // 对象属性值:  label: "中文"  (key:)
  if (/:\s*$/.test(before.trim())) {
    // 但需排除三元表达式: ? " :  或 ?? " 或 || "
    const moreBefore = content.slice(Math.max(0, matchStart - 80), matchStart).trim();
    if (/[?|&]\s*$/.test(moreBefore) || /\?\?\s*$/.test(moreBefore)) return false;
    return true;
  }
  // 数组元素:  , "中文"  或  [ "中文"
  if (/[,[]\s*$/.test(before.trim())) return true;
  // const/let/var 赋值:  = "中文"
  if (/=\s*$/.test(before.trim())) {
    const stmt = content.slice(Math.max(0, matchStart - 100), matchStart).trim();
    if (/^(const|let|var)\s+\w+\s*=/.test(stmt)) return true;
    if (/^\w+\s*=/.test(stmt)) return true;
    return false;
  }
  return false;
}

// ─── 提取 ────────────────────────────────────────────────────

function findChineseStrings(content) {
  const matches = [];
  const lines = content.split("\n");

  // A. 引号内的中文（单行）
  for (const q of ['"', "'"]) {
    const re = new RegExp(`${q}([^\\n${q}]*[\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff][^\\n${q}]*)${q}`, "g");
    let m;
    while ((m = re.exec(content)) !== null) {
      const s = m[1];
      const zh = s.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
      if (!zh || zh.length < 2) continue;
      const ln = content.slice(0, m.index).split("\n").length;
      if (isCommentLine(lines[ln - 1] || "")) continue;
      matches.push({ full: m[0], text: s, quote: q, line: ln, pos: m.index, type: "quoted" });
    }
  }

  // B. JSX 文本: >中文<
  const jsxRe = />([^<]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff][^<]*)<\//g;
  let m2;
  while ((m2 = jsxRe.exec(content)) !== null) {
    const s = m2[1].trim();
    if (!s) continue;
    const zh = s.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
    if (!zh || zh.length < 2) continue;
    const ln = content.slice(0, m2.index).split("\n").length;
    matches.push({ full: m2[0], text: s, quote: "", line: ln, pos: m2.index, type: "jsx-text" });
  }

  return matches;
}

// ─── 替换 ────────────────────────────────────────────────────

function replaceSource(content, matches, keyMap, filePath) {
  if (matches.length === 0) return content;

  const rel = path.relative(SRC_DIR, filePath);
  const depth = rel.split(/[/\\]/).length - 1;
  const importPath = depth <= 1 ? "./i18n/useT" : "../".repeat(depth - 1) + "i18n/useT";

  // 收集替换操作（仅安全上下文）
  const ops = [];
  for (const m of matches) {
    const key = keyMap[m.text];
    if (!key) continue;

    let safe = false;
    let replacement = "";

    if (m.type === "jsx-text") {
      // >中文< → >{t('key')}<
      safe = true;
      replacement = `>{t('${key}')}</`;
    } else if (isSafeReplace(content, m.pos)) {
      safe = true;
      // 判断是 JSX 属性还是对象值
      const before = content.slice(Math.max(0, m.pos - 60), m.pos);
      if (/[\w-]+\s*=\s*$/.test(before.trim())) {
        replacement = `{t('${key}')}`;   // title="中文" → title={t('key')}
      } else {
        replacement = `t('${key}')`;     // label: "中文" → label: t('key')
      }
    }

    if (safe) {
      ops.push({ pos: m.pos, end: m.pos + m.full.length, replacement, key, line: m.line, text: m.text });
    }
  }

  if (ops.length === 0) return content;

  // 从后向前替换
  let result = content;
  ops.sort((a, b) => b.pos - a.pos);
  for (const op of ops) {
    result = result.slice(0, op.pos) + op.replacement + result.slice(op.end);
  }

  // 注入 import { useT }
  if (!result.includes("import { useT }")) {
    const stmt = `import { useT } from "${importPath}";\n`;
    const imRe = /^import\s.*$/gm;
    let last = null, mm;
    while ((mm = imRe.exec(result)) !== null) last = mm;
    if (last) {
      const at = result.indexOf("\n", last.index) + 1;
      result = result.slice(0, at) + stmt + result.slice(at);
    } else {
      result = stmt + result;
    }
  }

  // 注入 const { t } = useT()
  if (!result.includes("const { t } = useT(")) {
    const fnRe = /(export\s+(default\s+)?function\s+\w+|const\s+\w+\s*=\s*(\([^)]*\)|[^\s])\s*=>)\s*\{/g;
    const fns = [];
    let fm;
    while ((fm = fnRe.exec(result)) !== null) fns.push(fm);
    if (fns.length > 0) {
      const at = fns[0].index + fns[0][0].length;
      result = result.slice(0, at) + `\n  const { t } = useT();` + result.slice(at);
    }
  }

  return result;
}

// ─── 主流程 ──────────────────────────────────────────────────

async function main() {
  let existingZh = {};
  if (fs.existsSync(ZH_JSON)) {
    try { existingZh = JSON.parse(fs.readFileSync(ZH_JSON, "utf-8")); } catch { existingZh = {}; }
  }
  let existingEn = {};
  if (fs.existsSync(EN_JSON)) {
    try { existingEn = JSON.parse(fs.readFileSync(EN_JSON, "utf-8")); } catch { existingEn = {}; }
  }

  const files = collectFiles(SRC_DIR, singleFileArg);
  if (files.length === 0) { console.log("没有找到需要扫描的文件。"); return; }

  const seenKeys = new Set(Object.keys(existingZh));
  const keyToZh = { ...existingZh };
  const fileReports = [];

  for (const { path: fp, rel } of files) {
    const content = fs.readFileSync(fp, "utf-8");
    const matches = findChineseStrings(content);
    if (matches.length === 0) continue;

    const prefix = keyPrefix(fp);
    const strToKey = {};
    for (const m of matches) {
      if (!strToKey[m.text]) strToKey[m.text] = genKey(prefix, m.text, seenKeys);
      m.key = strToKey[m.text];
    }
    for (const [k, v] of Object.entries(strToKey)) {
      if (!keyToZh[v]) keyToZh[v] = k;
    }

    fileReports.push({ path: fp, rel, matches, prefix, count: matches.length, uniqueStrs: Object.keys(strToKey).length });
  }

  const totalStrings = fileReports.reduce((s, f) => s + f.count, 0);
  const totalUnique = fileReports.reduce((s, f) => s + f.uniqueStrs, 0);
  console.log(`📂 文件: ${files.length} | 含中文: ${fileReports.length}`);
  console.log(`🔤 字符串: ${totalStrings}处 (${totalUnique}唯一) | Key: ${Object.keys(keyToZh).length}`);

  fileReports.sort((a, b) => b.count - a.count);
  for (const fr of fileReports) {
    console.log(`  ${fr.count.toString().padStart(3)}  ${fr.rel}`);
    const printed = new Set();
    for (const m of fr.matches) {
      if (!printed.has(m.text)) {
        printed.add(m.text);
        console.log(`        L${m.line} ${m.text.padEnd(30)} ${m.key}`);
      }
    }
  }

  if (DRY_RUN) { console.log("\n🏁 DRY RUN — 未写入"); return; }

  // 写入资源文件
  fs.writeFileSync(ZH_JSON, JSON.stringify(keyToZh, null, 2) + "\n");
  console.log(`\n✅ zh.json: ${Object.keys(keyToZh).length} 条`);
  const enOut = {};
  for (const k of Object.keys(keyToZh)) enOut[k] = existingEn[k] || "";
  fs.writeFileSync(EN_JSON, JSON.stringify(enOut, null, 2) + "\n");
  console.log(`✅ en.json: ${Object.keys(enOut).length} 条 (${Object.values(enOut).filter(Boolean).length} 已翻译)`);

  if (EXTRACT_ONLY) { console.log("\n⏸  --extract-only 模式，跳过替换"); return; }

  // 反向映射
  const zhToKey = {};
  for (const [k, v] of Object.entries(keyToZh)) zhToKey[v] = k;

  // 替换
  console.log("\n🔄 执行替换（仅安全上下文）...");
  let replaced = 0, skipped = 0;
  for (const fr of fileReports) {
    const content = fs.readFileSync(fr.path, "utf-8");
    const newContent = replaceSource(content, fr.matches, zhToKey, fr.path);
    if (newContent !== content) {
      fs.writeFileSync(fr.path, newContent, "utf-8");
      replaced++;
      console.log(`  ✅ ${fr.rel}`);
    } else {
      skipped++;
    }
  }
  console.log(`\n✅ 修改: ${replaced} 文件 | 跳过: ${skipped} 文件`);

  // 未翻译项
  const un = Object.entries(enOut).filter(([, v]) => !v);
  if (un.length > 0) {
    console.log(`\n⚠️  en.json 待翻译 ${un.length} 条:`);
    for (const [k] of un.slice(0, 30)) console.log(`  ${k.padEnd(45)} ${keyToZh[k]}`);
    if (un.length > 30) console.log(`  ... +${un.length - 30}`);
  }
}

main().catch(console.error);
