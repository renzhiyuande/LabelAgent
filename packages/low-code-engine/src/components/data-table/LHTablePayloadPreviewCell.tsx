"use client";

import { formatPayloadPreview } from "../../utils/formatters";
import { LHTableEllipsisCell } from "./LHTableEllipsisCell";

interface LHTablePayloadPreviewCellProps {
  value: unknown;
  lines?: 1 | 2;
}

export function LHTablePayloadPreviewCell({ value, lines = 2 }: LHTablePayloadPreviewCellProps) {
  const text = formatPayloadPreview(value);
  return <LHTableEllipsisCell text={text} lines={lines} />;
}
