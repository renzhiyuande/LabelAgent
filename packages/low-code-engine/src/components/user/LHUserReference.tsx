"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { fetchCollaboratorProfile } from "../../adapters/collaborator-profile";
import { LHUserProfileCard } from "./LHUserProfileCard";
import { userRefInitial } from "../../utils/resolve-user-ref";

interface LHUserReferenceProps {
  userId: string | number | null | undefined;
  displayName?: string | null;
  role?: string;
  /** 用户卡片中额外展示，例如审核员可审级别 */
  reviewLevelLabels?: string | null;
  emptyLabel?: string;
  className?: string;
}

export function LHUserReference({
  userId,
  displayName,
  role,
  reviewLevelLabels,
  emptyLabel = "-",
  className,
}: LHUserReferenceProps) {
  const hasUserId = userId != null && userId !== "";
  const trimmedName = displayName?.trim() || null;
  const [remoteName, setRemoteName] = useState<string | null>(null);

  useEffect(() => {
    if (!hasUserId || trimmedName) {
      setRemoteName(null);
      return;
    }
    let cancelled = false;
    void fetchCollaboratorProfile(userId, role).then((profile) => {
      if (cancelled || !profile) {
        return;
      }
      const resolved = profile.displayName?.trim() || profile.username?.trim() || null;
      if (resolved) {
        setRemoteName(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasUserId, trimmedName, userId, role]);

  if (!hasUserId) {
    return <span className={className ?? "lh-user-ref lh-user-ref--empty"}>{emptyLabel}</span>;
  }

  const resolvedName = trimmedName || remoteName;
  const label = resolvedName || `用户 ${userId}`;
  const initial = userRefInitial(resolvedName, null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={["lh-user-ref", className].filter(Boolean).join(" ")}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="lh-user-ref__avatar" aria-hidden>
            {initial}
          </span>
          <span className="lh-user-ref__name">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="lh-user-profile-popover w-80 p-0">
        <LHUserProfileCard
          userId={userId}
          displayName={resolvedName}
          role={role}
          reviewLevelLabels={reviewLevelLabels}
        />
      </PopoverContent>
    </Popover>
  );
}
