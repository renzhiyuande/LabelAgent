"use client";

import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import { Calendar } from '../../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { cn } from "../../../lib/utils";
import {
  formatDateRangeDisplay,
  formatDateTimeValue,
  mergeDateAndTime,
  parseDateValue,
  useLocalTimeZone,
} from "./shared-date";

interface DateTimeRangeFieldControlProps {
  label: string;
  value: [unknown, unknown];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: [string, string]) => void;
}

export function DateTimeRangeFieldControl({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: DateTimeRangeFieldControlProps) {
  const timeZone = useLocalTimeZone();
  const startDate = parseDateValue(value[0]);
  const endDate = parseDateValue(value[1]);
  const selectedRange: DateRange | undefined =
    startDate || endDate
      ? {
          from: startDate,
          to: endDate,
        }
      : undefined;

  const resolvedPlaceholder = placeholder ?? `选择${label}`;
  const displayLabel = formatDateRangeDisplay(startDate, endDate);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "lh-ui-date-trigger flex w-full items-center gap-2 border border-border bg-card px-3 py-2 text-left text-sm text-foreground ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !displayLabel && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
          <span className="truncate">{displayLabel || resolvedPlaceholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="range"
          locale={zhCN}
          timeZone={timeZone}
          defaultMonth={selectedRange?.from}
          selected={selectedRange}
          onSelect={(nextRange) =>
            onChange([
              nextRange?.from ? formatDateTimeValue(mergeDateAndTime(nextRange.from, "00:00")) : "",
              nextRange?.to ? formatDateTimeValue(mergeDateAndTime(nextRange.to, "23:59")) : "",
            ])
          }
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
