import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useCallback } from "react";

interface DayItem {
  date: number;
  month: number;
  year: number;
  label: string;
  isSelected?: boolean;
  isToday?: boolean;
}

interface WeekStripProps {
  days: DayItem[];
  onDayPress?: (date: number, month: number, year: number) => void;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  direction?: number;
}

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 120 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -120 }),
};

export function WeekStrip({ days, onDayPress, onNextWeek, onPrevWeek, direction = 0 }: WeekStripProps) {
  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      if (info.offset.x < -50 || info.velocity.x < -300) {
        onNextWeek?.();
      } else if (info.offset.x > 50 || info.velocity.x > 300) {
        onPrevWeek?.();
      }
    },
    [onNextWeek, onPrevWeek]
  );

  const weekKey = days.map((d) => `${d.year}-${d.month}-${d.date}`).join(",");

  return (
    <nav
      aria-label="Week navigation"
      className="mx-[12px] mt-[12px] overflow-hidden rounded-[12px] bg-[#F7F7F7] px-[2px] py-[4px]"
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={weekKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="flex items-center justify-center gap-0"
        >
          {days.map((day) => {
            const isToday = day.isToday && !day.isSelected;
            return (
              <button
                key={`${day.year}-${day.month}-${day.date}`}
                type="button"
                onClick={() => onDayPress?.(day.date, day.month, day.year)}
                className={`flex h-[58px] flex-1 flex-col items-center justify-center gap-[2px] rounded-[8px] transition-colors ${
                  day.isSelected
                    ? "min-w-[60px] bg-surface shadow-subtle"
                    : ""
                }`}
              >
                <span
                  className={`flex h-[32px] w-[32px] items-center justify-center rounded-full text-[17px] font-medium leading-6 ${
                    day.isSelected
                      ? "text-text-strong"
                      : isToday
                        ? "bg-[#E8ECE9] text-text-strong"
                        : "text-text-primary"
                  }`}
                >
                  {day.date}
                </span>
                <span
                  className={`text-[12px] leading-4 ${
                    day.isSelected ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {day.label}
                </span>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </nav>
  );
}
