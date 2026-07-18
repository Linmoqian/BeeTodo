import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const GUIDE = `
# 使用指南

BeeTodo 把任务管理和专注计时放在同一个安静的空间里。

## 快速开始

1. 在「今日」输入一件要完成的事。
2. 点击任务右侧的播放按钮开始计时。
3. 完成后勾选圆形按钮，任务会进入已完成状态。

## 整理任务

- 拖动左侧手柄可以调整顺序。
- 在更多菜单中可以置顶、设置颜色或删除任务。
- 「全部任务」支持按进行中和已完成筛选。

> Web 开发阶段的数据保存在当前浏览器中。接入 FastAPI 后会迁移到统一的数据服务。

## 快捷原则

| 目标 | 建议 |
| --- | --- |
| 保持专注 | 同一时间只运行一个计时器 |
| 减少负担 | 任务标题保持短小、可执行 |
| 每日收尾 | 清理过期任务并回顾专注时间 |
`;

export function GuidePage() {
  return (
    <motion.div className="page guide-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{GUIDE}</ReactMarkdown>
    </motion.div>
  );
}
