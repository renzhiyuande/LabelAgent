"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { LlmCatalogProviderOption } from "@/features/template-review-config/review-config-api";
import type { LlmProviderWeight } from "@/low-code/schema/types";

interface LlmProviderWeightEditorProps {
  providers: LlmProviderWeight[];
  catalog: LlmCatalogProviderOption[];
  loadingCatalog: boolean;
  onChange: (providers: LlmProviderWeight[]) => void;
}

// ── 单行子组件 ──

interface RowProps {
  pw: LlmProviderWeight;
  index: number;
  catalog: LlmCatalogProviderOption[];
  loadingCatalog: boolean;
  onUpdate: (index: number, patch: Partial<LlmProviderWeight>) => void;
  onRemove: (index: number) => void;
}

function ProviderRow({ pw, index, catalog, loadingCatalog, onUpdate, onRemove }: RowProps) {
  const providerOptions = useMemo(
    () => ensureProviderOption(
      catalog.map((p) => ({
        value: p.providerCode,
        label: `${p.providerName}（${p.providerCode}）`,
      })),
      pw.code,
      catalog,
    ),
    [catalog, pw.code],
  );

  const modelOptions = useMemo(() => {
    const provider = catalog.find((p) => p.providerCode === pw.code);
    const base = (provider?.models ?? []).map((m) => ({
      value: m.modelCode,
      label: `${m.modelName}（${m.modelCode}）`,
    }));
    return ensureModelOption(base, pw.model, catalog, pw.code);
  }, [catalog, pw.code, pw.model]);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white/60 p-2 dark:border-slate-700 dark:bg-slate-950/30">
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-500">提供商</span>
          <Combobox
            value={pw.code}
            options={providerOptions}
            disabled={loadingCatalog}
            placeholder={loadingCatalog ? "加载目录…" : "选择"}
            emptyText="暂无已发布提供商"
            onValueChange={(nextCode) => {
              const provider = catalog.find((p) => p.providerCode === nextCode);
              const firstModel = provider?.models?.[0];
              onUpdate(index, {
                code: nextCode || "",
                model: firstModel?.modelCode ?? "",
              });
            }}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-500">模型</span>
          <Combobox
            value={pw.model}
            options={modelOptions}
            disabled={loadingCatalog || !pw.code}
            placeholder={loadingCatalog ? "加载目录…" : pw.code ? "选择" : "请先选提供商"}
            emptyText={pw.code ? "该提供商下暂无已发布模型" : ""}
            onValueChange={(nextModel) => onUpdate(index, { model: nextModel || "" })}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="mt-5 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 
          dark:hover:bg-slate-800 dark:hover:text-red-400"
        title="移除"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── 工具函数 ──

function ensureProviderOption(
  options: { value: string; label: string }[],
  code: string,
  catalog: LlmCatalogProviderOption[],
): { value: string; label: string }[] {
  if (!code || options.some((o) => o.value === code)) return options;
  const match = catalog.find((p) => p.providerCode === code);
  return [
    { value: code, label: match ? `${match.providerName}（${code}）` : `${code}（当前值）` },
    ...options,
  ];
}

function ensureModelOption(
  options: { value: string; label: string }[],
  modelKey: string,
  catalog: LlmCatalogProviderOption[],
  providerCode: string,
): { value: string; label: string }[] {
  if (!modelKey || options.some((o) => o.value === modelKey)) return options;
  const provider = catalog.find((p) => p.providerCode === providerCode);
  const match = provider?.models.find((m) => m.modelCode === modelKey);
  return [
    { value: modelKey, label: match ? `${match.modelName}（${modelKey}）` : `${modelKey}（当前值）` },
    ...options,
  ];
}

// ── 主组件 ──

export function LlmProviderWeightEditor({
  providers,
  catalog,
  loadingCatalog,
  onChange,
}: LlmProviderWeightEditorProps) {
  const addProvider = () => {
    const firstProvider = catalog[0];
    if (!firstProvider) return;
    const firstModel = firstProvider.models?.[0];
    onChange([
      ...providers,
      {
        code: firstProvider.providerCode,
        model: firstModel?.modelCode ?? "",
        weight: 1,
      },
    ]);
  };

  const removeProvider = (index: number) => {
    onChange(providers.filter((_, i) => i !== index));
  };

  const updateProvider = (index: number, patch: Partial<LlmProviderWeight>) => {
    onChange(providers.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  if (providers.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          暂无配置。请添加至少一个 LLM 提供商用于 AI 建议。
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addProvider}
          disabled={loadingCatalog || catalog.length === 0}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          添加提供商
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-4 text-slate-500">
        列表中的提供商按优先级排序（#1 最优先）。当首选提供商不可用时自动切换到下一个。
      </p>
      {providers.map((pw, index) => (
        <ProviderRow
          key={`${pw.code}-${index}`}
          pw={pw}
          index={index}
          catalog={catalog}
          loadingCatalog={loadingCatalog}
          onUpdate={updateProvider}
          onRemove={removeProvider}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addProvider}
        disabled={loadingCatalog || catalog.length === 0}
        className="w-full"
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        添加提供商
      </Button>
    </div>
  );
}
