"use client";

import { useEffect, useState } from "react";
import { normalizeRemoteOptionItems } from "../adapters/request";
import type { OptionItem } from "../schema/types";
import { request } from "../adapters/lowcode-utils";

const USERS_OPTIONS_PATH = "/api/v1/engine/options/users";

export function useUserMentionOptions(query: string, enabled: boolean): OptionItem[] {
  const [options, setOptions] = useState<OptionItem[]>([]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      const keyword = query.trim();
      if (keyword) {
        params.set("keyword", keyword);
      }
      const suffix = params.toString() ? `?${params.toString()}` : "";

      void request<OptionItem[]>(`${USERS_OPTIONS_PATH}${suffix}`)
        .then((items) => {
          if (!cancelled) {
            setOptions(normalizeRemoteOptionItems(items ?? []));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOptions([]);
          }
        });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, enabled]);

  return options;
}
