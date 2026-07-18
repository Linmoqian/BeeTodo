# BeeTODO

BeeTODO 是一个基于 Tauri v2 + React 18 + TypeScript 的桌面应用。

## Web 开发

运行 `npm run dev` 后可直接调试以下窗口入口：

- 主窗口：`http://127.0.0.1:1420/#/`
- 专注磁贴：`http://127.0.0.1:1420/#/focus`
- 桌宠窗口：`http://127.0.0.1:1420/#/pet`
- 快捷便签：`http://127.0.0.1:1420/#/quick-note`
- 笔记磁贴：`http://127.0.0.1:1420/#/note-tile/<note-id>`

Web 模式使用同源 `localStorage` 同步任务、笔记、计时和设置，不依赖 Tauri API。桌面打包后，系统托盘可显示主窗口或打开快捷便签，默认全局快捷键为 `Ctrl+Space`；快捷便签、笔记磁贴、专注磁贴和桌宠均使用独立 WebView 窗口。

## 核心功能

1. TODO 列表：创建、勾选与管理待办事项。
2. 学习便签：支持 Markdown 编辑、预览、检索及 `.md` 导入导出。
3. 桌面便签：支持托盘/全局快捷键快速记录，并可将单篇笔记固定为置顶磁贴。
4. 主题切换：支持主题偏好切换。
5. 蜜蜂桌面宠物：可独立显示与交互的桌宠窗口。

学习便签位于 `#/notes`。Web 开发阶段使用 `localStorage` 自动保存，桌面端后续可在不改动页面组件的前提下替换持久化适配器。便签交互参考了 MIT 许可的 [Floral Notepaper](https://github.com/Achilng/floral-notepaper)，许可说明见 `THIRD_PARTY_NOTICES.md`。

- 宠物和透明窗口：
![宠物](assets/images/image.png)

- TODO列表界面：
![TODO](assets/images/image-1.png)
