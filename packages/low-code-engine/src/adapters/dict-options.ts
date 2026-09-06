import { request } from "./lowcode-utils";
import type { OptionItem } from "../schema/types";

export interface DictItemOptionDto {
  id: number;
  dictTypeId: number;
  itemCode: string;
  itemLabel: string;
  itemValue: string;
  sortNo: number;
  isDefault: boolean;
  status: string;
  className?: string | null;
  tone?: string | null;
}

const dictOptionsCache = new Map<string, Promise<OptionItem[]>>();

export function mapDictItemToOption(item: DictItemOptionDto): OptionItem {
  return {
    label: item.itemLabel,
    value: item.itemValue,
    className: item.className ?? undefined,
    tone: item.tone ?? undefined,
  };
}

export async function fetchDictOptions(dictCode: string): Promise<OptionItem[]> {
  const items = await request<DictItemOptionDto[]>(`/api/v1/system/dicts/${encodeURIComponent(dictCode)}`);
  return items.map(mapDictItemToOption);
}

export function fetchDictOptionsCached(dictCode: string): Promise<OptionItem[]> {
  const cached = dictOptionsCache.get(dictCode);
  if (cached) {
    return cached;
  }
  const pending = fetchDictOptions(dictCode).catch((error) => {
    dictOptionsCache.delete(dictCode);
    throw error;
  });
  dictOptionsCache.set(dictCode, pending);
  return pending;
}

export function clearDictOptionsCache(): void {
  dictOptionsCache.clear();
}
