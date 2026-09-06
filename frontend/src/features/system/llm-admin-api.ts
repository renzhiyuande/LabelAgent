import { request } from "../../utils/apiClient";

export interface RemoteLlmModelOption {
  modelCode: string;
  modelName: string;
  modelType: string;
}

export async function fetchRemoteModelsByProvider(providerId: string | number): Promise<RemoteLlmModelOption[]> {
  return request<RemoteLlmModelOption[]>(`/api/v1/admin/llm-providers/${encodeURIComponent(String(providerId))}/remote-models`);
}

export async function fetchRemoteModelsPreview(input: {
  baseUrl: string;
  apiKey: string;
  providerCode?: string;
}): Promise<RemoteLlmModelOption[]> {
  return request<RemoteLlmModelOption[]>("/api/v1/admin/llm-providers/discover-models", {
    method: "POST",
    body: JSON.stringify({
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      providerCode: input.providerCode ?? "",
    }),
  });
}
