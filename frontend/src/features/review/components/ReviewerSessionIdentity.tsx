"use client";

import { useMemo } from "react";
import { LHUserReference } from "@/low-code/components/user/LHUserReference";
import { useAuthStore } from "@/stores/auth";
import type { AuditPoolLevelCountResponse } from "../api/reviewer-workbench-api";
import {
  formatReviewerLevelAccessText,
  resolveReviewerLevelAccess,
} from "../utils/reviewer-level-access";
import { ReviewerTaskAccessHint } from "./ReviewerTaskAccessHint";

export interface ReviewerSessionIdentityProps {
  /** 来自 audit-pool/meta，用于「全部级别」时展示任务真实 workflow 名称 */
  levelMeta?: AuditPoolLevelCountResponse[];
  /** 是否展示任务成员范围说明（审核池 / AI 队列） */
  showTaskAccessHint?: boolean;
  /** 工作台侧栏等窄区域使用更紧凑的单行摘要 */
  compact?: boolean;
  className?: string;
}

function buildLevelSummary(access: ReturnType<typeof resolveReviewerLevelAccess>): string {
  if (access.levels.length === 0) {
    return "未配置级别权限";
  }
  if (access.unrestricted) {
    return "全部级别";
  }
  return access.levels.map((level) => level.label).join("、");
}

export function ReviewerSessionIdentity({
  levelMeta,
  showTaskAccessHint = false,
  compact = false,
  className,
}: ReviewerSessionIdentityProps) {
  const currentUser = useAuthStore((state) => state.currentUser);

  const access = useMemo(
    () => resolveReviewerLevelAccess(currentUser?.permissions ?? [], levelMeta),
    [currentUser?.permissions, levelMeta],
  );

  const profileLevelLabels = useMemo(
    () => formatReviewerLevelAccessText(access),
    [access],
  );

  const levelSummary = useMemo(() => buildLevelSummary(access), [access]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <div
        className={[
          "rounded-xl border border-border/80 bg-muted/40",
          compact ? "px-2.5 py-2" : "px-3 py-2.5",
        ].join(" ")}
      >
        <LHUserReference
          userId={currentUser.userId}
          displayName={currentUser.displayName || currentUser.username}
          role="REVIEWER"
          reviewLevelLabels={profileLevelLabels}
          className="min-w-0 max-w-full"
        />
        <p
          className={[
            "mt-1.5 truncate text-muted-foreground",
            compact ? "text-[10px] leading-4" : "text-[11px] leading-5",
          ].join(" ")}
          title={profileLevelLabels}
        >
          <span className="text-foreground/70">可审级别</span>
          <span className="mx-1 text-border">·</span>
          <span className={access.levels.length === 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground/90"}>
            {levelSummary}
          </span>
        </p>
      </div>
      {showTaskAccessHint ? <ReviewerTaskAccessHint compact /> : null}
    </div>
  );
}
