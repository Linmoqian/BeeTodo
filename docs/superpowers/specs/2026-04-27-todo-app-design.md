# TODO 桌面应用设计文档

## 概述

Tauri v2 桌面 TODO 应用，粉色主色 + 紫色辅色，干净青春现代化风格。

## 技术栈

| 用途 | 选型 |
|---|---|
| UI 组件 | shadcn/ui + Tailwind CSS |
| 拖拽排序 | @dnd-kit/core + @dnd-kit/sortable |
| 动效 | motion（原 framer-motion） |
| 背景动效 | 纯 CSS keyframes + blur |
| 构建 | Vite 6 + TypeScript 5.6 |
| 桌面壳 | Tauri v2 |

## 数据模型

```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}
```

数据存储在内存，后续接入 Rust 后端持久化。

## UI 布局

- 背景：粉色/紫色渐变底色 + 2-3 个模糊光斑缓慢浮动
- 中央：圆角毛玻璃卡片（标题 + 输入区 + 列表区）
- TODO 项：拖拽手柄 | 复选框 | 文本 | 删除按钮

## 交互动效

| 场景 | 实现 |
|---|---|
| 添加项 | AnimatePresence 从上方滑入 |
| 删除项 | 向右滑出 + 淡出 |
| 拖拽中 | scale 1.05 + 阴影加深 |
| 按钮 | whileHover scale 1.05, whileTap scale 0.95 |
| 背景 | CSS @keyframes 流动光斑 |

## 组件结构

```
src/
  App.tsx            # 背景 + 主卡片
  components/
    TodoInput.tsx     # 输入框 + 添加按钮
    TodoItem.tsx      # 单个 TODO 项（可拖拽）
    TodoList.tsx      # 列表容器，管理拖拽排序
  hooks/
    useTodos.ts       # CRUD 状态管理
  types.ts           # Todo 类型定义
  index.css          # Tailwind + 背景动效 + 主题变量
```

## 色彩方案

- 主色（粉）：`#ec4899`（pink-500）
- 辅色（紫）：`#a855f7`（purple-500）
- 背景：粉紫渐变 `from-pink-100 to-purple-100`
- 卡片：白色半透明 + backdrop-blur
