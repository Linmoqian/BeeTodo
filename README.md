# BeeTODO

BeeTODO 是一个基于 Tauri v2 + React 18 + TypeScript 的桌面应用。

## 核心功能

1. TODO 列表：创建、勾选与管理待办事项。
2. 主题切换：支持主题偏好切换。
3. 蜜蜂桌面宠物：可独立显示与交互的桌宠窗口。

## 本地开发

```bash
npm install
npm run tauri dev
```

## 发布发行版（Windows 11 + macOS）

项目已配置 GitHub Actions 自动发布流程：[.github/workflows/release.yml](.github/workflows/release.yml)。

1. 更新版本号：[package.json](package.json) 与 [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)。
2. 提交代码并创建版本标签，例如 `v0.1.1`。
3. 推送标签后，工作流会自动构建 Windows 安装包与 macOS（Apple Silicon + Intel）安装包。
4. Release 以 Draft 形式创建，确认无误后手动发布。

## 推荐 IDE

- [VS Code](https://code.visualstudio.com/)
- [Tauri 扩展](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
