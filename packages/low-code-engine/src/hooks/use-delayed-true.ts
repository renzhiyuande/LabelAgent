import { useEffect, useState } from "react";

export function useDelayedTrue(value: boolean, delayMs = 280): boolean {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!value) {
      setDelayed(false);
      return;
    }

    const timer = window.setTimeout(() => setDelayed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return delayed;
}
