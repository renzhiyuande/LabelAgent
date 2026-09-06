"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { appMessage } from "../../../lib/message";
import {
  fetchRemoteModelsByProvider,
  fetchRemoteModelsPreview,
  type RemoteLlmModelOption,
} from "../llm-admin-api";

interface RemoteModelDiscoveryPanelProps {
  providerId?: string | number;
  baseUrl?: string;
  apiKey?: string;
  providerCode?: string;
  onPick: (model: RemoteLlmModelOption) => void;
}

export function RemoteModelDiscoveryPanel({
  providerId,
  baseUrl,
  apiKey,
  providerCode,
  onPick,
}: RemoteModelDiscoveryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<RemoteLlmModelOption[]>([]);
  const [keyword, setKeyword] = useState("");

  const canDiscover = providerId != null || (Boolean(baseUrl?.trim()) && Boolean(apiKey?.trim()));

  const filteredModels = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return models;
    }
    return models.filter(
      (model) =>
        model.modelCode.toLowerCase().includes(normalized) ||
        model.modelName.toLowerCase().includes(normalized),
    );
  }, [keyword, models]);

  async function handleDiscover() {
    if (!canDiscover) {
      appMessage.info("请先填写 API 端点与密钥，或选择已保存的提供商");
      return;
    }
    setLoading(true);
    try {
      const next =
        providerId != null
          ? await fetchRemoteModelsByProvider(providerId)
          : await fetchRemoteModelsPreview({
              baseUrl: baseUrl!.trim(),
              apiKey: apiKey!.trim(),
              providerCode: providerCode?.trim(),
            });
      setModels(next);
      if (next.length === 0) {
        appMessage.info("未从厂商接口获取到可用模型");
      }
    } catch (error) {
      appMessage.errorFrom(error, "拉取远端模型失败");
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-primary/25 bg-primary/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">从厂商拉取模型</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            通过 OpenAI 兼容的 <code className="text-[11px]">GET /v1/models</code> 获取候选模型，点击即可填入表单。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={!canDiscover || loading} onClick={() => void handleDiscover()}>
          {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
          {loading ? "拉取中…" : "拉取模型列表"}
        </Button>
      </div>

      {models.length > 0 ? (
        <>
          <input
            className="lh-ui-input w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            placeholder="筛选模型编码或名称"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <div className="max-h-48 space-y-2 overflow-auto pr-1">
            {filteredModels.length === 0 ? (
              <p className="text-xs text-muted-foreground">没有匹配的模型</p>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model.modelCode}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm transition hover:border-primary/30 hover:bg-primary/10"
                  onClick={() => onPick(model)}
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-foreground">{model.modelCode}</strong>
                    <span className="block truncate text-xs text-muted-foreground">{model.modelName}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {model.modelType}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
