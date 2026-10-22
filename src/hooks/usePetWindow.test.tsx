import { StrictMode, type PropsWithChildren } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { usePetWindow } from "./usePetWindow";

const mocks = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn(), isTauri: vi.fn() }));
vi.mock("../lib/platform", () => ({ isTauriRuntime: mocks.isTauri }));
vi.mock("../lib/petWindow", () => ({ openPetWindow: mocks.open, closePetWindow: mocks.close }));
beforeEach(() => {
  mocks.isTauri.mockReturnValue(true);
  mocks.open.mockResolvedValue(undefined);
  mocks.close.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

it("restores a saved enabled pet without a button click", async () => {
  renderHook(() => usePetWindow(true));
  await act(async () => {});
  expect(mocks.open).toHaveBeenCalledOnce();
  expect(mocks.close).not.toHaveBeenCalled();
});

it("keeps a saved disabled pet closed", async () => {
  renderHook(() => usePetWindow(false));
  await act(async () => {});
  expect(mocks.open).not.toHaveBeenCalled();
  expect(mocks.close).toHaveBeenCalledOnce();
});

it("restores the pet when saved settings finish loading", async () => {
  const { rerender } = renderHook(({ enabled }) => usePetWindow(enabled), {
    initialProps: { enabled: false },
  });
  await act(async () => {});
  rerender({ enabled: true });
  await act(async () => {});
  rerender({ enabled: true });
  await act(async () => {});
  expect(mocks.open).toHaveBeenCalledOnce();
});

it("does not create duplicate windows during StrictMode effect replay", async () => {
  function Wrapper({ children }: PropsWithChildren) {
    return <StrictMode>{children}</StrictMode>;
  }
  renderHook(() => usePetWindow(true), { wrapper: Wrapper });
  await act(async () => {});
  expect(mocks.open).toHaveBeenCalledOnce();
});

it("waits for a pending creation before closing after disable", async () => {
  let finishCreation: (() => void) | undefined;
  mocks.open.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishCreation = resolve;
      }),
  );
  const { rerender } = renderHook(({ enabled }) => usePetWindow(enabled), {
    initialProps: { enabled: true },
  });
  await act(async () => {});
  rerender({ enabled: false });
  await act(async () => {});
  expect(mocks.close).not.toHaveBeenCalled();
  await act(async () => {
    finishCreation?.();
  });
  expect(mocks.close).toHaveBeenCalledOnce();
});

it("can still close after a creation failure", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.open.mockRejectedValueOnce(new Error("creation failed"));
  const { rerender } = renderHook(({ enabled }) => usePetWindow(enabled), {
    initialProps: { enabled: true },
  });
  await act(async () => {});
  rerender({ enabled: false });
  await act(async () => {});
  expect(mocks.close).toHaveBeenCalledOnce();
});

it("does not access native windows in browser preview", async () => {
  mocks.isTauri.mockReturnValue(false);
  renderHook(() => usePetWindow(true));
  await act(async () => {});
  expect(mocks.open).not.toHaveBeenCalled();
  expect(mocks.close).not.toHaveBeenCalled();
});
