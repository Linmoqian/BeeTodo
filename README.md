# BeeTODO

BeeTODO 是一个基于 Tauri v2 + React 18 + TypeScript 的桌面应用。

## Web 开发

运行 `npm run dev` 后可直接调试三个窗口入口：

- 主窗口：`http://127.0.0.1:1420/#/`
- 专注磁贴：`http://127.0.0.1:1420/#/focus`
- 桌宠窗口：`http://127.0.0.1:1420/#/pet`

Web 模式使用同源 `localStorage` 同步任务、计时和设置，不依赖 Tauri API。桌面打包时，专注磁贴和桌宠分别由独立的透明 WebView 窗口加载对应路由。

## 核心功能

1. TODO 列表：创建、勾选与管理待办事项。
2. 主题切换：支持主题偏好切换。
3. 蜜蜂桌面宠物：可独立显示与交互的桌宠窗口。

- 宠物和透明窗口：
![宠物](assets/images/image.png)

- TODO列表界面：
![TODO](assets/images/image-1.png)
