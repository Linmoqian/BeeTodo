# BeeTODO

BeeTODO 是一个基于 Tauri v2 + React 18 + TypeScript 的桌面应用。

## Web 开发

运行 `npm run dev` 后可直接调试以下窗口入口：

- 主窗口：`http://127.0.0.1:1420/#/`
- 成就与赞助：`http://127.0.0.1:1420/#/achievements`
- 专注磁贴：`http://127.0.0.1:1420/#/focus`
- 桌宠窗口：`http://127.0.0.1:1420/#/pet`
- 快捷便签：`http://127.0.0.1:1420/#/quick-note`
- 笔记磁贴：`http://127.0.0.1:1420/#/note-tile/<note-id>`

Web 模式使用同源 `localStorage` 同步任务、笔记、计时和设置，不依赖 Tauri API。桌面打包后，系统托盘可显示主窗口或打开快捷便签，默认全局快捷键为 `Ctrl+Space`，可在设置中修改；空白快捷便签可按 `Esc` 关闭，`Ctrl/Cmd+Enter` 保存。快捷便签、笔记磁贴、专注磁贴和桌宠均使用独立 WebView 窗口。

桌面主窗口采用无原生标题栏的圆角外壳，侧边栏提供关闭、最小化和缩放按钮。窗口空白区域可用于拖动，输入框、任务行和编辑器保持正常交互；macOS 点击 Dock 图标时会恢复主窗口，即使笔记磁贴仍处于打开状态。

## 核心功能

1. TODO 列表：创建、勾选与管理待办事项。
2. 学习便签：支持 Markdown 编辑、预览、检索及 `.md` 导入导出。
3. 桌面便签：支持托盘/全局快捷键快速记录，并可将单篇笔记固定为置顶磁贴。
4. 主题切换：提供 8 套明暗与彩色主题，并保存当前偏好。
5. 成就系统：通过 16 枚独立徽章记录任务、专注和学习便签进度。
6. 蜜蜂桌面宠物：可独立显示与交互的桌宠窗口。

## 版本更新与发布

设置页启动时会读取 [BeeTodo 最新 GitHub Release](https://github.com/Linmoqian/BeeTodo/releases/latest)，比较桌面包内版本，并按操作系统与 CPU 架构匹配安装包。发现新版本后，用户可打开官方安装资源；如果当前 Release 没有兼容资源，则只显示发布页，不会推荐其他平台的安装包。Web 开发模式无法读取桌面包版本，因此仅用于预览最新版本和资源匹配结果。

当前流程不会在应用内静默安装。若后续启用 Tauri 签名更新，需要配置 updater 插件、公开签名公钥、`createUpdaterArtifacts`、`latest.json`，并在 GitHub Actions Secrets 中保存 `TAURI_SIGNING_PRIVATE_KEY` 及其密码；私钥不得写入仓库。

赞助页面会读取 `public/wechat-qr.png` 作为微信二维码；未提供图片时显示缺图提示，不影响其他功能。

学习便签位于 `#/notes`。Web 开发阶段使用 `localStorage` 自动保存，桌面端后续可在不改动页面组件的前提下替换持久化适配器。便签交互参考了 MIT 许可的 [Floral Notepaper](https://github.com/Achilng/floral-notepaper)，许可说明见 `THIRD_PARTY_NOTICES.md`。

- 宠物和透明窗口：
![宠物](assets/images/image.png)

- TODO列表界面：
![TODO](assets/images/image-1.png)
