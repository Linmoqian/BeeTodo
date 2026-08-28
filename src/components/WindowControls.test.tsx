import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { WindowControls } from "./WindowControls";

const { isTauriRuntimeMock, getOsPlatformMock, getCurrentWindowMock } = vi.hoisted(() => ({
  isTauriRuntimeMock: vi.fn(),
  getOsPlatformMock: vi.fn(),
  getCurrentWindowMock: vi.fn(),
}));

vi.mock("../lib/platform", () => ({
  isTauriRuntime: isTauriRuntimeMock,
  getOsPlatform: getOsPlatformMock,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: getCurrentWindowMock,
}));

beforeEach(() => {
  isTauriRuntimeMock.mockReturnValue(true);
  getCurrentWindowMock.mockReturnValue({
    close: vi.fn(),
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
  });
});

afterEach(cleanup);

function renderControlOrder() {
  const { container } = render(<WindowControls />);
  const controls = container.querySelector(".window-controls");
  const order = Array.from(controls?.querySelectorAll("button") ?? []).map((button) =>
    button.className.replace("window-control ", ""),
  );
  return { controls, order };
}

describe("WindowControls", () => {
  it("renders windows-style controls ordered minimize, maximize, close", () => {
    getOsPlatformMock.mockReturnValue("windows");

    const { controls, order } = renderControlOrder();

    expect(controls?.classList.contains("is-windows")).toBe(true);
    expect(order).toEqual(["window-minimize", "window-zoom", "window-close"]);
  });

  it("renders macOS traffic-light controls ordered close, minimize, zoom", () => {
    getOsPlatformMock.mockReturnValue("macos");

    const { controls, order } = renderControlOrder();

    expect(controls?.classList.contains("is-windows")).toBe(false);
    expect(order).toEqual(["window-close", "window-minimize", "window-zoom"]);
  });

  it("renders nothing outside the tauri runtime", () => {
    isTauriRuntimeMock.mockReturnValue(false);

    const { container } = render(<WindowControls />);

    expect(container.querySelector(".window-controls")).toBeNull();
  });
});
