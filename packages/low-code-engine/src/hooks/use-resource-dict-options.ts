import { useEffect, useState } from "react";
import { fetchDictOptionsCached } from "../adapters/dict-options";
import type { OptionItem, ResourceMeta } from "../schema/types";
import { collectResourceDictCodes } from "../utils/collect-resource-dicts";

export function useResourceDictOptions(resource: ResourceMeta): Record<string, OptionItem[]> {
  const dictCodes = collectResourceDictCodes(resource);
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
  }, [resource.resource, dictCodes.join("|")]);

  return dictOptions;
}
