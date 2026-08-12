import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

afterEach(cleanup);

describe("ConfirmDialog", () => {
  it("renders title, description and actions", () => {
    render(
      <ConfirmDialog
        title="清除已完成任务"
        description="将永久删除 2 项已完成任务，且无法撤销。"
        confirmLabel="确认清除"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "清除已完成任务" })).toBeTruthy();
    expect(screen.getByText("将永久删除 2 项已完成任务，且无法撤销。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "确认清除" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "取消" })).toBeTruthy();
  });

  it("calls onConfirm only when confirmed", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        title="清除已完成任务"
        description="将永久删除 2 项已完成任务，且无法撤销。"
        confirmLabel="确认清除"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "确认清除" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when cancelled", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        title="清除已完成任务"
        description="将永久删除 2 项已完成任务，且无法撤销。"
        confirmLabel="确认清除"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel when Escape is pressed", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        title="清除已完成任务"
        description="将永久删除 2 项已完成任务，且无法撤销。"
        confirmLabel="确认清除"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
