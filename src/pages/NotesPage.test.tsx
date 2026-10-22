import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesPage } from "./NotesPage";
import { NoteTileWindow } from "../components/NoteTileWindow";

const markdown =
  "# 一级标题\n\n## 二级标题\n\n**粗体** 与 *斜体* 与 ~~删除线~~\n\n- 第一项\n- 第二项\n\n1. 有序项\n\n`**代码原样**`\n\n```md\n# 代码标题\n```";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "beetodo-study-notes",
    JSON.stringify([
      {
        id: "markdown",
        title: "格式检查",
        content: markdown,
        category: "学习",
        createdAt: 1,
        updatedAt: 1,
      },
    ]),
  );
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

function expectMarkdown(container: HTMLElement) {
  expect(screen.getByRole("heading", { level: 1, name: "一级标题" })).toBeTruthy();
  expect(screen.getByRole("heading", { level: 2, name: "二级标题" })).toBeTruthy();
  expect(container.querySelector(".markdown-body strong")?.textContent).toBe("粗体");
  expect(container.querySelector(".markdown-body em")?.textContent).toBe("斜体");
  expect(container.querySelector(".markdown-body del")?.textContent).toBe("删除线");
  expect(container.querySelectorAll(".markdown-body ul li")).toHaveLength(2);
  expect(container.querySelectorAll(".markdown-body ol li")).toHaveLength(1);
  expect(container.querySelector(".markdown-body code")?.textContent).toBe("**代码原样**");
  expect(container.querySelector(".markdown-body pre code")?.textContent).toBe("# 代码标题\n");
}

it("renders Markdown in the note preview and keeps the editor source unchanged", async () => {
  const user = userEvent.setup();
  const { container } = render(<NotesPage />);
  expect((screen.getByLabelText("Markdown 内容") as HTMLTextAreaElement).value).toBe(markdown);
  await user.click(screen.getByRole("button", { name: "预览" }));
  expectMarkdown(container);
  await user.click(screen.getByRole("button", { name: "编辑" }));
  expect((screen.getByLabelText("Markdown 内容") as HTMLTextAreaElement).value).toBe(markdown);
});

it("renders the same Markdown in a desktop note tile", async () => {
  const { container } = render(<NoteTileWindow noteId="markdown" />);
  await screen.findByRole("heading", { level: 1, name: "一级标题" });
  expectMarkdown(container);
});
