import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { openPetWindow } from "./petWindow";

const mocks = vi.hoisted(() => ({
  isTauri: vi.fn(),
  windows: vi.fn(),
  monitor: vi.fn(),
  once: vi.fn(),
  center: vi.fn(),
  show: vi.fn(),
  stop: vi.fn(),
  create: vi.fn(),
}));
vi.mock("./platform", () => ({ isTauriRuntime: mocks.isTauri }));
vi.mock("@tauri-apps/api/window", () => ({ primaryMonitor: mocks.monitor }));
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getAllWebviewWindows: mocks.windows,
  WebviewWindow: class MockWebviewWindow {
    once = mocks.once;

    center = mocks.center;

    constructor() {
      mocks.create();
    }
  },
}));
let handlers: Record<string, (event: { payload: unknown }) => void>;
beforeEach(() => {
  handlers = {};
  mocks.isTauri.mockReturnValue(true);
  mocks.windows.mockResolvedValue([]);
  mocks.monitor.mockResolvedValue(null);
  mocks.center.mockResolvedValue(undefined);
  mocks.show.mockResolvedValue(undefined);
  mocks.once.mockImplementation(async (event: string, handler: (typeof handlers)[string]) => {
    handlers[event] = handler;
    return mocks.stop;
  });
});
afterEach(() => vi.resetAllMocks());

it("waits for native creation so a subsequent disable cannot miss the new window", async () => {
  let finished = false;
  const opening = openPetWindow().then(() => {
    finished = true;
  });
  await vi.waitFor(() => expect(mocks.once).toHaveBeenCalledTimes(2));
  expect(finished).toBe(false);
  handlers["tauri://created"]({ payload: null });
  await opening;
  expect(mocks.center).toHaveBeenCalledOnce();
  expect(mocks.stop).toHaveBeenCalledTimes(2);
});

it("propagates native creation failures and releases listeners", async () => {
  const rejected = expect(openPetWindow()).rejects.toThrow("creation failed");
  await vi.waitFor(() => expect(mocks.once).toHaveBeenCalledTimes(2));
  handlers["tauri://error"]({ payload: "creation failed" });
  await rejected;
  expect(mocks.stop).toHaveBeenCalledTimes(2);
  expect(mocks.center).not.toHaveBeenCalled();
});

it("shows an existing pet instead of creating another", async () => {
  mocks.windows.mockResolvedValue([{ label: "pet", show: mocks.show }]);
  await openPetWindow();
  expect(mocks.show).toHaveBeenCalledOnce();
  expect(mocks.create).not.toHaveBeenCalled();
});
