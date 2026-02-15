import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { db } from "../../../lib/firebase";
import { TaskListItem } from "./TaskListItem";

const CATEGORIES = ["protect", "progress", "maintain", "flourish"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  protect: "Protect",
  progress: "Progress",
  maintain: "Maintain",
  flourish: "Flourish",
};

const snappySpring = { type: "spring" as const, stiffness: 350, damping: 30, mass: 1 };

interface Task {
  id: string;
  title: string;
  dueDate: string;
  description: string;
  tag: string;
  category: Category;
  completed: boolean;
}

interface TasksPageProps {
  onBack: () => void;
  userId: string;
}

export default function TasksPage({ onBack, userId }: TasksPageProps) {
  const [activeCategory, setActiveCategory] = useState<Category>("protect");
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "users", userId, "tasks"),
      where("category", "==", activeCategory)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Task[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Task, "id">),
      }));
      setTasks(fetched);
    });

    return () => unsubscribe();
  }, [userId, activeCategory]);

  const dismissTask = async (taskId: string) => {
    await deleteDoc(doc(db, "users", userId, "tasks", taskId));
  };

  return (
    <div className="relative mx-auto max-w-[402px] bg-background">
      {/* Back button */}
      <div className="px-lg pt-[52px]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-[6px] text-[15px] leading-5 text-text-strong"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 4L6 8L10 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
      </div>

      {/* Title */}
      <h1 className="mt-md text-center font-serif text-[28px] leading-[34px] tracking-[-0.3px] text-text-strong">
        Tasks
      </h1>

      {/* Animated category tabs */}
      <LayoutGroup>
        <div className="mt-lg flex gap-[24px] overflow-x-auto px-lg scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="relative shrink-0 rounded-full px-[16px] py-[7px] text-[15px] leading-5 outline-none transition-colors duration-200"
            >
              {activeCategory === cat && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 rounded-full border border-border bg-[#FFFFFF]"
                  transition={snappySpring}
                />
              )}
              <span
                className={`relative z-10 ${
                  activeCategory === cat
                    ? "text-text-strong"
                    : "text-text-secondary"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      {/* Task list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mt-xl flex flex-col gap-md px-lg pb-32"
        >
          {tasks.length === 0 ? (
            <p className="py-5xl text-center text-[15px] text-text-tertiary">
              No tasks yet in {CATEGORY_LABELS[activeCategory]}.
            </p>
          ) : (
            tasks.map((task) => (
              <TaskListItem
                key={task.id}
                title={task.title}
                dueDate={task.dueDate}
                description={task.description}
                onDismiss={() => dismissTask(task.id)}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
