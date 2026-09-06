import type { OptionItem, PromptFormSchema, RemoteOptionQuery } from "../schema/types";

export type PromptFormOpener = (
  schema: PromptFormSchema,
  loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>,
) => Promise<Record<string, unknown> | null>;

let promptFormOpener: PromptFormOpener | null = null;

export function registerPromptFormOpener(opener: PromptFormOpener | null) {
  promptFormOpener = opener;
}

export function openPromptForm(
  schema: PromptFormSchema,
  loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>,
): Promise<Record<string, unknown> | null> {
  if (!promptFormOpener) {
    if (import.meta.env.DEV) {
      console.warn("[openPromptForm] LHPromptFormHost 尚未挂载");
    }
    return Promise.resolve(null);
  }
  return promptFormOpener(schema, loadRemoteOptions);
}
