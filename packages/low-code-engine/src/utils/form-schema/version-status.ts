/** 仅 DRAFT 状态允许 saveDraft / 画布编辑落库 */
export function isVersionDraft(status: string | undefined | null): boolean {
  if (!status) {
    return true;
  }
  return status.toUpperCase() === "DRAFT";
}

export function isVersionPublished(status: string | undefined | null): boolean {
  return status?.toUpperCase() === "PUBLISHED";
}

export function findEditableDraftVersion<T extends { id: string; status?: string }>(
  versions: T[],
): T | undefined {
  return versions.find((v) => isVersionDraft(v.status));
}

export function versionStatusLabel(status: string | undefined | null): string {
  if (isVersionPublished(status)) {
    return "已发布";
  }
  if (isVersionDraft(status)) {
    return "草稿";
  }
  return status ?? "未知";
}
