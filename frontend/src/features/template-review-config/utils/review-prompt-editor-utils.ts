import type { ReviewDimensionItem } from "@/features/template-designer/types/review-dimension";
import {
  REVIEW_PROMPT_DATA_SUFFIX,
  REVIEW_PROMPT_INTRO,
  buildDimensionSlotLine,
} from "./review-prompt-builder";
import type { ReviewPromptVariable } from "./review-prompt-variables";

export const VARIABLE_TOKEN_PATTERN = /\{\{[^}]+\}\}/g;

/** 标准维度插槽行 */
const DIMENSION_SLOT_LINE =
  /^\[[^\]]+\] \{\{dimension\.[^}]+\.prompt_instruction\}\}$/;

/** 含维度插槽变量的行（含用户部分删除后的残缺行） */
const DIMENSION_SLOT_LINE_LOOSE =
  /\{\{dimension\.[^}]+\.prompt_instruction\}\}/;

export function isDimensionSlotLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  return DIMENSION_SLOT_LINE.test(trimmed) || DIMENSION_SLOT_LINE_LOOSE.test(trimmed);
}

export type PromptHighlightSegment =
  | { type: "text"; content: string }
  | { type: "variable"; content: string };

export function segmentPromptForHighlight(text: string): PromptHighlightSegment[] {
  const segments: PromptHighlightSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(VARIABLE_TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, start) });
    }
    segments.push({ type: "variable", content: match[0] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

export function findVariableTokenRange(
  value: string,
  cursor: number,
  direction: "backspace" | "delete",
): [number, number] | null {
  for (const match of value.matchAll(VARIABLE_TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;

    if (direction === "backspace") {
      if (cursor > start && cursor <= end) {
        return [start, end];
      }
      if (cursor === end) {
        return [start, end];
      }
    } else if (cursor >= start && cursor < end) {
      return [start, end];
    } else if (cursor === start) {
      return [start, end];
    }
  }

  return null;
}

export interface MentionState {
  start: number;
  query: string;
}

export function detectMention(value: string, cursor: number): MentionState | null {
  const before = value.slice(0, cursor);
  const atIndex = before.lastIndexOf("@");
  if (atIndex === -1) {
    return null;
  }

  const query = before.slice(atIndex + 1);
  if (query.includes("\n") || query.includes(" ")) {
    return null;
  }

  const charBeforeAt = atIndex > 0 ? before[atIndex - 1] : "";
  if (charBeforeAt && !/[\s([{,，、]/.test(charBeforeAt)) {
    return null;
  }

  return { start: atIndex, query };
}

export function filterVariablesForMention(
  variables: ReviewPromptVariable[],
  query: string,
): ReviewPromptVariable[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return variables.filter((item) => !item.token.includes("\n"));
  }

  return variables.filter((item) => {
    if (item.token.includes("\n")) {
      return false;
    }
    const haystack = `${item.label} ${item.token} ${item.description ?? ""}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function applyMentionSelection(
  value: string,
  mention: MentionState,
  cursor: number,
  token: string,
): { nextValue: string; cursor: number } {
  const nextValue = value.slice(0, mention.start) + token + value.slice(cursor);
  const nextCursor = mention.start + token.length;
  return { nextValue, cursor: nextCursor };
}

function buildDimensionBlockLines(dimensions: ReviewDimensionItem[]): string[] {
  return dimensions
    .map((item) => buildDimensionSlotLine(item.dimensionName))
    .filter(Boolean);
}

function findDimensionBlockLineIndices(lines: string[]): number[] {
  const indices: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (isDimensionSlotLine(lines[index])) {
      indices.push(index);
    }
  }
  return indices;
}

function removeLinesAtIndices(lines: string[], indices: number[]): string[] {
  const indexSet = new Set(indices);
  return lines.filter((_, lineIndex) => !indexSet.has(lineIndex));
}

function insertBlockLines(lines: string[], blockLines: string[], atIndex: number): string[] {
  return [...lines.slice(0, atIndex), ...blockLines, ...lines.slice(atIndex)];
}

function findDataBlockStartIndex(template: string): number {
  const marker = "---\n原始题目数据：";
  const markerIndex = template.indexOf(marker);
  if (markerIndex >= 0) {
    return markerIndex;
  }

  const originalIndex = template.indexOf("{{original_item_data}}");
  if (originalIndex >= 0) {
    const before = template.slice(0, originalIndex);
    const separatorIndex = before.lastIndexOf("---");
    return separatorIndex >= 0 ? separatorIndex : originalIndex;
  }

  return -1;
}

/** 替换或插入维度块，避免重复追加 */
export function replaceOrInsertDimensionBlock(
  template: string,
  dimensions: ReviewDimensionItem[],
): { text: string; replaced: boolean } {
  const blockLines = buildDimensionBlockLines(dimensions);
  if (blockLines.length === 0) {
    return { text: template, replaced: false };
  }

  const lines = template.replace(/\r\n/g, "\n").split("\n");
  const dimensionLineIndices = findDimensionBlockLineIndices(lines);

  if (dimensionLineIndices.length > 0) {
    const insertAt = Math.min(...dimensionLineIndices);
    const withoutDimensions = removeLinesAtIndices(lines, dimensionLineIndices);
    return {
      text: insertBlockLines(withoutDimensions, blockLines, insertAt).join("\n"),
      replaced: true,
    };
  }

  const dataStart = findDataBlockStartIndex(template);
  if (dataStart >= 0) {
    const before = template.slice(0, dataStart).trimEnd();
    const after = template.slice(dataStart);
    return {
      text: `${before}\n${blockLines.join("\n")}\n\n${after}`,
      replaced: false,
    };
  }

  if (template.includes(REVIEW_PROMPT_INTRO)) {
    const introEnd = template.indexOf(REVIEW_PROMPT_INTRO) + REVIEW_PROMPT_INTRO.length;
    const before = template.slice(0, introEnd).trimEnd();
    const after = template.slice(introEnd);
    return {
      text: `${before}\n${blockLines.join("\n")}${after}`,
      replaced: false,
    };
  }

  const trimmed = template.trimEnd();
  return {
    text: trimmed ? `${trimmed}\n${blockLines.join("\n")}\n` : `${blockLines.join("\n")}\n`,
    replaced: false,
  };
}

/** 替换或插入题目/提交数据块，避免重复 {{original_item_data}} 等变量 */
export function replaceOrInsertDataBlock(template: string): { text: string; replaced: boolean } {
  const normalized = template.replace(/\r\n/g, "\n");
  const dataStart = findDataBlockStartIndex(normalized);

  if (dataStart >= 0) {
    const before = normalized.slice(0, dataStart).trimEnd();
    return {
      text: before ? `${before}\n\n${REVIEW_PROMPT_DATA_SUFFIX}` : REVIEW_PROMPT_DATA_SUFFIX,
      replaced: true,
    };
  }

  const trimmed = normalized.trimEnd();
  return {
    text: trimmed ? `${trimmed}\n\n${REVIEW_PROMPT_DATA_SUFFIX}` : REVIEW_PROMPT_DATA_SUFFIX,
    replaced: false,
  };
}
