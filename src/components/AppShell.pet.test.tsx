import { StrictMode, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { DEFAULT_SETTINGS } from "../lib/platform";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  close: vi.fn(),
  settings: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../lib/petWindow", () => ({ openPetWindow: mocks.open, closePetWindow: mocks.close }));
vi.mock("../lib/platform", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/platform")>()),
  isTauriRuntime: () => true,
  getAppSettings: mocks.settings,
  updateAppSettings: mocks.update,
}));
vi.mock("./MobilePin", () => ({ MobilePin: () => null }));
vi.mock("./WindowControls", () => ({ WindowControls: () => null }));
vi.mock("./AppContextMenu", () => ({ AppContextMenu: () => null }));
vi.mock("./UpdateSettings", () => ({ UpdateSettings: () => null }));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.resetAllMocks();
});

it("opens a saved enabled pet once after the real settings components load at startup", async () => {
  mocks.settings.mockResolvedValue({ ...DEFAULT_SETTINGS, petEnabled: true });
  mocks.open.mockResolvedValue(undefined);
  mocks.close.mockResolvedValue(undefined);
  function MainWindow() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    return (
      <AppShell settings={settings} totalMs={0} onSettingsChange={setSettings}>
        Main content
      </AppShell>
    );
  }
  render(
    <StrictMode>
      <MemoryRouter>
        <MainWindow />
      </MemoryRouter>
    </StrictMode>,
  );
  await act(async () => {});
  expect(mocks.settings).toHaveBeenCalled();
  expect(mocks.open).toHaveBeenCalledOnce();
});

it("keeps sidebar and settings switches in sync and uses one window owner", async () => {
  const user = userEvent.setup();
  mocks.settings.mockResolvedValue({ ...DEFAULT_SETTINGS, petEnabled: true });
  mocks.update.mockImplementation(async (_command, _args, patch) => ({
    ...DEFAULT_SETTINGS,
    ...patch,
  }));
  mocks.open.mockResolvedValue(undefined);
  mocks.close.mockResolvedValue(undefined);
  function MainWindow() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    return (
      <AppShell settings={settings} totalMs={0} onSettingsChange={setSettings}>
        Content
      </AppShell>
    );
  }
  render(
    <MemoryRouter>
      <MainWindow />
    </MemoryRouter>,
  );
  await act(async () => {});
  await user.click(screen.getByRole("button", { name: "关闭桌宠" }));
  await user.click(screen.getAllByRole("button", { name: "设置" })[0]);
  const toggle = screen.getByRole("button", { name: "蜜蜂桌宠" });
  expect(toggle.querySelector(".switch")?.classList.contains("is-on")).toBe(false);
  await user.click(toggle);
  expect(screen.getByRole("button", { name: "关闭桌宠" })).toBeTruthy();
  expect(toggle.querySelector(".switch")?.classList.contains("is-on")).toBe(true);
  expect(mocks.open).toHaveBeenCalledTimes(2);
});
