"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useEffect, useState } from "react";

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatDateTimeValue(date: Date) {
  return `${formatDateValue(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseDateValue(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const trimmed = value.trim();
  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.includes(" ")
      ? trimmed.replace(" ", "T")
      : `${trimmed}T00:00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function extractTimeValue(date?: Date): string {
  if (!date) {
    return "";
  }
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** 转为 `<input type="time">` 可用的 value（step=1 时需要 HH:mm:ss） */
export function toTimeInputValue(timeValue: string): string {
  if (!timeValue) {
    return "";
  }
  return timeValue.length === 5 ? `${timeValue}:00` : timeValue;
}

/** 从 time input 读回 HH:mm */
export function fromTimeInputValue(timeValue: string): string {
  return timeValue.slice(0, 5);
}

export function formatDateTimeDisplay(date?: Date): string {
  if (!date) {
    return "";
  }
  return format(date, "yyyy年M月d日 HH:mm", { locale: zhCN });
}

export function mergeDateAndTime(date: Date, timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map((item) => Number(item));
  const next = new Date(date);
  next.setHours(Number.isNaN(hours) ? 0 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
  return next;
}

export function formatDateRangeDisplay(startDate?: Date, endDate?: Date) {
  if (startDate && endDate) {
    return `${format(startDate, "yyyy年M月d日", { locale: zhCN })} - ${format(endDate, "yyyy年M月d日", { locale: zhCN })}`;
  }
  if (startDate) {
    return format(startDate, "yyyy年M月d日", { locale: zhCN });
  }
  return "";
}

export function renderDateRangeLabel(value: [unknown, unknown], placeholder: string) {
  const label = formatDateRangeDisplay(parseDateValue(value[0]), parseDateValue(value[1]));
  return label || placeholder;
}

/** 客户端检测本地时区，避免 Calendar 选中日偏移 */
export function useLocalTimeZone() {
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return timeZone;
}
