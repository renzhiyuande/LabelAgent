import { Languages } from "lucide-react";
import { Button } from "../components/ui/button";
import type { AppLocale } from "./locale";
import { useLocale } from "./locale";

const nextLocale: Record<AppLocale, AppLocale> = { zh: "en", en: "zh" };
const localeLabel: Record<AppLocale, string> = { zh: "中", en: "EN" };
const localeAria: Record<AppLocale, string> = { zh: "切换至英文", en: "Switch to Chinese" };

export function LocaleSwitch() {
  const locale = useLocale((state) => state.locale);
  const setLocale = useLocale((state) => state.setLocale);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full text-sm font-semibold"
      onClick={() => setLocale(nextLocale[locale])}
      aria-label={localeAria[locale]}
    >
      <span className="hidden sm:inline">{localeLabel[locale]}</span>
      <Languages className="h-4 w-4 sm:hidden" />
    </Button>
  );
}
