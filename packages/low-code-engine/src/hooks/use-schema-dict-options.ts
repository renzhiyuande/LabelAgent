import { useEffect, useState } from "react";
import { fetchDictOptionsCached } from "../adapters/dict-options";
import type { OptionItem } from "../schema/types";

/** 按 schema 所需字典编码加载选项，供 Reviewer 只读展示 value→label 映射 */
export function useSchemaDictOptions(dictCodes: string[]): Record<string, OptionItem[]> {
  const [dictOptions, setDictOptions] = useState<Record<string, OptionItem[]>>({});

  useEffect(() => {
    if (dictCodes.length === 0) {
      setDictOptions({});
      return;
    }

    let active = true;
    async function loadAll() {
      const entries = await Promise.all(
        dictCodes.map(async (dictCode) => [dictCode, await fetchDictOptionsCached(dictCode)] as const),
      );
      if (active) {
        setDictOptions(Object.fromEntries(entries));
      }
    }

    void loadAll();
    return () => {
      active = false;
    };
  }, [dictCodes.join("|")]);

  return dictOptions;
}
