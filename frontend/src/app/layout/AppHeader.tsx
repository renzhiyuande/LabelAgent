import { useLogout } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, Moon, RefreshCw, Settings2, Sun, User } from "lucide-react";
import { NotificationBell } from "@/features/notifications";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { refreshCurrentWorkspacePage } from "./workspace-refresh";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/utils";
import { findMenuByPath, findParentMenuByPath } from "../navigation/menu-config";
import { useAppShellStore } from "../../stores/app-shell";
import { useAuthStore } from "../../stores/auth";
import { useNavigationStore } from "../../stores/navigation";
import { useThemeStore } from "../../stores/theme";
import { ThemeAppearancePanel } from "../../components/ui/theme-customizer";
import { useUiDensityStore, type UiDensity } from "../../stores/ui-density";
import { useSettingsStore, type TabStyle } from "../../stores/settings";
import { LocaleSwitch } from "../../i18n/LocaleSwitch";
import { useT } from "../../i18n/useT";

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toggleSidebar = useAppShellStore((state) => state.toggleSidebar);
  const openSidebarSheet = useAppShellStore((state) => state.openSidebarSheet);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { mutate: logout } = useLogout();
  const menus = useNavigationStore((state) => state.menus);
  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const color = useThemeStore((state) => state.color);
  const density = useUiDensityStore((state) => state.density);
  const setDensity = useUiDensityStore((state) => state.setDensity);
  const currentMenu = findMenuByPath(menus, location.pathname);
  const parentMenu = findParentMenuByPath(menus, location.pathname);
  const { t } = useT();
  const densityOptions: Array<{ key: UiDensity; label: string }> = [
    { key: "s", label: t('app.layout.app_header.density_compact') },
    { key: "m", label: t('app.layout.app_header.density_standard') },
    { key: "l", label: t('app.layout.app_header.density_relaxed') },
  ];
  const showDensity = useSettingsStore((state) => state.showDensityInHeader);
  const showLocale = useSettingsStore((state) => state.showLocaleInHeader);
  const showThemeToggle = useSettingsStore((state) => state.showThemeToggleInHeader);
  const showNotifications = useSettingsStore((state) => state.showNotificationsInHeader);
  const showUserInfo = useSettingsStore((state) => state.showUserInfoInHeader);
  const enableMultiTabs = useSettingsStore((state) => state.enableMultiTabs);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <header className="lh-app-header z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-card/88 px-5 backdrop-blur transition-colors lg:px-7">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => {
            if (isMobile) {
              openSidebarSheet();
              return;
            }
            toggleSidebar();
          }}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
              {parentMenu ? `${parentMenu.title} / ${currentMenu?.title ?? ""}` : currentMenu?.title ?? t('app.layout.app_header.workspace')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {showDensity ? (
          <div className="lh-density-select hidden sm:block">
            <Select value={density} onValueChange={(nextValue) => setDensity(nextValue as UiDensity)}>
              <SelectTrigger
                className="lh-density-select-trigger"
                aria-label={t('app.layout.app_header.density')}
              >
                <SelectValue placeholder={t('app.layout.app_header.density')} />
              </SelectTrigger>
              <SelectContent>
                {densityOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {showLocale ? <LocaleSwitch /> : null}
        {showThemeToggle ? (
          <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleMode} aria-label={t('app.layout.app_header.zh1odbph')}>
            {mode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        ) : null}
        {showNotifications ? <NotificationBell /> : null}
        {!enableMultiTabs ? (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t('app.layout.app_header.refresh_page')}
            onClick={() => refreshCurrentWorkspacePage(queryClient, location.pathname)}
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        ) : null}
        {showUserInfo ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden cursor-pointer items-center gap-2 rounded-full border border-border/80 bg-card px-2.5 py-1.5 text-xs text-foreground shadow-sm transition-colors hover:bg-muted md:inline-flex"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {(currentUser?.displayName ?? currentUser?.username ?? "管").slice(0, 1)}
                </div>
                <div className="leading-tight text-left">
                  <p className="text-xs font-medium text-foreground">{currentUser?.displayName ?? currentUser?.username ?? t('app.layout.app_header.not_logged_in')}</p>
                  <p className="text-[10px] text-muted-foreground">Owner</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-44">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />{t('app.layout.app_header.profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout(undefined, {
                    onSuccess: () => navigate("/login", { replace: true }),
                  });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />{t('app.layout.app_header.logout_confirm')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <HeaderSettingsPopover />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => {
            logout(undefined, {
              onSuccess: () => navigate("/login", { replace: true }),
            });
          }}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

/* ───── Header 设置弹窗 ───── */

function useHeaderItemConfig() {
  const { t } = useT();
  return [
  { key: "showDensityInHeader" as const, label: t('app.layout.app_header.density') },
  { key: "showLocaleInHeader" as const, label: t('app.layout.app_header.locale_switch') },
  { key: "showThemeToggleInHeader" as const, label: t('app.layout.app_header.theme_toggle') },
  { key: "showNotificationsInHeader" as const, label: t('app.layout.app_header.notification_bell') },
  { key: "showUserInfoInHeader" as const, label: t('app.layout.app_header.user_info') },
] as const;
}

function useTabStyleOptions(): Array<{ value: TabStyle; label: string }> {
  const { t } = useT();
  return [
  { value: "card", label: t('app.layout.app_header.tab_style_card') },
  { value: "line", label: t('app.layout.app_header.tab_style_line') },
];
}

function useDensityOptions(): Array<{ value: UiDensity; label: string }> {
  const { t } = useT();
  return [
  { value: "s", label: t('app.layout.app_header.density_compact') },
  { value: "m", label: t('app.layout.app_header.density_standard') },
  { value: "l", label: t('app.layout.app_header.density_relaxed') },
];
}

function HeaderSettingsPopover() {
  const { t } = useT();
  const density = useUiDensityStore((state) => state.density);
  const setDensity = useUiDensityStore((state) => state.setDensity);
  const enableMultiTabs = useSettingsStore((state) => state.enableMultiTabs);
  const tabStyle = useSettingsStore((state) => state.tabStyle);
  const updateSettings = useSettingsStore((state) => state.update);
  const headerItemConfig = useHeaderItemConfig();
  const tabStyleOptions = useTabStyleOptions();
  const densityOptions = useDensityOptions();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t('app.layout.app_header.settings')}>
          <Settings2 className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[360px] p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{t('app.layout.app_header.page_settings')}</p>
          <p className="text-[11px] text-muted-foreground">{t('app.layout.app_header.zh3wv6zg')}</p>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-4 py-4 space-y-4">
          <ThemeAppearancePanel />

          <div className="h-px bg-border/60" />

          {/* ── 界面密度 ── */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('app.layout.app_header.density')}</p>
            <div className="flex gap-1.5">
              {densityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDensity(option.value)}
                  className={cn(
                    "flex-1 rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors",
                    density === option.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/80 bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 多标签页 ── */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('app.layout.app_header.tabs')}</p>
            <label className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-muted/60">
              <span className="text-sm text-foreground/80">{t('app.layout.app_header.enable_multi_tabs')}</span>
              <Switch
                checked={enableMultiTabs}
                onCheckedChange={(checked) => updateSettings({ enableMultiTabs: checked })}
              />
            </label>
            {enableMultiTabs ? (
              <div className="mt-2 flex gap-1.5">
                {tabStyleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSettings({ tabStyle: option.value })}
                    className={cn(
                      "flex-1 rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors",
                      tabStyle === option.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/80 bg-card text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 text-[11px] text-muted-foreground">{t('app.layout.app_header.zhzjj1ev')}</p>
            )}
          </div>

          {/* ── Header 显示项 ── */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('app.layout.app_header.header_display_items')}</p>
            <div className="space-y-1">
              {headerItemConfig.map((item) => (
                <HeaderSettingsToggle key={item.key} configKey={item.key} label={item.label} />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type HeaderVisibilityKey = "showDensityInHeader" | "showLocaleInHeader" | "showThemeToggleInHeader" | "showNotificationsInHeader" | "showUserInfoInHeader";

function HeaderSettingsToggle({ configKey, label }: { configKey: HeaderVisibilityKey; label: string }) {
  const value = useSettingsStore((state) => state[configKey]);
  const update = useSettingsStore((state) => state.update);

  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-muted/60">
      <span className="text-sm text-foreground/80">{label}</span>
      <Switch
        checked={value}
        onCheckedChange={(checked) => update({ [configKey]: checked })}
      />
    </label>
  );
}
