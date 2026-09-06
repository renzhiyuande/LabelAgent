import { normalizeSnowflakeId } from "@/lib/id-utils";
import type { TemplateVersionItem } from "../types";

interface TemplateVersionRecord {
  id: string | number;
  versionNo: string | number;
  status?: string;
  createdAt?: string | number;
  publishedAt?: string | number;
  marketAuditStatus?: string;
  marketPublishedAt?: string | number;
  authorName?: unknown;
  descriptionText?: unknown;
  templateName?: unknown;
  isCurrent?: boolean | number;
  schemaJson?: string;
}

function parseTimestamp(value: string | number | undefined): number {
  if (!value) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  return new Date(value).getTime();
}

export function mapVersionRecord(record: TemplateVersionRecord): TemplateVersionItem {
  const publishedAt = parseTimestamp(record.publishedAt);
  const marketPublishedAt = parseTimestamp(record.marketPublishedAt);
  return {
    id: normalizeSnowflakeId(record.id) ?? "",
    versionNo: String(record.versionNo),
    status: record.status ? String(record.status) : undefined,
    createdAt: parseTimestamp(record.createdAt),
    publishedAt: publishedAt > 0 ? publishedAt : undefined,
    marketAuditStatus: record.marketAuditStatus ? String(record.marketAuditStatus) : undefined,
    marketPublishedAt: marketPublishedAt > 0 ? marketPublishedAt : undefined,
    author: record.authorName ? String(record.authorName) : "系统",
    description: String(record.descriptionText ?? ""),
    templateName: record.templateName ? String(record.templateName) : undefined,
    isCurrent: record.isCurrent === true || record.isCurrent === 1,
    schemaJson: record.schemaJson,
  };
}

export function mapVersionRecords(records: unknown[]): TemplateVersionItem[] {
  return records.map((record) => mapVersionRecord(record as TemplateVersionRecord));
}
