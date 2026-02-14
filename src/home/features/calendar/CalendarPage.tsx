import { useState, useMemo, useRef, useCallback } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ViewDropdown, type CalendarView } from "./ViewDropdown";
import type { CalendarEvent } from "../../../lib/useEvents";

const DAY_LABELS = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];

const TIME_SLOTS = [
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
];

interface Commitment {
  id: string;
  title: string;
  dueDate: string;
}

interface CalendarPageProps {
  onBack: () => void;
  events?: CalendarEvent[];
  userId?: string;
}

// ── helpers ──

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function getWeekRange(date: Date) {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function getMonthName(month: number) {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][month];
}

// ── helpers ──

function formatEventDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear();
  const h = date.getHours();
  const min = date.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  const time = min === 0 ? `${hour12} ${suffix}` : `${hour12}:${min.toString().padStart(2, "0")} ${suffix}`;
  return `${m}/${d}/${y} ${time}`;
}

// ── sub-components ──

function CommitmentItem({ commitment }: { commitment: Commitment }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between border-l-[3px] border-[#8A9A8A] bg-subtle-fill py-[14px] pl-[16px] pr-[16px] rounded-r-[8px]">
      <span className="text-[15px] font-medium leading-5 text-text-strong">
        {commitment.title}
      </span>
      <span className="text-[13px] leading-4 text-text-secondary">
        {commitment.dueDate}
      </span>
    </div>
  );
}

function MonthGrid({
  year,
  month,
  selectedDay,
  onSelectDay,
}: {
  year: number;
  month: number;
  selectedDay: number;
  onSelectDay: (d: number) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  const cells: { day: number; isCurrentMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, isCurrentMonth: false });
    }
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-y-[4px]">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-[8px] text-center text-[12px] leading-4 tracking-[0.04em] text-text-secondary"
          >
            {label}
          </div>
        ))}
        {cells.map((cell, i) => {
          const isSelected = cell.isCurrentMonth && cell.day === selectedDay;
          return (
            <button
              key={i}
              type="button"
              onClick={() => cell.isCurrentMonth && onSelectDay(cell.day)}
              className={`relative flex h-[44px] items-center justify-center text-[15px] leading-5 ${
                cell.isCurrentMonth
                  ? "text-text-strong"
                  : "text-text-tertiary"
              }`}
            >
              {isSelected && (
                <span className="absolute inset-0 m-auto h-[36px] w-[36px] rounded-full border border-border" />
              )}
              <span className="relative z-10">{cell.day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekStrip({
  weekStart,
  selectedDay,
  onSelectDay,
}: {
  weekStart: Date;
  selectedDay: number;
  onSelectDay: (d: number) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7">
      {DAY_LABELS.map((label) => (
        <div
          key={label}
          className="py-[8px] text-center text-[12px] leading-4 tracking-[0.04em] text-text-secondary"
        >
          {label}
        </div>
      ))}
      {days.map((d) => {
        const dayNum = d.getDate();
        const isSelected = dayNum === selectedDay;
        return (
          <button
            key={dayNum}
            type="button"
            onClick={() => onSelectDay(dayNum)}
            className="relative flex h-[44px] items-center justify-center text-[15px] leading-5 text-text-strong"
          >
            {isSelected && (
              <span className="absolute inset-0 m-auto h-[36px] w-[36px] rounded-[10px] border border-border" />
            )}
            <span className="relative z-10">{dayNum}</span>
          </button>
        );
      })}
    </div>
  );
}

function TimeSlots({ events = [] }: { events?: CalendarEvent[] }) {
  const slotHeight = 44;
  const startHourOffset = 9; // first slot is 9 AM

  return (
    <div className="mt-md relative flex flex-col">
      {TIME_SLOTS.map((slot) => (
        <div
          key={slot}
          className="flex h-[44px] items-center border-t border-subtle-fill px-[4px] text-[13px] leading-4 text-text-secondary"
        >
          {slot}
        </div>
      ))}
      {events.map((e) => {
        const startHour = e.start.getHours() + e.start.getMinutes() / 60;
        const endHour = e.end.getHours() + e.end.getMinutes() / 60;
        const duration = Math.max(endHour - startHour, 0.5);
        const top = (startHour - startHourOffset) * slotHeight;
        const height = duration * slotHeight;
        if (top < 0 || top >= TIME_SLOTS.length * slotHeight) return null;
        return (
          <div
            key={e.id}
            className="absolute left-[52px] right-[4px] rounded-[8px] bg-accent/15 border-l-[3px] border-accent px-[10px] py-[6px] overflow-hidden"
            style={{ top, height: Math.min(height, TIME_SLOTS.length * slotHeight - top) }}
          >
            <span className="text-[13px] font-medium leading-4 text-text-strong truncate block">
              {e.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Bottom sheet snap points (fractions of viewport) ──
type SheetSnap = "closed" | "half" | "full";
const SNAP_FRACTIONS: Record<SheetSnap, number> = {
  closed: 0.14,  // peek above navbar so handle is grabbable
  half: 0.5,
  full: 0.8,
};
const SNAP_ORDER: SheetSnap[] = ["closed", "half", "full"];

// ── main component ──

export default function CalendarPage({ onBack, events = [] }: CalendarPageProps) {
  const now = new Date();
  const [view, setView] = useState<CalendarView>("month");
  const [currentYear] = useState(now.getFullYear());
  const [currentMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("closed");
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);

  const handleDragStart = useCallback((_: any, info: PanInfo) => {
    dragStartY.current = info.point.y;
  }, []);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const vh = window.innerHeight;
      const delta = dragStartY.current - info.point.y; // positive = dragged up
      const currentFraction = SNAP_FRACTIONS[sheetSnap];
      const targetFraction = currentFraction + delta / vh;

      // Find the nearest snap point
      let closest: SheetSnap = "closed";
      let minDist = Infinity;
      for (const snap of SNAP_ORDER) {
        const dist = Math.abs(SNAP_FRACTIONS[snap] - targetFraction);
        if (dist < minDist) {
          minDist = dist;
          closest = snap;
        }
      }

      // Also account for velocity — a fast flick should go to next snap
      if (info.velocity.y < -300 && sheetSnap !== "full") {
        const idx = SNAP_ORDER.indexOf(sheetSnap);
        closest = SNAP_ORDER[Math.min(idx + 1, SNAP_ORDER.length - 1)];
      } else if (info.velocity.y > 300 && sheetSnap !== "closed") {
        const idx = SNAP_ORDER.indexOf(sheetSnap);
        closest = SNAP_ORDER[Math.max(idx - 1, 0)];
      }

      setSheetSnap(closest);
    },
    [sheetSnap]
  );

  const selectedDate = useMemo(
    () => new Date(currentYear, currentMonth, selectedDay),
    [currentYear, currentMonth, selectedDay]
  );

  const { start: weekStart, end: weekEnd } = useMemo(
    () => getWeekRange(selectedDate),
    [selectedDate]
  );

  // Filter events based on current view
  const filteredEvents = useMemo(() => {
    if (view === "month") {
      return events.filter((e) => {
        return e.start.getFullYear() === currentYear && e.start.getMonth() === currentMonth;
      });
    }
    if (view === "week") {
      const wEnd = new Date(weekEnd);
      wEnd.setHours(23, 59, 59, 999);
      return events.filter((e) => e.start >= weekStart && e.start <= wEnd);
    }
    // day view
    return events.filter((e) => {
      return (
        e.start.getFullYear() === currentYear &&
        e.start.getMonth() === currentMonth &&
        e.start.getDate() === selectedDay
      );
    });
  }, [events, view, currentYear, currentMonth, selectedDay, weekStart, weekEnd]);

  // Events for the selected day (for time slot views)
  const dayEvents = useMemo(() => {
    return events.filter((e) => {
      return (
        e.start.getFullYear() === currentYear &&
        e.start.getMonth() === currentMonth &&
        e.start.getDate() === selectedDay &&
        !e.allDay
      );
    });
  }, [events, currentYear, currentMonth, selectedDay]);

  // Commitments for the bottom sheet
  const commitments: Commitment[] = useMemo(() => {
    return filteredEvents.map((e) => ({
      id: e.id,
      title: e.title,
      dueDate: formatEventDate(e.start),
    }));
  }, [filteredEvents]);

  const monthName = getMonthName(currentMonth);

  const subtitle =
    view === "week"
      ? `${weekStart.getDate()}-${weekEnd.getDate()}`
      : undefined;

  const commitmentsLabel =
    view === "month" ? "This month\u2019s commitments" : "Upcoming this week";

  const sheetHeight = `${SNAP_FRACTIONS[sheetSnap] * 100}vh`;

  return (
    <div className="relative mx-auto min-h-screen max-w-[402px] bg-background">
      {/* Back button */}
      <div className="flex items-center justify-between px-lg pt-[52px]">
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
        <ViewDropdown value={view} onChange={setView} />
      </div>

      {/* Month title */}
      <div className="mt-md px-lg">
        <h1 className="font-serif text-[28px] leading-[34px] tracking-[-0.3px] text-text-strong">
          {monthName}
          {subtitle && (
            <span className="ml-[6px] font-sans text-[15px] font-normal leading-5 tracking-normal text-text-secondary">
              {subtitle}
            </span>
          )}
        </h1>
      </div>

      {/* Calendar content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="mt-lg px-lg"
        >
          {view === "month" && (
            <MonthGrid
              year={currentYear}
              month={currentMonth}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          )}

          {view === "week" && (
            <>
              <WeekStrip
                weekStart={weekStart}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
              <TimeSlots events={dayEvents} />
            </>
          )}

          {view === "day" && <TimeSlots events={dayEvents} />}
        </motion.div>
      </AnimatePresence>

      {/* Fixed bottom sheet — drag to expand, behind navbar (z-0) */}
      <motion.div
        ref={sheetRef}
        animate={{ height: sheetHeight }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-10 overflow-hidden rounded-t-[28px] bg-surface shadow-[0_-4px_24px_rgba(0,0,0,0.03)]"
      >
        {/* Drag handle */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className="flex w-full cursor-grab items-center justify-center pb-[8px] pt-[12px] active:cursor-grabbing touch-none"
        >
          <div className="h-[4px] w-[36px] rounded-full bg-border" />
        </motion.div>

        <motion.div
          animate={{ opacity: sheetSnap === "closed" ? 0 : 1 }}
          transition={{ duration: 0.15 }}
          className="mx-auto max-w-[402px] overflow-y-auto px-lg pb-24"
          style={{ maxHeight: "calc(100% - 36px)", pointerEvents: sheetSnap === "closed" ? "none" : "auto" }}
        >
          <h2 className="mb-[16px] text-[17px] font-semibold leading-6 text-text-strong">
            {commitmentsLabel}
          </h2>

          <div className="flex flex-col gap-[10px]">
            {commitments.length > 0 ? (
              commitments.map((c) => (
                <CommitmentItem key={c.id} commitment={c} />
              ))
            ) : (
              <p className="text-[13px] leading-4 text-text-tertiary">No events</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
