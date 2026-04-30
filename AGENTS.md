# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

Tauri v2 桌面应用：React 18 前端 + Rust 后端，Vite 构建。项目标识 `com.todo.app`。

## 常用命令

```bash
# 前端开发（仅 Web 层，Vite dev server on :1420）
npm run dev

# 构建前端
npm run build

# Tauri 开发模式（同时启动前端 + Rust 后端，首次编译较慢）
npm run tauri dev

# 构建生产包
npm run tauri build
```

## 架构

```
src/                  # React 前端（TypeScript + Vite）
src-tauri/            # Rust 后端（Tauri v2）
  src/
    lib.rs            # Tauri 命令定义 + 应用初始化
    main.rs           # 入口，调用 todo_lib::run()
  capabilities/       # Tauri 权限配置
  tauri.conf.json     # 应用配置（窗口、构建、打包）
```

### 前后端通信

前端通过 `@tauri-apps/api/core` 的 `invoke()` 调用 Rust 端 `#[tauri::command]` 函数。新增命令需在 `lib.rs` 的 `generate_handler![]` 宏中注册。

### 添加新 Tauri 命令的步骤

1. 在 `src-tauri/src/lib.rs` 中定义 `#[tauri::command]` 函数
2. 将函数名加入 `generate_handler![]` 宏
3. 如需新权限，在 `src-tauri/capabilities/default.json` 中添加
4. 前端通过 `invoke("command_name", { args })` 调用

## 技术栈版本

- Tauri: v2
- React: 18.x
- TypeScript: ~5.6
- Vite: 6.x
- Rust edition: 2021
