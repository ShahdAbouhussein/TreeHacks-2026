import { useMemo, useRef, useEffect, useState, useCallback } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12AM";
  if (i < 12) return `${i}AM`;
  if (i === 12) return "12PM";
  return `${i - 12}PM`;
});

interface DayItem {
  date: number;
  month: number;
  year: number;
  label: string;
  isSelected?: boolean;
  isToday?: boolean;
}

interface EventItem {
  id: string;
  title: string;
  timeRange: string;
  startHour: number;
  durationHours: number;
}

interface DesktopWeekCalendarProps {
  days: DayItem[];
  events: EventItem[];
  weekEventsByDay?: Record<string, EventItem[]>;
  onDayPress?: (date: number, month: number, year: number) => void;
  onEventPress?: (eventId: string, clickEvent?: React.MouseEvent) => void;
  onDragCreate?: (date: string, startTime: string, endTime: string, anchorPosition: { top: number; left: number }) => void;
}

export function DesktopWeekCalendar({ days, events, weekEventsByDay, onDayPress, onEventPress, onDragCreate }: DesktopWeekCalendarProps) {
  const SLOT_HEIGHT = 64;
  const HEADER_HEIGHT = 48;
  const ALL_DAY_HEIGHT = 36;
  const SNAP_MINUTES = 15;
  const SNAP_FRACTION = SNAP_MINUTES / 60;

  // Current time indicator
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentDayIndex = days.findIndex(
    (d) => d.isToday
  );

  // Drag-to-create state
  const [dragState, setDragState] = useState<{
    colIdx: number;
    startHour: number;
    currentHour: number;
  } | null>(null);
  const isDragging = useRef(false);
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep latest props in refs so mouse handlers never go stale
  const daysRef = useRef(days);
  daysRef.current = days;
  const onDragCreateRef = useRef(onDragCreate);
  onDragCreateRef.current = onDragCreate;

  const snapToGrid = useCallback((hour: number) => Math.round(hour / SNAP_FRACTION) * SNAP_FRACTION, []);

  // Auto-scroll ref — declared early so getHourFromY can use it
  const scrollRef = useRef<HTMLDivElement>(null);

  const getHourFromY = useCallback((y: number, _colEl: HTMLElement) => {
    // Use the scroll container to get accurate position
    const container = scrollRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const relY = y - rect.top + container.scrollTop;
    return Math.max(0, Math.min(24, relY / SLOT_HEIGHT));
  }, []);

  const handleColMouseDown = useCallback((e: React.MouseEvent, colIdx: number) => {
    // Don't start drag if clicking on an event
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    e.preventDefault();
    const col = colRefs.current[colIdx];
    if (!col) return;
    document.body.style.userSelect = "none";
    const hour = snapToGrid(getHourFromY(e.clientY, col));
    console.log("[drag] mousedown col:", colIdx, "hour:", hour);
    isDragging.current = true;
    setDragState({ colIdx, startHour: hour, currentHour: hour });

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      ev.preventDefault();
      const h = snapToGrid(getHourFromY(ev.clientY, col));
      setDragState((prev) => prev ? { ...prev, currentHour: h } : null);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      if (!isDragging.current) return;
      isDragging.current = false;

      // Read current drag state from ref snapshot
      const prev = dragStateRef.current;
      setDragState(null);

      if (!prev) return;
      const minH = Math.min(prev.startHour, prev.currentHour);
      const maxH = Math.max(prev.startHour, prev.currentHour);
      if (maxH - minH < SNAP_FRACTION) return;

      const day = daysRef.current[prev.colIdx];
      const cb = onDragCreateRef.current;
      if (!day || !cb) {
        console.log("[drag] mouseup - no day or cb:", !!day, !!cb);
        return;
      }
      console.log("[drag] mouseup - calling onDragCreate, minH:", minH, "maxH:", maxH);

      const dateStr = `${day.year}-${String(day.month + 1).padStart(2, "0")}-${String(day.date).padStart(2, "0")}`;
      const toTime = (h: number) => {
        const hh = Math.floor(h);
        const mm = Math.round((h - hh) * 60);
        return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      };
      const rect = col.getBoundingClientRect();
      // Defer so the modal mounts after the click event cycle from mouseup completes
      requestAnimationFrame(() => {
        cb(dateStr, toTime(minH), toTime(maxH), {
          top: rect.top,
          left: rect.left,
        });
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [snapToGrid, getHourFromY]);

  // Group events by day column
  const eventsByDay = useMemo(() => {
    const map: Record<number, EventItem[]> = {};
    for (const day of days) {
      const dayDate = new Date(day.year, day.month, day.date);
      const dayStart = new Date(dayDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEvents = events.filter((e) => {
        return true;
      });
      map[day.date] = dayEvents;
    }
    return map;
  }, [days, events]);

  // Find the selected day to place events
  const selectedDay = days.find((d) => d.isSelected);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = Math.max(0, (currentHour - 1) * SLOT_HEIGHT);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, []);

  return (
    <div className="overflow-hidden rounded-[12px] border border-divider bg-white/70">
      {/* Header row: day labels */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-divider">
        <div className="h-[48px]" />
        {days.map((day) => (
          <button
            key={`${day.year}-${day.month}-${day.date}`}
            type="button"
            onClick={() => onDayPress?.(day.date, day.month, day.year)}
            className="flex items-center justify-center gap-1.5 h-[48px] text-small leading-small text-text-secondary"
          >
            <span>{DAY_LABELS[days.indexOf(day)]}</span>
            <span
              className={`flex h-[24px] w-[24px] items-center justify-center rounded-full text-small leading-small font-semibold ${
                day.isToday
                  ? "bg-accent text-white"
                  : day.isSelected
                    ? "bg-accent/15 text-accent"
                    : "text-text-strong"
              }`}
            >
              {day.date}
            </span>
          </button>
        ))}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} data-calendar-grid className="relative overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
        <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ height: TIME_SLOTS.length * SLOT_HEIGHT }}>
          {/* Time labels column */}
          <div className="relative">
            {TIME_SLOTS.map((label, i) => (
              <div
                key={label}
                className="absolute right-2 text-label leading-label text-text-tertiary"
                style={{ top: i * SLOT_HEIGHT - 7 }}
              >
                {i > 0 ? label : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, colIdx) => (
            <div
              key={`col-${day.date}`}
              ref={(el) => { colRefs.current[colIdx] = el; }}
              className="relative border-l border-divider cursor-crosshair"
              onMouseDown={(e) => handleColMouseDown(e, colIdx)}
            >
              {/* Hour grid lines */}
              {TIME_SLOTS.map((_, i) => i === 0 ? null : (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-divider"
                  style={{ top: i * SLOT_HEIGHT }}
                />
              ))}

              {/* Events for this column */}
              {(weekEventsByDay?.[`${day.year}-${day.month}-${day.date}`] || (selectedDay?.date === day.date ? events : [])).map((event) => {
                  if (event.startHour < 0) return null;
                  const top = event.startHour * SLOT_HEIGHT;
                  const height = Math.max(event.durationHours * SLOT_HEIGHT - 2, 20);
                  return (
                    <div
                      key={event.id}
                      data-event
                      className="absolute left-1 right-1 overflow-hidden rounded-[3px] px-2 py-1 cursor-pointer"
                      style={{
                        top,
                        height,
                        backgroundColor: "rgba(111, 143, 122, 0.12)",
                        borderLeft: "3px solid #6F8F7A",
                      }}
                      onClick={(e) => onEventPress?.(event.id, e)}
                    >
                      <p className="text-caption leading-label font-medium text-text-strong truncate">
                        {event.title}
                      </p>
                      {height > 30 && (
                        <p className="text-label leading-label text-text-secondary truncate mt-0.5">
                          {event.timeRange}
                        </p>
                      )}
                    </div>
                  );
                })}

              {/* Drag-to-create preview */}
              {dragState && dragState.colIdx === colIdx && (() => {
                const minH = Math.min(dragState.startHour, dragState.currentHour);
                const maxH = Math.max(dragState.startHour, dragState.currentHour);
                if (maxH - minH < SNAP_FRACTION) return null;
                const top = minH * SLOT_HEIGHT;
                const height = (maxH - minH) * SLOT_HEIGHT;
                const formatPreviewTime = (h: number) => {
                  const hh = Math.floor(h);
                  const mm = Math.round((h - hh) * 60);
                  const suffix = hh >= 12 ? "PM" : "AM";
                  const h12 = hh % 12 || 12;
                  return mm === 0 ? `${h12} ${suffix}` : `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
                };
                return (
                  <div
                    className="absolute left-1 right-1 rounded-[3px] border-2 border-dashed border-accent/40 bg-accent/8 px-2 py-1 pointer-events-none z-10 select-none"
                    style={{ top, height }}
                  >
                    <p className="text-caption leading-label font-medium text-accent/70">New Event</p>
                    <p className="text-label leading-label text-accent/50 mt-0.5">
                      {formatPreviewTime(minH)} – {formatPreviewTime(maxH)}
                    </p>
                  </div>
                );
              })()}

              {/* Current time indicator */}
              {colIdx === currentDayIndex && (
                <>
                  <div
                    className="absolute left-0 right-0 border-t-2 border-accent z-10 pointer-events-none"
                    style={{ top: currentHour * SLOT_HEIGHT }}
                  />
                  <div
                    className="absolute left-[-5px] w-[10px] h-[10px] rounded-full bg-accent z-10 pointer-events-none"
                    style={{ top: currentHour * SLOT_HEIGHT - 5 }}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
