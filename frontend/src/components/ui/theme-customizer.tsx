import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  THEME_RADIUS_MAP,
  THEME_RADIUS_LABELS,
  THEME_FONT_LABELS,
  THEME_FONT_FAMILIES,
  useThemeStore,
  deriveSemanticColors,
  type ThemeRadius,
  type ThemeFont,
  type CustomPalette,
} from "@/stores/theme";
import {
  THEME_PRESETS,
  THEME_PRESET_CATEGORIES,
  type ThemePresetCategory,
} from "@/stores/theme-presets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Moon, Palette, Pipette, Sparkles, Sun } from "lucide-react";

/* ─── 区块标题 ─── */

function SectionLabel({ icon: Icon, children }: { icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </p>
  );
}

function SettingsDivider() {
  return <div className="h-px bg-border/60" />;
}

/* ─── 主题预设卡片 ─── */

function ThemePresetCard({
  id,
  name,
  preview,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  preview: [string, string, string];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border-2 text-left transition-all hover:shadow-sm",
        selected
          ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
          : "border-border/60 hover:border-border",
      )}
      title={name}
    >
      <div className="flex h-10 w-full">
        <div className="flex-[2]" style={{ background: preview[0] }} />
        <div className="flex-1" style={{ background: preview[1] }} />
        <div className="flex-1" style={{ background: preview[2] }} />
      </div>
      <div className="flex items-center justify-between bg-card px-2 py-1.5">
        <span className="truncate text-[11px] font-medium text-foreground">{name}</span>
        {selected && <Check className="h-3 w-3 shrink-0 text-primary" strokeWidth={3} />}
      </div>
    </button>
  );
}

/* ─── 主题预设选择器 ─── */

export function ThemePresetPicker() {
  const presetId = useThemeStore((state) => state.presetId);
  const setPreset = useThemeStore((state) => state.setPreset);
  const [category, setCategory] = useState<ThemePresetCategory | "all">("all");

  const filtered = useMemo(
    () => (category === "all" ? THEME_PRESETS : THEME_PRESETS.filter((p) => p.category === category)),
    [category],
  );

  return (
    <div>
      <SectionLabel icon={Sparkles}>主题风格</SectionLabel>

      <Tabs value={category} onValueChange={(v) => setCategory(v as ThemePresetCategory | "all")}>
        <TabsList className="mb-2.5 h-7 w-full">
          {THEME_PRESET_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="flex-1 px-1 text-[10px]">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {THEME_PRESET_CATEGORIES.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-0">
            <div className="grid grid-cols-2 gap-2">
              {(cat.id === "all" ? THEME_PRESETS : filtered).map((preset) => (
                <ThemePresetCard
                  key={preset.id}
                  id={preset.id}
                  name={preset.name}
                  preview={preset.preview}
                  selected={presetId === preset.id}
                  onSelect={() => setPreset(preset.id)}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ─── 色值工具 ─── */

function hexToHsl(hex: string): CustomPalette {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0; let g = 0; let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/* ─── 自定义调色（实时预览） ─── */

export function ThemeCustomColorPicker() {
  const presetId = useThemeStore((state) => state.presetId);
  const customPalette = useThemeStore((state) => state.customPalette);
  const setCustomPalette = useThemeStore((state) => state.setCustomPalette);
  const mode = useThemeStore((state) => state.mode);
  const [expanded, setExpanded] = useState(presetId === "custom");

  const [h, setH] = useState(customPalette?.h ?? 199);
  const [s, setS] = useState(customPalette?.s ?? 89);
  const [l, setL] = useState(customPalette?.l ?? 48);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isCustom = presetId === "custom";
  const previewColor = `hsl(${h}, ${s}%, ${l}%)`;
  const hexColor = hslToHex(h, s, l);
  const { light, dark } = deriveSemanticColors(h, s, l);
  const activeTheme = mode === "dark" ? dark : light;

  const scheduleApply = useCallback((palette: CustomPalette) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCustomPalette(palette), 60);
  }, [setCustomPalette]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const updateHsl = (next: Partial<CustomPalette>) => {
    const palette = { h: next.h ?? h, s: next.s ?? s, l: next.l ?? l };
    if (next.h !== undefined) setH(next.h);
    if (next.s !== undefined) setS(next.s);
    if (next.l !== undefined) setL(next.l);
    scheduleApply(palette);
  };

  const handleHexChange = (hex: string) => {
    const palette = hexToHsl(hex);
    setH(palette.h);
    setS(palette.s);
    setL(palette.l);
    scheduleApply(palette);
  };

  const activateCustom = () => {
    setExpanded(true);
    if (!isCustom) scheduleApply({ h, s, l });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
          isCustom
            ? "border-primary/40 bg-primary/5"
            : "border-border/60 bg-card hover:bg-muted/50",
        )}
      >
        <div
          className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-border/80"
          style={{ background: isCustom ? previewColor : "linear-gradient(135deg, #667eea, #f093fb, #f5576c)" }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">自定义主色</p>
          <p className="text-[10px] text-muted-foreground">点击展开调色盘，实时预览</p>
        </div>
        <Palette className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          {/* 色块 + 原生取色器 */}
          <div className="flex items-center gap-2">
            <label className="relative cursor-pointer">
              <div
                className="h-10 w-10 rounded-lg ring-2 ring-border/80 transition-shadow hover:ring-primary/40"
                style={{ backgroundColor: previewColor }}
              />
              <input
                type="color"
                value={hexColor}
                onChange={(e) => {
                  activateCustom();
                  handleHexChange(e.target.value);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Pipette className="h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  value={hexColor}
                  onChange={(e) => {
                    activateCustom();
                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) handleHexChange(e.target.value);
                  }}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 font-mono text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{`hsl(${h}, ${s}%, ${l}%)`}</p>
            </div>
          </div>

          <HSLSlider label="色相" value={h} min={0} max={360} onChange={(v) => { activateCustom(); updateHsl({ h: v }); }} />
          <HSLSlider
            label="饱和度"
            value={s}
            min={0}
            max={100}
            onChange={(v) => { activateCustom(); updateHsl({ s: v }); }}
            gradient={`linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`}
          />
          <HSLSlider
            label="亮度"
            value={l}
            min={0}
            max={100}
            onChange={(v) => { activateCustom(); updateHsl({ l: v }); }}
            gradient={`linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`}
          />

          {/* 语义色预览条 */}
          <div className="flex gap-1 overflow-hidden rounded-md">
            {(["primary", "secondary", "accent", "muted", "border"] as const).map((key) => (
              <div
                key={key}
                className="h-5 flex-1 first:rounded-l-md last:rounded-r-md"
                style={{ backgroundColor: `hsl(${activeTheme[key]})` }}
                title={key}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 兼容旧导出 ─── */
export function ThemeColorPicker() {
  return (
    <div className="space-y-3">
      <ThemePresetPicker />
      <ThemeCustomColorPicker />
    </div>
  );
}

/* ─── HSL 滑块 ─── */

function HSLSlider({
  label,
  value,
  min,
  max,
  onChange,
  gradient,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  gradient?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/10"
        style={{
          background: gradient ?? "linear-gradient(to right, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%), hsl(360,80%,50%))",
        }}
      />
    </div>
  );
}

/* ─── 深浅模式切换 ─── */

export function ThemeModeToggle() {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <div>
      <SectionLabel>外观模式</SectionLabel>
      <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setMode("light")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all",
            mode === "light"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sun className="h-3.5 w-3.5" />
          浅色
        </button>
        <button
          type="button"
          onClick={() => setMode("dark")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all",
            mode === "dark"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Moon className="h-3.5 w-3.5" />
          深色
        </button>
      </div>
    </div>
  );
}

/* ─── 圆角选择器 ─── */

const RADIUS_OPTIONS: ThemeRadius[] = ["none", "sm", "md", "lg", "xl"];

export function ThemeRadiusPicker() {
  const radius = useThemeStore((state) => state.radius);
  const setRadius = useThemeStore((state) => state.setRadius);

  return (
    <div>
      <SectionLabel>圆角</SectionLabel>
      <div className="flex gap-1">
        {RADIUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRadius(option)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors",
              radius === option
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-card text-muted-foreground hover:bg-muted/50",
            )}
          >
            <div
              className="h-4 w-6 border-2 border-current bg-current/10"
              style={{ borderRadius: THEME_RADIUS_MAP[option] }}
            />
            <span className="text-[10px] font-medium">{THEME_RADIUS_LABELS[option]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── 字体选择器 ─── */

const FONT_OPTIONS: ThemeFont[] = ["inter", "noto-sans", "geist", "system"];

function FontOptionRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ThemeFont;
  onChange: (font: ThemeFont) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-1">
        {FONT_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
              value === option
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-card text-muted-foreground hover:bg-muted/50",
            )}
            style={{ fontFamily: THEME_FONT_FAMILIES[option] }}
          >
            {THEME_FONT_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ThemeFontPicker() {
  const fontFamily = useThemeStore((state) => state.fontFamily);
  const setFontFamily = useThemeStore((state) => state.setFontFamily);
  const headingFontFamily = useThemeStore((state) => state.headingFontFamily);
  const setHeadingFontFamily = useThemeStore((state) => state.setHeadingFontFamily);

  return (
    <div className="space-y-2">
      <SectionLabel>字体</SectionLabel>
      <FontOptionRow label="正文" value={fontFamily} onChange={setFontFamily} />
      <FontOptionRow label="标题" value={headingFontFamily} onChange={setHeadingFontFamily} />
    </div>
  );
}

/* ─── 主题外观面板（组合导出） ─── */

export function ThemeAppearancePanel() {
  return (
    <div className="space-y-4">
      <ThemeModeToggle />
      <SettingsDivider />
      <ThemePresetPicker />
      <ThemeCustomColorPicker />
      <SettingsDivider />
      <ThemeRadiusPicker />
      <ThemeFontPicker />
    </div>
  );
}
