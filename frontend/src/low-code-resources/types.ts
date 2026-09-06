// LLM Provider Types
export interface LlmProvider {
  id: number;
  tenantId: number;
  providerCode: string;
  providerName: string;
  baseUrl: string;
  apiKey?: string;
  configJson: Record<string, unknown>;
  isSystemProvider: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface LlmProviderFormValues {
  providerName: string;
  providerCode: string;
  baseUrl: string;
  apiKey: string;
  configJson?: Record<string, unknown>;
}

// Provider Configuration Types
export interface OpenAIConfig {
  organization?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AnthropicConfig {
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface GoogleConfig {
  projectId?: string;
  location?: string;
  defaultModel?: string;
}

export interface AlibabaConfig {
  workspace?: string;
  defaultModel?: string;
}

export interface CustomConfig {
  authType?: "bearer" | "api-key" | "custom";
  headers?: Record<string, string>;
  [key: string]: unknown;
}

export type ProviderConfig = OpenAIConfig | AnthropicConfig | GoogleConfig | AlibabaConfig | CustomConfig;
