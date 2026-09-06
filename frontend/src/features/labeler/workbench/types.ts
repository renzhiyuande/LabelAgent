import type { ReactNode } from "react";
import type { AuthenticatedUser } from "@/types";
import type { WorkbenchRegionId, WorkbenchSlotProvider, WorkbenchTabItem } from "@/components/workbench2";
import type { FormSchema, ResourceMeta } from "@/low-code/schema/types";
import type { LabelerRenderPrefs } from "./labeler-render-prefs";
import type { LabelerMyWorkRow, LabelerWorkDetailResponse } from "../api/labeler-work-api";
import type { LabelerQueueScopeItem } from "../work/types/labeler-queue-scope";
import type { LabelerWorkbenchSlotId, LabelerWorkbenchViewMode } from "./LabelerSlotFrame";

export interface LabelerWorkbenchV2Props {
  work: LabelerWorkDetailResponse;
  assignmentId: string;
  formSchema: FormSchema | null;
  renderPrefs: LabelerRenderPrefs;
  setRenderPrefs: (patch: Partial<LabelerRenderPrefs>) => void;
  resetRenderPrefs: () => void;
  displaySchema: FormSchema;
  annotateResource: ResourceMeta;
  annotateFieldCount: number;
  values: Record<string, unknown>;
  queueRows: LabelerMyWorkRow[];
  queueLoading?: boolean;
  queueHasMore?: boolean;
  queueLoadingMore?: boolean;
  onLoadMoreQueue?: () => void;
  onApplyQueueScope?: (items: LabelerQueueScopeItem[]) => void | Promise<void>;
  contentPending?: boolean;
  bootstrapping?: boolean;
  currentUser?: AuthenticatedUser | null;
  saveHint: string;
  saving: boolean;
  submitting: boolean;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onSelectAssignment: (assignmentId: string) => void;
  onPrevAssignment?: () => void;
  onNextAssignment?: () => void;
  queueNav?: {
    index: number;
    total: number;
    prevId?: string | null;
    nextId?: string | null;
  };
  canGoNextInQueue?: boolean;
  onFieldChange: (key: string, value: unknown) => void;
  annotateFieldErrors: Record<string, string>;
  onAnnotateFieldErrorsChange: (errors: Record<string, string>) => void;
  onSaveDraft: () => void;
  onSubmit: () => Promise<void>;
  onWithdraw: () => Promise<void>;
  canSubmit?: boolean;
}

export interface LabelerWorkbenchBusinessContext {
  work: LabelerWorkDetailResponse;
  assignmentId: string;
  formSchema: FormSchema | null;
  renderPrefs: LabelerRenderPrefs;
  setRenderPrefs: (patch: Partial<LabelerRenderPrefs>) => void;
  resetRenderPrefs: () => void;
  applyRenderDefaultViews: (defaults: LabelerRenderPrefs["defaults"]) => void;
  applySectionWidgetLayout: () => void;
  displaySchema: FormSchema;
  annotateResource: ResourceMeta;
  annotateFieldCount: number;
  values: Record<string, unknown>;
  queueRows: LabelerMyWorkRow[];
  queueLoading: boolean;
  queueHasMore: boolean;
  queueLoadingMore: boolean;
  contentPendingOnly: boolean;
  currentUser?: AuthenticatedUser | null;
  saveHint: string;
  saving: boolean;
  submitting: boolean;
  focusMode: boolean;
  editMode: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  queuePositionLabel: string | null;
  queueOrdinalLabel: string | null;
  canSubmit: boolean;
  slotModes: Record<LabelerWorkbenchSlotId, LabelerWorkbenchViewMode>;
  setSlotMode: (slotId: LabelerWorkbenchSlotId, mode: LabelerWorkbenchViewMode) => void;
  layoutTabs: WorkbenchTabItem[];
  moveTab: (tabId: string, regionId: WorkbenchRegionId) => void;
  resetLayout: () => void;
  onToggleFocusMode: () => void;
  onSelectAssignment: (assignmentId: string) => void;
  onPrevAssignment?: () => void;
  onNextAssignment?: () => void;
  onLoadMoreQueue?: () => void;
  onApplyQueueScope?: (items: LabelerQueueScopeItem[]) => void | Promise<void>;
  onFieldChange: (key: string, value: unknown) => void;
  annotateFieldErrors: Record<string, string>;
  onAnnotateFieldErrorsChange: (errors: Record<string, string>) => void;
  onSaveDraft: () => void;
  onSubmit: () => Promise<void>;
  onWithdraw: () => Promise<void>;
}

export interface LabelerTopCapsuleProps {
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
}

export type LabelerSlotRenderEnv = Parameters<
  NonNullable<WorkbenchSlotProvider<LabelerWorkbenchBusinessContext>["render"]>
>[1];
