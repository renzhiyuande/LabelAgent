"use client";

import { useAuthenticatedFileUrl } from "../../adapters/asset-adapter";
import { FileIcon } from "lucide-react";
import type { TableColumnSchema } from "../../schema/types";
import type { ResourceRecord } from "../../types";

interface LHTableImageCellProps {
  column: TableColumnSchema;
  record: ResourceRecord;
}

function resolveField(record: ResourceRecord, field?: string): unknown {
  if (!field) {
    return undefined;
  }
  return record[field];
}

export function LHTableImageCell({ column, record }: LHTableImageCellProps) {
  const meta = column.slotMeta as { fileIdField?: string; mimeTypeField?: string; altField?: string } | undefined;
  const fileId = resolveField(record, meta?.fileIdField ?? column.key ?? "id");
  const mimeType = String(resolveField(record, meta?.mimeTypeField ?? "mimeType") ?? "");
  const alt = String(resolveField(record, meta?.altField ?? "originalName") ?? "预览");

  if (!mimeType.startsWith("image/")) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-muted">
        <FileIcon className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return <FileAssetThumb fileId={fileId} alt={alt} />;
}

function FileAssetThumb({ fileId, alt }: { fileId: unknown; alt: string }) {
  const previewUrl = useAuthenticatedFileUrl(
    typeof fileId === "number" || typeof fileId === "string" ? fileId : null,
  );

  if (!previewUrl) {
    return <div className="h-10 w-10 animate-pulse rounded border border-border bg-muted" />;
  }

  return (
    <img
      src={previewUrl}
      alt={alt}
      className="h-10 w-10 rounded border border-border object-cover"
    />
  );
}

function isImageColumn(column: TableColumnSchema): boolean {
  return column.type === "image" || column.slot === "image";
}

export { isImageColumn };
