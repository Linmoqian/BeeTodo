export type DebugLevel = "debug" | "info" | "warn" | "error";

export interface DebugEventDetail {
  timestamp: string;
  level: DebugLevel;
  scope: string;
  message: string;
  data?: unknown;
}

export const DEBUG_EVENT_NAME = "beetodo:debug";

export function emitDebugEvent(
  scope: string,
  message: string,
  level: DebugLevel = "info",
  data?: unknown,
) {
  const detail: DebugEventDetail = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    data,
  };
  window.dispatchEvent(new CustomEvent<DebugEventDetail>(DEBUG_EVENT_NAME, { detail }));
}

export function initializeDebugBus() {
  emitDebugEvent("app", "调试信息总线已就绪");
}
