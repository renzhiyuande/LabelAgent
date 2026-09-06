import { describe, expect, it } from "vitest";
import {
  extractTimeValue,
  formatDateTimeDisplay,
  fromTimeInputValue,
  parseDateValue,
  toTimeInputValue,
} from "./shared-date";

describe("parseDateValue", () => {
  it("parses ISO datetime strings from API", () => {
    const date = parseDateValue("2026-05-27T10:00:00.000Z");
    expect(date).toBeInstanceOf(Date);
    expect(Number.isNaN(date?.getTime())).toBe(false);
  });

  it("parses local datetime strings", () => {
    const date = parseDateValue("2026-05-27 18:30");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(4);
    expect(date?.getDate()).toBe(27);
    expect(date?.getHours()).toBe(18);
    expect(date?.getMinutes()).toBe(30);
  });
});

describe("formatDateTimeDisplay", () => {
  it("formats selected datetime for trigger label", () => {
    const date = new Date(2026, 4, 27, 18, 30);
    expect(formatDateTimeDisplay(date)).toBe("2026年5月27日 18:30");
  });
});

describe("extractTimeValue", () => {
  it("returns empty string when date is missing", () => {
    expect(extractTimeValue(undefined)).toBe("");
  });

  it("returns HH:mm for selected datetime", () => {
    const date = new Date(2026, 4, 27, 9, 5);
    expect(extractTimeValue(date)).toBe("09:05");
  });

  it("returns 00:00 for midnight", () => {
    const date = new Date(2026, 4, 27, 0, 0);
    expect(extractTimeValue(date)).toBe("00:00");
  });
});

describe("time input helpers", () => {
  it("converts HH:mm to time input value with seconds", () => {
    expect(toTimeInputValue("00:00")).toBe("00:00:00");
    expect(toTimeInputValue("18:30")).toBe("18:30:00");
    expect(toTimeInputValue("")).toBe("");
  });

  it("reads HH:mm from time input value", () => {
    expect(fromTimeInputValue("00:00:00")).toBe("00:00");
    expect(fromTimeInputValue("18:30:00")).toBe("18:30");
  });
});
