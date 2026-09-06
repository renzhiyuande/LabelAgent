import type { LlmApplyMapping, LlmFieldMeta } from "../../schema/types";

export function isLlmAgentMode(llm?: LlmFieldMeta): boolean {
  if (llm?.mode === "agent") {
    return true;
  }
  if (llm?.mode === "chat") {
    return false;
  }
  return resolveLlmApplyTargetPaths(llm).length > 0;
}

/** 设计器配置：要自动填充的标注字段 path 列表 */
export function resolveLlmApplyTargetPaths(llm?: LlmFieldMeta): string[] {
  const targets = llm?.applyTargets?.map((path) => path.trim()).filter(Boolean) ?? [];
  if (targets.length > 0) {
    return [...new Set(targets)];
  }
  const legacy = llm?.applyMappings?.map((item) => item.targetPath?.trim()).filter(Boolean) ?? [];
  return [...new Set(legacy)];
}

function readApplyMappingEntry(item: LlmApplyMapping & { from?: string; to?: string }): LlmApplyMapping | null {
  const targetPath = item.targetPath?.trim() || item.to?.trim();
  const sourceKey = item.sourceKey?.trim() || item.from?.trim();
  if (!targetPath || !sourceKey) {
    return null;
  }
  return { sourceKey, targetPath };
}

/** 运行时完整映射（通常来自服务端响应；兼容 legacy from/to） */
export function resolveLlmApplyMappings(llm?: LlmFieldMeta): LlmApplyMapping[] {
  return (
    llm?.applyMappings
      ?.map((item) => readApplyMappingEntry(item as LlmApplyMapping & { from?: string; to?: string }))
      .filter((item): item is LlmApplyMapping => item != null) ?? []
  );
}

export function buildLlmApplyUpdates(
  parsedOutput: Record<string, unknown> | null | undefined,
  mappings: LlmApplyMapping[],
): Array<{ path: string; value: unknown }> {
  if (!parsedOutput || mappings.length === 0) {
    return [];
  }
  const updates: Array<{ path: string; value: unknown }> = [];
  for (const mapping of mappings) {
    if (!Object.prototype.hasOwnProperty.call(parsedOutput, mapping.sourceKey)) {
      continue;
    }
    const value = parsedOutput[mapping.sourceKey];
    if (value === undefined) {
      continue;
    }
    updates.push({ path: mapping.targetPath, value });
  }
  return updates;
}

/** 尝试从 LLM 原始文本（含 Markdown 代码块）解析 Agent JSON 对象 */
export function tryParseAgentJsonOutput(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const candidates = [trimmed];
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced?.[1]) {
    candidates.unshift(fenced[1].trim());
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

/** Agent 模式：将结构化 JSON 转为可读摘要（不展示原始 JSON） */
export function formatAgentResultSummary(output: Record<string, unknown>): string {
  const parts: string[] = [];
  if (output.winner != null && String(output.winner).trim()) {
    parts.push(`推荐：${String(output.winner).trim()}`);
  }
  if (typeof output.confidence === "number" && Number.isFinite(output.confidence)) {
    parts.push(`置信度 ${output.confidence.toFixed(2)}`);
  }
  const dimensions = output.dimension_hints;
  if (Array.isArray(dimensions) && dimensions.length > 0) {
    parts.push(`建议维度：${dimensions.map((item) => String(item)).join("、")}`);
  }
  const risks = output.risk_flags;
  if (Array.isArray(risks) && risks.length > 0) {
    parts.push(`风险点：${risks.map((item) => String(item)).join("；")}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "已生成结构化参考，可应用到标注字段。";
}
