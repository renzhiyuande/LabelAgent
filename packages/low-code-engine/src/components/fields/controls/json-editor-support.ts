export type JsonTreeExpansionMode = "default" | "all" | "none";

export type JsonPrimitiveKind = "string" | "number" | "boolean" | "null" | "undefined";

export function escapeJsonHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 将 JSON 源码转为带语法高亮 class 的 HTML（编辑区 overlay 用） */
export function highlightJsonSource(source: string): string {
  if (!source) {
    return "";
  }

  let html = "";
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      const start = index;
      while (index < source.length && /\s/.test(source[index])) {
        index += 1;
      }
      html += escapeJsonHtml(source.slice(start, index));
      continue;
    }

    if (char === '"') {
      const start = index;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      const token = source.slice(start, index);
      let cursor = index;
      while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor += 1;
      }
      const isKey = source[cursor] === ":";
      html += `<span class="lh-json-token lh-json-token--${isKey ? "key" : "string"}">${escapeJsonHtml(token)}</span>`;
      continue;
    }

    if (char === "-" || (char >= "0" && char <= "9")) {
      const start = index;
      index += 1;
      while (index < source.length && /[0-9.eE+-]/.test(source[index])) {
        index += 1;
      }
      html += `<span class="lh-json-token lh-json-token--number">${escapeJsonHtml(source.slice(start, index))}</span>`;
      continue;
    }

    if (source.startsWith("true", index) || source.startsWith("false", index) || source.startsWith("null", index)) {
      const token = source.startsWith("true", index)
        ? "true"
        : source.startsWith("false", index)
          ? "false"
          : "null";
      index += token.length;
      html += `<span class="lh-json-token lh-json-token--literal">${token}</span>`;
      continue;
    }

    if ("{}[]:,".includes(char)) {
      html += `<span class="lh-json-token lh-json-token--punct">${escapeJsonHtml(char)}</span>`;
      index += 1;
      continue;
    }

    html += escapeJsonHtml(char);
    index += 1;
  }

  return html;
}

export function getJsonPrimitiveKind(value: unknown): JsonPrimitiveKind {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "number") {
    return "number";
  }
  return "string";
}

export function formatJsonPrimitive(value: unknown): string {
  const kind = getJsonPrimitiveKind(value);
  if (kind === "string") {
    return JSON.stringify(value);
  }
  if (kind === "undefined") {
    return "undefined";
  }
  return String(value);
}

export function isJsonExpandable(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === "object";
}

export function jsonNodePreview(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).length}}`;
  }
  return formatJsonPrimitive(value);
}

export function collectExpandableJsonPaths(value: unknown, path = "root"): string[] {
  if (!isJsonExpandable(value)) {
    return [];
  }
  const paths = [path];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      paths.push(...collectExpandableJsonPaths(entry, `${path}.${index}`));
    });
    return paths;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    paths.push(...collectExpandableJsonPaths(entry, `${path}.${key}`));
  });
  return paths;
}

export function buildDefaultExpandedJsonPaths(value: unknown, maxDepth = 1, path = "root", depth = 0): Set<string> {
  const expanded = new Set<string>();
  if (!isJsonExpandable(value)) {
    return expanded;
  }
  expanded.add(path);
  if (depth >= maxDepth) {
    return expanded;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      buildDefaultExpandedJsonPaths(entry, maxDepth, `${path}.${index}`, depth + 1).forEach((item) => {
        expanded.add(item);
      });
    });
    return expanded;
  }
  Object.keys(value as Record<string, unknown>).forEach((key) => {
    buildDefaultExpandedJsonPaths(
      (value as Record<string, unknown>)[key],
      maxDepth,
      `${path}.${key}`,
      depth + 1,
    ).forEach((item) => {
      expanded.add(item);
    });
  });
  return expanded;
}

export function resolveJsonTreeExpansion(
  value: unknown,
  mode: JsonTreeExpansionMode,
): Set<string> {
  if (mode === "none") {
    return new Set<string>();
  }
  if (mode === "all") {
    return new Set(collectExpandableJsonPaths(value));
  }
  return buildDefaultExpandedJsonPaths(value, 1);
}
