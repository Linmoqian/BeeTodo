import type { FocusSession, StoredTodo } from "../types";

const MINUTE_MS = 60_000;

export interface DailyFocusStats {
  todayMs: number;
  yesterdayMs: number;
  differenceMinutes: number;
  comparisonText: string;
}

export interface RoleProgress {
  level: number;
  currentExperience: number;
  targetExperience: number;
  progress: number;
}

function overlapDuration(session: FocusSession, rangeStart: number, rangeEnd: number): number {
  const startedAt = Math.max(session.startedAt, rangeStart);
  const endedAt = Math.min(session.endedAt, rangeEnd);
  return Math.max(0, endedAt - startedAt);
}

function localDayStart(timestamp: number, dayOffset = 0): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset).getTime();
}

export function mergeRunningFocusSessions(
  sessions: FocusSession[],
  todos: StoredTodo[],
  now = Date.now(),
): FocusSession[] {
  const runningSessions = todos.flatMap((todo) =>
    todo.timerStartedAt !== null && todo.timerStartedAt < now
      ? [{ startedAt: todo.timerStartedAt, endedAt: now }]
      : [],
  );
  return [...sessions, ...runningSessions];
}

export function getDailyFocusStats(
  sessions: FocusSession[],
  todos: StoredTodo[] = [],
  now = Date.now(),
): DailyFocusStats {
  const todayStart = localDayStart(now);
  const yesterdayStart = localDayStart(now, -1);
  const mergedSessions = mergeRunningFocusSessions(sessions, todos, now);
  const todayMs = mergedSessions.reduce(
    (sum, session) => sum + overlapDuration(session, todayStart, now),
    0,
  );
  const yesterdayMs = mergedSessions.reduce(
    (sum, session) => sum + overlapDuration(session, yesterdayStart, todayStart),
    0,
  );
  const todayMinutes = Math.floor(todayMs / MINUTE_MS);
  const yesterdayMinutes = Math.floor(yesterdayMs / MINUTE_MS);
  const differenceMinutes = todayMinutes - yesterdayMinutes;

  let comparisonText = "与昨日持平";
  if (todayMinutes === 0 && yesterdayMinutes === 0) {
    comparisonText = "昨日暂无记录";
  } else if (differenceMinutes > 0) {
    comparisonText = `比昨日 ↑ ${differenceMinutes} 分钟`;
  } else if (differenceMinutes < 0) {
    comparisonText = `比昨日 ↓ ${Math.abs(differenceMinutes)} 分钟`;
  }

  return { todayMs, yesterdayMs, differenceMinutes, comparisonText };
}

export function calculateRoleProgress(totalMinutes: number): RoleProgress {
  let level = 1;
  let currentExperience = Math.max(0, Math.floor(totalMinutes));
  let targetExperience = 200 * (level + 1);

  while (currentExperience >= targetExperience) {
    currentExperience -= targetExperience;
    level += 1;
    targetExperience = 200 * (level + 1);
  }

  return {
    level,
    currentExperience,
    targetExperience,
    progress: currentExperience / targetExperience,
  };
}

export function formatDurationHms(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
