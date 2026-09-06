"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { zhCN as calendarZhCN } from "react-day-picker/locale";
import { Button } from '../../../components/ui/button';
import { Calendar } from '../../../components/ui/calendar';
import { Input } from '../../../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { cn } from "../../../lib/utils";
import {
  extractTimeValue,
  fromTimeInputValue,
  mergeDateAndTime,
  parseDateValue,
  toTimeInputValue,
  useLocalTimeZone,
} from "./shared-date";

interface DateTimeFieldControlProps {
  label: string;
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const DEFAULT_TIME = "00:00";

function syncPartsFromValue(value: unknown): { datePart: Date | undefined; timePart: string } {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return { datePart: undefined, timePart: "" };
  }
  return { datePart: parsed, timePart: extractTimeValue(parsed) };
}

export function DateTimeFieldControl({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: DateTimeFieldControlProps) {
  const timeZone = useLocalTimeZone();
  const [dateOpen, setDateOpen] = useState(false);
  const [{ datePart, timePart }, setParts] = useState(() => syncPartsFromValue(value));
  const datePlaceholder = placeholder ?? "选择日期";

  useEffect(() => {
    setParts(syncPartsFromValue(value));
  }, [value]);

  function emitDateTime(nextDate: Date | undefined, nextTime: string) {
    if (!nextDate) {
      onChange("");
      return;
    }
    onChange(mergeDateAndTime(nextDate, nextTime || DEFAULT_TIME).toISOString());
  }

  function handleDateSelect(nextDate: Date | undefined) {
    if (!nextDate) {
      setParts({ datePart: undefined, timePart: "" });
      setDateOpen(false);
      onChange("");
      return;
    }
    const nextTime = timePart || DEFAULT_TIME;
    setParts({ datePart: nextDate, timePart: nextTime });
    setDateOpen(false);
    emitDateTime(nextDate, nextTime);
  }

  function handleTimeChange(nextTime: string) {
    const normalizedTime = fromTimeInputValue(nextTime);
    if (!datePart || !normalizedTime) {
      return;
    }
    setParts({ datePart, timePart: normalizedTime });
    emitDateTime(datePart, normalizedTime);
  }

  return (
    <div className="flex flex-row gap-3">
      <div className="min-w-0 flex-1">
        <span className="mb-1 block text-xs text-muted-foreground">日期</span>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal",
                !datePart && "text-muted-foreground",
              )}
            >
              {datePart ? format(datePart, "yyyy年M月d日", { locale: zhCN }) : datePlaceholder}
              <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              locale={calendarZhCN}
              timeZone={timeZone}
              selected={datePart}
              captionLayout="dropdown"
              defaultMonth={datePart}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="w-32 shrink-0">
        <span className="mb-1 block text-xs text-muted-foreground">时间</span>
        <Input
          type="time"
          step="1"
          disabled={disabled || !datePart}
          value={toTimeInputValue(timePart)}
          onChange={(event) => handleTimeChange(event.target.value)}
          className="appearance-none bg-card [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          aria-label={`${label}时间`}
        />
      </div>
    </div>
  );
}
