import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AuxiliaryDockId = "header" | "left" | "right";
export type AuxiliaryDockDensity = "wide" | "narrow";
export type AuxiliaryDisplayMode = "header-capsule" | "sidebar-wide" | "sidebar-narrow";

export interface AuxiliaryDockState<TModuleId extends string = string> {
  modules: TModuleId[];
  activeModule: TModuleId;
  visible: boolean;
}

export interface AuxiliaryModuleDefinition<TContext, TModuleId extends string = string> {
  label: string;
  icon: LucideIcon;
  /** 顶栏胶囊样式：accent 用于 AI 等强调模块 */
  capsuleTone?: "default" | "accent";
  renderSummary: (context: TContext, mode: AuxiliaryDisplayMode) => ReactNode;
  renderBody: (context: TContext, mode: AuxiliaryDisplayMode) => ReactNode;
}

export type AuxiliaryModuleRegistry<TContext, TModuleId extends string> = Record<
  TModuleId,
  AuxiliaryModuleDefinition<TContext, TModuleId>
>;

export function resolveAuxiliaryDisplayMode(
  placement: AuxiliaryDockId,
  density: AuxiliaryDockDensity,
): AuxiliaryDisplayMode {
  if (placement === "header") {
    return "header-capsule";
  }
  return density === "narrow" ? "sidebar-narrow" : "sidebar-wide";
}
