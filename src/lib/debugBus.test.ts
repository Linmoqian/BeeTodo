import { describe, expect, it, vi } from "vitest";
import { DEBUG_EVENT_NAME, emitDebugEvent } from "./debugBus";

describe("emitDebugEvent", () => {
  it("dispatches structured debug information to the browser", () => {
    const listener = vi.fn();
    window.addEventListener(DEBUG_EVENT_NAME, listener);

    emitDebugEvent("today", "番茄钟已开始", "debug", { remainingMs: 60_000 });

    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      level: "debug",
      scope: "today",
      message: "番茄钟已开始",
      data: { remainingMs: 60_000 },
    });
    window.removeEventListener(DEBUG_EVENT_NAME, listener);
  });
});
