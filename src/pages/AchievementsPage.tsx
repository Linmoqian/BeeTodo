import { motion } from "motion/react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Coffee,
  QrCode,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { useNotes } from "../hooks/useNotes";
import type { Todo } from "../types";

interface AchievementsPageProps {
  todos: Todo[];
  totalMs: number;
}

interface Achievement {
  title: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  icon: typeof Trophy;
}

function formatFocusMinutes(milliseconds: number) {
  return Math.floor(milliseconds / 60_000);
}

export function AchievementsPage({ todos, totalMs }: AchievementsPageProps) {
  const { notes } = useNotes();
  const [qrMissing, setQrMissing] = useState(false);
  const completedCount = todos.filter((todo) => todo.completed).length;
  const focusMinutes = formatFocusMinutes(totalMs);
  const achievements: Achievement[] = [
    { title: "第一步", description: "完成第一个任务", current: completedCount, target: 1, unit: "项", icon: CheckCircle2 },
    { title: "稳定前进", description: "累计完成 5 个任务", current: completedCount, target: 5, unit: "项", icon: Sparkles },
    { title: "一个番茄钟", description: "累计专注 25 分钟", current: focusMinutes, target: 25, unit: "分钟", icon: Clock3 },
    { title: "深度工作", description: "累计专注 120 分钟", current: focusMinutes, target: 120, unit: "分钟", icon: Award },
    { title: "知识种子", description: "写下第一篇学习便签", current: notes.length, target: 1, unit: "篇", icon: BookOpen },
    { title: "知识花园", description: "积累 10 篇学习便签", current: notes.length, target: 10, unit: "篇", icon: Trophy },
  ];
  const unlockedCount = achievements.filter((item) => item.current >= item.target).length;

  return (
    <motion.div
      className="page achievements-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="page-header compact">
        <div>
          <span className="eyebrow">Progress</span>
          <h1>成就</h1>
          <p>每一次完成和专注，都在为长期进步积累证据。</p>
        </div>
        <div className="achievement-summary">
          <Trophy size={18} />
          <strong>{unlockedCount}</strong>
          <span>/ {achievements.length} 已解锁</span>
        </div>
      </header>

      <section className="achievement-grid" aria-label="成就列表">
        {achievements.map((achievement, index) => {
          const unlocked = achievement.current >= achievement.target;
          const progress = Math.min(100, (achievement.current / achievement.target) * 100);
          const Icon = achievement.icon;
          return (
            <motion.article
              key={achievement.title}
              className={unlocked ? "achievement-card is-unlocked" : "achievement-card"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.045, duration: 0.28 }}
              whileHover={{ y: -3 }}
            >
              <span className="achievement-icon"><Icon size={18} /></span>
              <div>
                <strong>{achievement.title}</strong>
                <p>{achievement.description}</p>
              </div>
              <small>{Math.min(achievement.current, achievement.target)} / {achievement.target} {achievement.unit}</small>
              <div className="achievement-progress" aria-hidden="true">
                <motion.span initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
              </div>
            </motion.article>
          );
        })}
      </section>

      <section className="support-card">
        <div className="support-copy">
          <span className="achievement-icon"><Coffee size={18} /></span>
          <div>
            <span className="eyebrow">Support</span>
            <h2>请 BeeTodo 喝杯咖啡</h2>
            <p>如果它让学习更轻松，可以通过微信支持后续开发。感谢每一份认可。</p>
          </div>
        </div>
        <div className="support-qr">
          {!qrMissing ? (
            <img src="/wechat-qr.png" alt="微信赞助二维码" onError={() => setQrMissing(true)} />
          ) : (
            <div className="qr-placeholder">
              <QrCode size={28} />
              <span>等待添加微信二维码</span>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
