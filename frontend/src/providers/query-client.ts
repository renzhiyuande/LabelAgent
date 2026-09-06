import { QueryClient } from "@tanstack/react-query";

export const STALE_TIME = {
  STATIC: 5 * 60 * 1000,
  LIST: 30 * 1000,
  DETAIL: Infinity,
} as const;

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: STALE_TIME.LIST,
    },
  },
});
