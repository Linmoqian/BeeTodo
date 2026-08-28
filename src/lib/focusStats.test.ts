import { describe, expect, it } from "vitest";
import type { StoredTodo } from "../types";
import { calculateRoleProgress, formatDurationHms, getDailyFocusStats } from "./focusStats";

function timestamp(year: number, month: number, day: number, hour: number, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

describe("getDailyFocusStats", () => {
  it("splits a session across local midnight", () => {
    const now = timestamp(2026, 8, 29, 1);
    const stats = getDailyFocusStats(
      [
        {
          startedAt: timestamp(2026, 8, 28, 23, 30),
          endedAt: timestamp(2026, 8, 29, 0, 30),
        },
      ],
      [],
      now,
    );

    expect(stats.todayMs).toBe(30 * 60_000);
    expect(stats.yesterdayMs).toBe(30 * 60_000);
    expect(stats.comparisonText).toBe("与昨日持平");
  });

  it("merges a running timer without persisting it", () => {
    const now = timestamp(2026, 8, 29, 10, 45);
    const todo: StoredTodo = {
      id: "running",
      text: "专注中",
      completed: false,
      createdAt: now,
      elapsedMs: 0,
      timerStartedAt: timestamp(2026, 8, 29, 10, 15),
      color: "default",
    };
    const stats = getDailyFocusStats([], [todo], now);

    expect(stats.todayMs).toBe(30 * 60_000);
    expect(stats.comparisonText).toBe("比昨日 ↑ 30 分钟");
  });

  it("reports no yesterday record when both days are empty", () => {
    const stats = getDailyFocusStats([], [], timestamp(2026, 8, 29, 12));

    expect(stats.comparisonText).toBe("昨日暂无记录");
  });

  it("reports a decrease using complete minutes", () => {
    const now = timestamp(2026, 8, 29, 12);
    const stats = getDailyFocusStats(
      [
        {
          startedAt: timestamp(2026, 8, 28, 9),
          endedAt: timestamp(2026, 8, 28, 9, 45),
        },
        {
          startedAt: timestamp(2026, 8, 29, 9),
          endedAt: timestamp(2026, 8, 29, 9, 20),
        },
      ],
      [],
      now,
    );

    expect(stats.differenceMinutes).toBe(-25);
    expect(stats.comparisonText).toBe("比昨日 ↓ 25 分钟");
  });
});

describe("calculateRoleProgress", () => {
  it.each([
    [0, 1, 0, 400],
    [400, 2, 0, 600],
    [2800, 5, 0, 1200],
    [3650, 5, 850, 1200],
  ])("maps %i minutes to Lv.%i %i/%i", (minutes, level, currentExperience, targetExperience) => {
    expect(calculateRoleProgress(minutes)).toMatchObject({
      level,
      currentExperience,
      targetExperience,
    });
  });
});

describe("formatDurationHms", () => {
  it("formats elapsed milliseconds as hours, minutes and seconds", () => {
    expect(formatDurationHms(9_345_999)).toBe("02:35:45");
  });
});
