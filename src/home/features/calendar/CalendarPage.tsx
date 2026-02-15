import { useState, useMemo, useRef, useCallback } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ViewDropdown, type CalendarView } from "./ViewDropdown";
import type { CalendarEvent } from "../../../lib/useEvents";
import { AddItemModal } from "../home/components/AddItemModal";

const DAY_LABELS = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];

const TIME_SLOTS = [
  "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM",
  "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
  "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM",
  "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM",
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
  onNavPress?: (id: string) => void;
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

/** Compute a stable week key from a date (Sunday of that week). */
function weekKeyFor(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ── sub-components ──

function CommitmentItem({ commitment, onClick }: { commitment: Commitment; onClick?: () => void }) {
  return (
    <div
      className={`flex min-h-[52px] items-center justify-between rounded-[2px] py-[14px] pl-[16px] pr-[16px]${onClick ? " cursor-pointer" : ""}`}
      style={{ backgroundColor: "#F7F7F7", borderLeft: "3px solid #6F8F7A" }}
      onClick={onClick}
    >
      <span className="text-[15px] font-medium leading-5 text-text-strong">
        {commitment.title}
      </span>
      <span className="text-[13px] leading-4 text-gray-400 whitespace-nowrap ml-[8px]">
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
                <span className="absolute inset-0 m-auto h-[36px] w-[36px] rounded-full bg-accent/15" />
              )}
              <span className={`relative z-10 ${isSelected ? "font-semibold text-accent" : ""}`}>{cell.day}</span>
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
              <span className="absolute inset-0 m-auto h-[36px] w-[36px] rounded-full bg-accent/15" />
            )}
            <span className={`relative z-10 ${isSelected ? "font-semibold text-accent" : ""}`}>{dayNum}</span>
          </button>
        );
      })}
    </div>
  );
}

function formatTime12(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function TimeSlots({ events = [], onEventPress }: { events?: CalendarEvent[]; onEventPress?: (eventId: string) => void }) {
  const slotHeight = 44;
  const startHourOffset = 0;

  return (
    <div className="mt-md relative flex flex-col overflow-y-auto max-h-[400px]">
      {TIME_SLOTS.map((slot) => (
        <div
          key={slot}
          className="flex h-[44px] shrink-0 items-center px-[4px] text-[13px] leading-4 text-text-secondary"
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
        const timeRange = `${formatTime12(e.start)} \u2013 ${formatTime12(e.end)}`;
        return (
          <div
            key={e.id}
            className={`absolute left-[52px] right-[4px] flex items-center justify-between overflow-hidden rounded-[2px] px-[14px] py-[8px]${onEventPress ? " cursor-pointer" : ""}`}
            style={{
              top,
              height: Math.min(height, TIME_SLOTS.length * slotHeight - top) - 3,
              backgroundColor: "#F7F7F7",
              borderLeft: "3px solid #6F8F7A",
            }}
            onClick={() => onEventPress?.(e.id)}
          >
            <span className="text-[15px] font-medium leading-5 text-text-strong truncate">
              {e.title}
            </span>
            <span className="text-[13px] leading-4 text-gray-400 whitespace-nowrap ml-[8px]">
              {timeRange}
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

// ── nav icons (same as BottomNav) ──
const navIcons = {
  home: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chat: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  profile: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const NAV_ITEMS: { id: string; icon: keyof typeof navIcons }[] = [
  { id: "home", icon: "home" },
  { id: "chat", icon: "chat" },
  { id: "calendar", icon: "calendar" },
  { id: "profile", icon: "profile" },
];

// ── main component ──

export default function CalendarPage({ onBack, events = [], userId, onNavPress }: CalendarPageProps) {
  const now = new Date();
  const [view, setView] = useState<CalendarView>("month");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("closed");
  const [swipeDirection, setSwipeDirection] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);

  // Navigation helpers — only for month/week/day pagination (not day-within-week)
  const goNext = useCallback(() => {
    setSwipeDirection(1);
    if (view === "month") {
      setCurrentMonth((m) => {
        if (m >= 11) {
          setCurrentYear((y) => y + 1);
          return 0;
        }
        return m + 1;
      });
      setSelectedDay((d) => {
        const newMonth = currentMonth >= 11 ? 0 : currentMonth + 1;
        const newYear = currentMonth >= 11 ? currentYear + 1 : currentYear;
        const maxDay = getDaysInMonth(newYear, newMonth);
        return Math.min(d, maxDay);
      });
    } else if (view === "week") {
      const next = new Date(currentYear, currentMonth, selectedDay + 7);
      setCurrentYear(next.getFullYear());
      setCurrentMonth(next.getMonth());
      setSelectedDay(next.getDate());
    } else {
      const next = new Date(currentYear, currentMonth, selectedDay + 1);
      setCurrentYear(next.getFullYear());
      setCurrentMonth(next.getMonth());
      setSelectedDay(next.getDate());
    }
  }, [view, currentYear, currentMonth, selectedDay]);

  const goPrev = useCallback(() => {
    setSwipeDirection(-1);
    if (view === "month") {
      setCurrentMonth((m) => {
        if (m <= 0) {
          setCurrentYear((y) => y - 1);
          return 11;
        }
        return m - 1;
      });
      setSelectedDay((d) => {
        const newMonth = currentMonth <= 0 ? 11 : currentMonth - 1;
        const newYear = currentMonth <= 0 ? currentYear - 1 : currentYear;
        const maxDay = getDaysInMonth(newYear, newMonth);
        return Math.min(d, maxDay);
      });
    } else if (view === "week") {
      const prev = new Date(currentYear, currentMonth, selectedDay - 7);
      setCurrentYear(prev.getFullYear());
      setCurrentMonth(prev.getMonth());
      setSelectedDay(prev.getDate());
    } else {
      const prev = new Date(currentYear, currentMonth, selectedDay - 1);
      setCurrentYear(prev.getFullYear());
      setCurrentMonth(prev.getMonth());
      setSelectedDay(prev.getDate());
    }
  }, [view, currentYear, currentMonth, selectedDay]);

  // Swipe handler for calendar content
  const handleCalendarDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const swipeThreshold = 50;
      const velocityThreshold = 300;
      if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
        goNext();
      } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
        goPrev();
      }
    },
    [goNext, goPrev]
  );

  // Sheet drag handlers
  const handleDragStart = useCallback((_: any, info: PanInfo) => {
    dragStartY.current = info.point.y;
  }, []);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const vh = window.innerHeight;
      const delta = dragStartY.current - info.point.y;
      const currentFraction = SNAP_FRACTIONS[sheetSnap];
      const targetFraction = currentFraction + delta / vh;

      let closest: SheetSnap = "closed";
      let minDist = Infinity;
      for (const snap of SNAP_ORDER) {
        const dist = Math.abs(SNAP_FRACTIONS[snap] - targetFraction);
        if (dist < minDist) {
          minDist = dist;
          closest = snap;
        }
      }

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

  const handleEventPress = useCallback((eventId: string) => {
    const found = events.find((e) => e.id === eventId);
    if (found) setEditingEvent(found);
  }, [events]);

  const monthName = getMonthName(currentMonth);

  const commitmentsLabel =
    view === "month" ? "This month\u2019s commitments" : "Upcoming this week";

  const sheetHeight = `${SNAP_FRACTIONS[sheetSnap] * 100}vh`;

  // Build the AnimatePresence key so that:
  // - month view paginates on month change
  // - week view paginates on week change (NOT day change within a week)
  // - day view paginates on day change
  const animKey =
    view === "month"
      ? `month-${currentYear}-${currentMonth}`
      : view === "week"
        ? `week-${weekKeyFor(selectedDate)}`
        : `day-${currentYear}-${currentMonth}-${selectedDay}`;

  return (
    <div className="relative mx-auto max-w-[402px] bg-background">
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

      {/* Title + nav arrows */}
      <div className="mt-xl px-lg">
        <h1 className="font-serif text-[28px] leading-[34px] tracking-[-0.3px] text-text-strong">
          {monthName} {currentYear}
        </h1>
      </div>

      {/* Calendar content with swipe navigation — overflow-hidden keeps animations clipped */}
      <div className="relative mt-xl overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={swipeDirection}>
          <motion.div
            key={animKey}
            custom={swipeDirection}
            variants={{
              enter: (dir: number) => ({ x: dir * 150, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir: number) => ({ x: dir * -150, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            drag={view === "month" ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={view === "month" ? handleCalendarDragEnd : undefined}
            className="px-lg touch-pan-y"
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
                <TimeSlots events={dayEvents} onEventPress={handleEventPress} />
              </>
            )}

            {view === "day" && <TimeSlots events={dayEvents} onEventPress={handleEventPress} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed bottom sheet */}
      <motion.div
        ref={sheetRef}
        animate={{ height: sheetHeight }}
        transition={{ type: "spring", damping: 28, stiffness: 200 }}
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
          className="mx-auto max-w-[402px] overflow-y-auto px-xl pb-24 pt-md"
          style={{ maxHeight: "calc(100% - 36px)", pointerEvents: sheetSnap === "closed" ? "none" : "auto" }}
        >
          <h2 className="mb-[16px] font-serif text-[20px] leading-6 tracking-[-0.2px] text-text-strong">
            {commitmentsLabel}
          </h2>

          <div className="flex flex-col gap-[10px]">
            {commitments.length > 0 ? (
              commitments.map((c) => (
                <CommitmentItem key={c.id} commitment={c} onClick={() => handleEventPress(c.id)} />
              ))
            ) : (
              <p className="text-[13px] leading-4 text-text-tertiary">No events</p>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom navigation bar */}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-xs rounded-full bg-surface-alt px-sm py-sm shadow-subtle"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === "calendar";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavPress?.(item.id)}
              aria-label={item.id}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-12 w-[69px] items-center justify-center rounded-full transition-colors ${
                isActive
                  ? "bg-surface text-text-strong shadow-subtle"
                  : "text-text-secondary"
              }`}
            >
              {navIcons[item.icon]}
            </button>
          );
        })}
      </nav>

      {editingEvent && userId && (
        <AddItemModal
          userId={userId}
          editEvent={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}
