import { create } from "zustand";
import {
  getThemePreset,
  THEME_PRESET_MAP,
  THEME_PRESETS,
  type ThemeVariables,
} from "./theme-presets";

export type AppThemeMode = "light" | "dark";

/** @deprecated 兼容旧版色盘 ID，新逻辑以 presetId 为准 */
export type AppThemeColor = "blue" | "green" | "purple" | "orange" | "rose" | "slate" | "custom";

export const THEME_COLORS: AppThemeColor[] = ["blue", "green", "purple", "orange", "rose", "slate"];

export const THEME_COLOR_LABELS: Record<AppThemeColor, string> = {
  blue: "天空蓝",
  green: "翡翠绿",
  purple: "典雅紫",
  orange: "活力橙",
  rose: "玫瑰红",
  slate: "石墨灰",
  custom: "自定义",
};

export const THEME_COLOR_SWATCHES: Record<AppThemeColor, string> = {
  blue: "#0EA5E9",
  green: "#22C55E",
  purple: "#8B5CF6",
  orange: "#F97316",
  rose: "#E11D48",
  slate: "#64748B",
  custom: "linear-gradient(135deg, #667eea, #764ba2)",
};

export type ThemePresetId = string;

/** 圆角预设 */
export type ThemeRadius = "none" | "sm" | "md" | "lg" | "xl";
export const THEME_RADIUS_MAP: Record<ThemeRadius, string> = {
  none: "0rem",
  sm: "0.375rem",
  md: "0.625rem",
  lg: "0.85rem",
  xl: "1.25rem",
};
export const THEME_RADIUS_LABELS: Record<ThemeRadius, string> = {
  none: "无",
  sm: "小",
  md: "中",
  lg: "大",
  xl: "超大",
};

/** 字体预设 */
export type ThemeFont = "inter" | "noto-sans" | "system" | "geist";
export const THEME_FONT_LABELS: Record<ThemeFont, string> = {
  inter: "Inter",
  "noto-sans": "Noto Sans",
  system: "Instrument Sans",
  geist: "Geist",
};

export interface CustomPalette {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

interface ThemeState {
  mode: AppThemeMode;
  /** @deprecated 使用 presetId */
  color: AppThemeColor;
  presetId: ThemePresetId;
  customPalette: CustomPalette | null;
  radius: ThemeRadius;
  fontFamily: ThemeFont;
  headingFontFamily: ThemeFont;
  hydrate: () => void;
  setMode: (mode: AppThemeMode) => void;
  setColor: (color: AppThemeColor) => void;
  setPreset: (presetId: ThemePresetId) => void;
  toggleMode: () => void;
  setCustomPalette: (palette: CustomPalette) => void;
  setRadius: (radius: ThemeRadius) => void;
  setFontFamily: (font: ThemeFont) => void;
  setHeadingFontFamily: (font: ThemeFont) => void;
}

/* ─── 默认中性色（所有色盘共用） ─── */
const NEUTRAL_LIGHT = {
  background: "210 40% 98%",
  foreground: "222.2 47.4% 11.2%",
  card: "0 0% 100%",
  "card-foreground": "222.2 47.4% 11.2%",
  popover: "0 0% 100%",
  "popover-foreground": "222.2 47.4% 11.2%",
  muted: "210 40% 96.1%",
  "muted-foreground": "215.4 16.3% 46.9%",
  destructive: "0 84.2% 60.2%",
  "destructive-foreground": "210 40% 98%",
};

/** 暗色中性色：从主题色相推导，避免所有主题都落成深蓝 */
function deriveDarkNeutrals(h: number, s: number) {
  const surfaceS = Math.max(Math.min(s * 0.48, 48), 16);
  const textS = Math.max(Math.min(s * 0.12, 18), 5);

  return {
    background: `${h} ${surfaceS}% 7%`,
    foreground: `${h} ${textS}% 94%`,
    card: `${h} ${surfaceS}% 10%`,
    "card-foreground": `${h} ${textS}% 94%`,
    popover: `${h} ${surfaceS}% 10%`,
    "popover-foreground": `${h} ${textS}% 94%`,
    muted: `${h} ${Math.max(surfaceS * 0.9, 8)}% 15%`,
    "muted-foreground": `${h} ${Math.max(textS * 0.7, 5)}% 62%`,
    destructive: "0 62.8% 30.6%",
    "destructive-foreground": `${h} ${textS}% 94%`,
  };
}

/* ─── 色彩推导：从 primary HSL 自动生成全套语义色 ─── */

export function deriveSemanticColors(h: number, s: number, l: number) {
  const darkL = Math.min(l + 12, 62);
  const secondaryS = Math.max(s * 0.35, 20);
  const borderL = 91;
  const darkBorderL = 17;
  const darkTextS = Math.max(Math.min(s * 0.12, 18), 5);

  const light = {
    ...NEUTRAL_LIGHT,
    primary: `${h} ${s}% ${l}%`,
    "primary-foreground": "0 0% 100%",
    secondary: `${h} ${secondaryS}% 96%`,
    "secondary-foreground": `${h} ${Math.min(s, 50)}% 15%`,
    accent: `${h} ${secondaryS}% 96%`,
    "accent-foreground": `${h} ${Math.min(s, 50)}% 15%`,
    border: `${h} 20% ${borderL}%`,
    input: `${h} 20% ${borderL}%`,
    ring: `${h} ${s}% ${l}%`,
  };

  const dark = {
    ...deriveDarkNeutrals(h, s),
    primary: `${h} ${s}% ${darkL}%`,
    "primary-foreground": "0 0% 100%",
    secondary: `${h} ${secondaryS}% ${darkBorderL}%`,
    "secondary-foreground": `${h} ${darkTextS}% 94%`,
    accent: `${h} ${secondaryS}% ${darkBorderL}%`,
    "accent-foreground": `${h} ${darkTextS}% 94%`,
    border: `${h} 20% ${darkBorderL}%`,
    input: `${h} 20% ${darkBorderL}%`,
    ring: `${h} ${s}% ${darkL}%`,
  };

  return { light, dark };
}

/* ─── CSS 动态注入 ─── */
const THEME_STYLE_ID = "lh-custom-theme";
const RADIUS_STYLE_ID = "lh-custom-radius";
const FONT_STYLE_ID = "lh-custom-font";

function injectThemeVariables(themeKey: string, light: ThemeVariables, dark: ThemeVariables) {
  const existing = document.getElementById(THEME_STYLE_ID);
  if (existing) existing.remove();

  const style = document.createElement("style");
  style.id = THEME_STYLE_ID;

  const toCSS = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `  --${k}: ${v};`)
      .join("\n");

  style.textContent = [
    `:root[data-theme-color="${themeKey}"] {`,
    toCSS(light),
    "}",
    `:root[data-theme-color="${themeKey}"].dark,`,
    `:root.dark {`,
    toCSS(dark),
    "}",
  ].join("\n");
  document.head.appendChild(style);
}

function injectCustomPaletteStyle(palette: CustomPalette, themeColor: AppThemeColor) {
  const { light, dark } = deriveSemanticColors(palette.h, palette.s, palette.l);
  injectThemeVariables(themeColor, light, dark);
}

function removeCustomPaletteStyle() {
  document.getElementById(THEME_STYLE_ID)?.remove();
}

function injectRadiusStyle(radius: ThemeRadius) {
  const existing = document.getElementById(RADIUS_STYLE_ID);
  if (existing) existing.remove();

  const value = THEME_RADIUS_MAP[radius];
  if (radius === "md") return; // md = default, no override needed

  const style = document.createElement("style");
  style.id = RADIUS_STYLE_ID;
  style.textContent = `:root { --radius: ${value}; }`;
  document.head.appendChild(style);
}

function removeRadiusStyle() {
  document.getElementById(RADIUS_STYLE_ID)?.remove();
}

export const THEME_FONT_FAMILIES: Record<ThemeFont, string> = {
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  "noto-sans": '"Noto Sans", ui-sans-serif, system-ui, sans-serif',
  system: '"Instrument Sans", "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
  geist: '"Geist Sans", "Geist", ui-sans-serif, system-ui, sans-serif',
};

function injectFontStyle(font: ThemeFont, headingFont: ThemeFont) {
  const existing = document.getElementById(FONT_STYLE_ID);
  if (existing) existing.remove();

  const body = THEME_FONT_FAMILIES[font];
  const heading = THEME_FONT_FAMILIES[headingFont];

  const style = document.createElement("style");
  style.id = FONT_STYLE_ID;
  style.textContent = `:root { --app-font-sans: ${body}; --app-font-heading: ${heading}; }`;
  document.head.appendChild(style);
}

/* ─── DOM 应用 ─── */
function applyTheme(
  mode: AppThemeMode,
  presetId: ThemePresetId,
  customPalette?: CustomPalette | null,
) {
  if (typeof document === "undefined") return;

  const themeKey = presetId === "custom" ? "custom" : presetId;

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(mode);
  document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.themeColor = themeKey;

  if (presetId === "custom" && customPalette) {
    injectCustomPaletteStyle(customPalette, "custom");
  } else {
    const preset = getThemePreset(presetId);
    if (preset) {
      injectThemeVariables(presetId, preset.light, preset.dark);
    } else {
      removeCustomPaletteStyle();
    }
  }

  const CALL_OUT_STYLE_ID = "lh-callout-bg-override";
  document.getElementById(CALL_OUT_STYLE_ID)?.remove();
  if (mode === "dark") {
    const hue = presetId === "custom" && customPalette
      ? customPalette.h
      : (getThemePreset(presetId)?.light.primary.split(" ")[0] ?? "217");
    const style = document.createElement("style");
    style.id = CALL_OUT_STYLE_ID;
    const bg = `hsl(${hue} 30% 25%)`;
    style.textContent = `.lh-drawer-callout { background: ${bg} !important; }`;
    document.head.appendChild(style);
  }
}

/* ─── 初始值读取 ─── */

function getInitialMode(): AppThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem("labelhub.theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialPresetId(): ThemePresetId {
  if (typeof window === "undefined") return "blue";
  const savedPreset = localStorage.getItem("labelhub.theme-preset");
  if (savedPreset === "custom") return "custom";
  if (savedPreset && THEME_PRESET_MAP[savedPreset]) return savedPreset;
  const savedColor = localStorage.getItem("labelhub.theme-color");
  if (savedColor === "custom") return "custom";
  if (savedColor && THEME_PRESET_MAP[savedColor]) return savedColor;
  return "blue";
}

function presetIdToLegacyColor(presetId: ThemePresetId): AppThemeColor {
  if (presetId === "custom") return "custom";
  if (THEME_COLORS.includes(presetId as AppThemeColor)) return presetId as AppThemeColor;
  return "custom";
}

function getInitialCustomPalette(): CustomPalette | null {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("labelhub.theme-custom-palette");
  if (!saved) return null;
  try {
    return JSON.parse(saved) as CustomPalette;
  } catch {
    return null;
  }
}

function getInitialRadius(): ThemeRadius {
  if (typeof window === "undefined") return "md";
  const saved = localStorage.getItem("labelhub.theme-radius");
  if (saved && saved in THEME_RADIUS_MAP) return saved as ThemeRadius;
  return "md";
}

function getInitialFont(): ThemeFont {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem("labelhub.theme-font");
  if (saved && saved in THEME_FONT_LABELS) return saved as ThemeFont;
  return "system";
}

function getInitialHeadingFont(): ThemeFont {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem("labelhub.theme-heading-font");
  if (saved && saved in THEME_FONT_LABELS) return saved as ThemeFont;
  return "system";
}

/* ─── Store ─── */

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: getInitialMode(),
  presetId: getInitialPresetId(),
  color: presetIdToLegacyColor(getInitialPresetId()),
  customPalette: getInitialCustomPalette(),
  radius: getInitialRadius(),
  fontFamily: getInitialFont(),
  headingFontFamily: getInitialHeadingFont(),

  hydrate: () => {
    const mode = getInitialMode();
    const presetId = getInitialPresetId();
    const customPalette = getInitialCustomPalette();
    const radius = getInitialRadius();
    const font = getInitialFont();
    const headingFont = getInitialHeadingFont();
    const preset = getThemePreset(presetId);
    const effectiveRadius = preset?.radius ?? radius;
    applyTheme(mode, presetId, customPalette);
    injectRadiusStyle(effectiveRadius);
    injectFontStyle(font, headingFont);
    set({
      mode,
      presetId,
      color: presetIdToLegacyColor(presetId),
      customPalette,
      radius: effectiveRadius,
      fontFamily: font,
      headingFontFamily: headingFont,
    });
  },

  setMode: (mode) => {
    localStorage.setItem("labelhub.theme", mode);
    applyTheme(mode, get().presetId, get().customPalette);
    set({ mode });
  },

  setColor: (color) => {
    get().setPreset(color);
  },

  setPreset: (presetId) => {
    localStorage.setItem("labelhub.theme-preset", presetId);
    localStorage.setItem("labelhub.theme-color", presetIdToLegacyColor(presetId));
    const preset = getThemePreset(presetId);
    if (preset?.radius) {
      localStorage.setItem("labelhub.theme-radius", preset.radius);
      injectRadiusStyle(preset.radius);
    }
    applyTheme(get().mode, presetId, get().customPalette);
    set({
      presetId,
      color: presetIdToLegacyColor(presetId),
      ...(preset?.radius ? { radius: preset.radius } : {}),
    });
  },

  toggleMode: () => {
    const next = get().mode === "light" ? "dark" : "light";
    get().setMode(next);
  },

  setCustomPalette: (palette) => {
    localStorage.setItem("labelhub.theme-custom-palette", JSON.stringify(palette));
    localStorage.setItem("labelhub.theme-preset", "custom");
    localStorage.setItem("labelhub.theme-color", "custom");
    applyTheme(get().mode, "custom", palette);
    set({ presetId: "custom", color: "custom", customPalette: palette });
  },

  setRadius: (radius) => {
    localStorage.setItem("labelhub.theme-radius", radius);
    injectRadiusStyle(radius);
    set({ radius });
  },

  setFontFamily: (font) => {
    localStorage.setItem("labelhub.theme-font", font);
    injectFontStyle(font, get().headingFontFamily);
    set({ fontFamily: font });
  },

  setHeadingFontFamily: (font) => {
    localStorage.setItem("labelhub.theme-heading-font", font);
    injectFontStyle(get().fontFamily, font);
    set({ headingFontFamily: font });
  },
}));
