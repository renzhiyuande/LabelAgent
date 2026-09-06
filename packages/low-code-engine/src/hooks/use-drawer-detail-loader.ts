import { useCallback, useRef, useState } from "react";

export function useDrawerDetailLoader() {
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const cancel = useCallback(() => {
    requestIdRef.current += 1;
    setLoading(false);
  }, []);

  const load = useCallback(async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const result = await task();
      if (requestId !== requestIdRef.current) {
        return undefined;
      }
      return result;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  return {
    loading,
    load,
    cancel,
  };
}
