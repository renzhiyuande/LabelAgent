"use client";

import { useEffect, useState } from "react";
import { fetchCollaboratorProfile, type CollaboratorProfile } from "../../adapters/collaborator-profile";
import { userRefInitial } from "../../utils/resolve-user-ref";

interface LHUserProfileCardProps {
  userId: string | number;
  displayName?: string | null;
  role?: string;
  reviewLevelLabels?: string | null;
}

export function LHUserProfileCard({ userId, displayName, role, reviewLevelLabels }: LHUserProfileCardProps) {
  const [profile, setProfile] = useState<CollaboratorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDenied(false);
    void fetchCollaboratorProfile(userId, role).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result) {
        setDenied(true);
        setProfile(null);
      } else {
        setProfile(result);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, role]);

  const resolvedName = profile?.displayName ?? displayName ?? profile?.username ?? "用户";
  const initial = userRefInitial(resolvedName, profile?.username);

  if (loading) {
    return (
      <div className="lh-user-profile-card lh-user-profile-card--loading">
        <div className="lh-user-profile-card__avatar lh-skeleton" />
        <div className="lh-user-profile-card__meta">
          <div className="lh-skeleton lh-skeleton--line" />
          <div className="lh-skeleton lh-skeleton--line is-short" />
        </div>
      </div>
    );
  }

  if (denied || !profile) {
    return (
      <div className="lh-user-profile-card lh-user-profile-card--denied">
        <p className="lh-user-profile-card__denied-text">无权限查看该用户信息</p>
      </div>
    );
  }

  return (
    <div className="lh-user-profile-card">
      <div className="lh-user-profile-card__header">
        <div className="lh-user-profile-card__avatar" aria-hidden>
          {initial}
        </div>
        <div className="lh-user-profile-card__meta">
          <div className="lh-user-profile-card__name">{resolvedName}</div>
          <div className="lh-user-profile-card__username">@{profile.username}</div>
        </div>
      </div>
      <dl className="lh-user-profile-card__fields">
        {profile.email ? (
          <>
            <dt>邮箱</dt>
            <dd>{profile.email}</dd>
          </>
        ) : null}
        {profile.phone ? (
          <>
            <dt>手机</dt>
            <dd>{profile.phone}</dd>
          </>
        ) : null}
        {profile.roleNames.length > 0 ? (
          <>
            <dt>角色</dt>
            <dd>{profile.roleNames.join("、")}</dd>
          </>
        ) : null}
        {reviewLevelLabels?.trim() ? (
          <>
            <dt>可审级别</dt>
            <dd>{reviewLevelLabels.trim()}</dd>
          </>
        ) : null}
        <dt>用户 ID</dt>
        <dd className="lh-user-profile-card__mono">{String(profile.userId)}</dd>
      </dl>
    </div>
  );
}
