# 自动构建依赖管理修复

## 问题

项目在 package.json 声明 pnpm@10.34.5，并提交 pnpm-lock.yaml，没有 npm 的 package-lock.json。Build 工作流却配置 npm 缓存并执行 npm ci：缓存步骤无法使用 pnpm 锁文件，npm ci 也无法按现有锁文件安装依赖，导致干净构建失败。

## 修复

与现有 Release 工作流保持一致，在 setup-node 的缓存恢复前使用 pnpm/action-setup@v4 安装 pnpm，版本由 package.json 的 packageManager 声明决定。缓存类型改为 pnpm，明确使用 pnpm-lock.yaml，安装命令改为 pnpm install --frozen-lockfile。

本次保留 Node 20、现有 macOS/Windows 构建矩阵、触发条件和 Tauri 构建步骤，未调整发布工作流或锁文件。

## 验证及限制

- 解析 YAML 并验证 pnpm 安装在 Node 缓存步骤之前、缓存/锁文件匹配、安装命令正确，同时与原配置比较确认触发条件、矩阵和 Tauri 步骤不变。
- pnpm 10.34.5 的冻结锁文件检查通过：pnpm install --frozen-lockfile --lockfile-only --ignore-scripts。
- 本地 Node 24 下 pnpm build 与 git diff --check 通过。
- 本地检查没有运行完整依赖安装脚本，也不能代替 Windows/macOS 各目标的 GitHub Actions 构建。远程验证以 PR 工作流结果为准，Fork PR 可能需要维护者批准运行。

参考：[pnpm/action-setup](https://github.com/pnpm/action-setup)、[actions/setup-node](https://github.com/actions/setup-node)。
