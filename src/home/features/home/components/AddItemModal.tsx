import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import type { CalendarEvent } from "../../../../lib/useEvents";

/* ── constants ── */

/* categories removed — replaced with urgent toggle */

const smoothSpring = { type: "spring" as const, stiffness: 200, damping: 24, mass: 0.8 };

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type ItemType = "task" | "event";
type PickerTarget = "startDate" | "endDate" | "dueDate" | "startTime" | "endTime" | null;

/* ── helpers ── */

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatShortDate(dateStr: string) {
  if (!dateStr) return "Select";
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}, ${y}`;
}

function formatTime12(value: string) {
  const [h, m] = value.split(":").map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ── InlineDatePicker ── */

function InlineDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (d: string) => void;
}) {
  const parsed = value ? value.split("-").map(Number) : null;
  const initYear = parsed ? parsed[0] : new Date().getFullYear();
  const initMonth = parsed ? parsed[1] - 1 : new Date().getMonth();

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const selectedDay = parsed && parsed[0] === viewYear && parsed[1] - 1 === viewMonth ? parsed[2] : null;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonthNum = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYearNum = viewMonth === 0 ? viewYear - 1 : viewYear;
  const daysInPrevMonth = getDaysInMonth(prevYearNum, prevMonthNum);

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

  const goNext = () => {
    if (viewMonth >= 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };
  const goPrev = () => {
    if (viewMonth <= 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  return (
    <div className="rounded-[12px] bg-white p-3 shadow-lg border border-border" style={{ width: 280 }}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-body leading-body font-semibold text-text-strong">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={goPrev} className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-subtle-fill">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button type="button" onClick={goNext} className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-subtle-fill">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mt-1">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="py-1 text-center text-caption leading-caption font-medium tracking-[0.04em] text-text-tertiary">
            {label}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isSelected = cell.isCurrentMonth && cell.day === selectedDay;
          const isToday = cell.isCurrentMonth && viewYear === todayYear && viewMonth === todayMonth && cell.day === todayDay && !isSelected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (cell.isCurrentMonth) onChange(toDateStr(viewYear, viewMonth, cell.day));
              }}
              className={`relative flex h-[34px] items-center justify-center text-caption leading-caption ${
                cell.isCurrentMonth ? "text-text-strong" : "text-text-tertiary"
              }`}
            >
              {isSelected && (
                <span className="absolute inset-0 m-auto h-[28px] w-[28px] rounded-full bg-accent/15" />
              )}
              <span className={`relative z-10 ${
                isSelected ? "font-semibold text-accent" : isToday ? "text-accent" : ""
              }`}>
                {cell.day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Pill button ── */

function Pill({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[8px] px-3 py-[6px] text-caption leading-caption font-medium transition-colors ${
        isActive
          ? "bg-accent/10 text-accent"
          : "bg-surface text-text-strong"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Wheel time picker (iOS-style) ── */

const WHEEL_ITEM_H = 28;
const WHEEL_VISIBLE = 3;
const WHEEL_CENTER = Math.floor(WHEEL_VISIBLE / 2);

function WheelColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = selected * WHEEL_ITEM_H;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!ref.current || isScrolling.current) return;
    const idx = Math.round(ref.current.scrollTop / WHEEL_ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (clamped !== selected) onSelect(clamped);
  }, [items.length, selected, onSelect]);

  const snapTo = useCallback((idx: number) => {
    if (!ref.current) return;
    isScrolling.current = true;
    ref.current.scrollTo({ top: idx * WHEEL_ITEM_H, behavior: "smooth" });
    setTimeout(() => { isScrolling.current = false; }, 150);
    onSelect(idx);
  }, [onSelect]);

  return (
    <div
      ref={ref}
      className="relative flex-1 overflow-y-auto scrollbar-none"
      style={{ height: WHEEL_VISIBLE * WHEEL_ITEM_H, scrollSnapType: "y mandatory" }}
      onScroll={handleScroll}
    >
      <div style={{ height: WHEEL_CENTER * WHEEL_ITEM_H }} />
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex items-center justify-center text-body leading-body transition-all cursor-pointer ${
            i === selected ? "font-semibold text-text-strong" : "text-text-tertiary"
          }`}
          style={{ height: WHEEL_ITEM_H, scrollSnapAlign: "center" }}
          onClick={() => snapTo(i)}
        >
          {item}
        </div>
      ))}
      <div style={{ height: WHEEL_CENTER * WHEEL_ITEM_H }} />
    </div>
  );
}

const WHEEL_HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const WHEEL_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const WHEEL_PERIODS = ["AM", "PM"];

function WheelTimePicker({
  value,
  onChange,
}: {
  value: string; // "HH:mm" 24h
  onChange: (v: string) => void;
}) {
  const [h, m] = value.split(":").map(Number);
  const isPM = h >= 12;
  const hour12 = h % 12 || 12;

  const hourIdx = hour12 - 1;
  const minIdx = m;
  const periodIdx = isPM ? 1 : 0;

  const update = (newHour12: number, newMin: number, newPM: boolean) => {
    let h24 = newHour12 % 12;
    if (newPM) h24 += 12;
    onChange(`${String(h24).padStart(2, "0")}:${String(newMin).padStart(2, "0")}`);
  };

  return (
    <div className="rounded-[12px] bg-white p-2 shadow-lg border border-border" style={{ width: 180 }}>
      <div className="relative flex" style={{ height: WHEEL_VISIBLE * WHEEL_ITEM_H }}>
        <div
          className="pointer-events-none absolute left-0 right-0 rounded-[6px] bg-background"
          style={{ top: WHEEL_CENTER * WHEEL_ITEM_H, height: WHEEL_ITEM_H }}
        />
        <WheelColumn
          items={WHEEL_HOURS}
          selected={hourIdx}
          onSelect={(i) => update(i + 1, minIdx, isPM)}
        />
        <WheelColumn
          items={WHEEL_MINUTES}
          selected={minIdx}
          onSelect={(i) => update(hour12, i, isPM)}
        />
        <WheelColumn
          items={WHEEL_PERIODS}
          selected={periodIdx}
          onSelect={(i) => update(hour12, minIdx, i === 1)}
        />
      </div>
    </div>
  );
}

/* ── AddItemModal ── */

interface AddItemModalProps {
  userId: string;
  onClose: () => void;
  editEvent?: CalendarEvent;
  anchorPosition?: { top: number; left: number };
  allEvents?: CalendarEvent[];
  initialDate?: string;       // "YYYY-MM-DD"
  initialStartTime?: string;  // "HH:mm"
  initialEndTime?: string;    // "HH:mm"
}

function toDateStr2(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AddItemModal({ userId, onClose, editEvent, anchorPosition, allEvents = [], initialDate, initialStartTime, initialEndTime }: AddItemModalProps) {
  const isEdit = !!editEvent;
  const [title, setTitle] = useState(editEvent?.title ?? "");
  const [details, setDetails] = useState(editEvent?.description ?? "");
  const [urgent, setUrgent] = useState(false);
  const hasDragInit = !!(initialDate || initialStartTime || initialEndTime);
  const [itemType, setItemType] = useState<ItemType>(editEvent || hasDragInit ? "event" : "task");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(editEvent ? toDateStr2(editEvent.start) : initialDate || todayStr);
  const [startTime, setStartTime] = useState(editEvent ? toTimeStr(editEvent.start) : initialStartTime || "09:00");
  const [endDate, setEndDate] = useState(editEvent ? toDateStr2(editEvent.end) : initialDate || todayStr);
  const [endTime, setEndTime] = useState(editEvent ? toTimeStr(editEvent.end) : initialEndTime || "10:00");
  const [dueDate, setDueDate] = useState(todayStr);

  const [activePicker, setActivePicker] = useState<PickerTarget>(null);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const togglePicker = (target: PickerTarget) => {
    setActivePicker((prev) => (prev === target ? null : target));
  };

  const canSave = title.trim().length > 0;

  // Helper to find overlapping event
  const findOverlap = useCallback((sDate: string, sTime: string, eDate: string, eTime: string) => {
    const newStart = new Date(`${sDate}T${sTime}:00`);
    const newEnd = new Date(`${eDate}T${eTime}:00`);
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) return null;

    return allEvents.find((e) => {
      if (editEvent && e.id === editEvent.id) return false;
      return e.start.getTime() < newEnd.getTime() && e.end.getTime() > newStart.getTime();
    }) || null;
  }, [allEvents, editEvent]);

  // Check for overlapping events when time/date changes
  useEffect(() => {
    if (itemType !== "event") { setOverlapWarning(null); return; }

    const overlap = findOverlap(
      startDate || todayStr,
      startTime || "09:00",
      endDate || todayStr,
      endTime || "10:00"
    );

    if (overlap) {
      const overlapStart = overlap.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const overlapEnd = overlap.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      setOverlapWarning(`Overlaps with "${overlap.title}" (${overlapStart} – ${overlapEnd})`);
    } else {
      setOverlapWarning(null);
    }
  }, [startDate, startTime, endDate, endTime, itemType, findOverlap, todayStr]);

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");

    try {
      if (itemType === "task") {
        await addDoc(collection(db, "users", userId, "tasks"), {
          title: title.trim(),
          description: details.trim(),
          dueDate: dueDate || todayStr,
          tag: "",
          category: "general",
          urgent,
          completed: false,
        });
      } else {
        const startDt = new Date(`${startDate || todayStr}T${startTime || "09:00"}:00`);
        const endDt = new Date(`${endDate || todayStr}T${endTime || "10:00"}:00`);

        if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
          setError("Invalid date or time.");
          setSaving(false);
          return;
        }

        // Block save if there's a time conflict
        const overlap = findOverlap(
          startDate || todayStr,
          startTime || "09:00",
          endDate || todayStr,
          endTime || "10:00"
        );
        if (overlap) {
          setError(`Time conflict with "${overlap.title}". Please choose a different time.`);
          setSaving(false);
          return;
        }

        if (editEvent) {
          await updateDoc(doc(db, "users", userId, "events", editEvent.id), {
            title: title.trim(),
            description: details.trim(),
            start: Timestamp.fromDate(startDt),
            end: Timestamp.fromDate(endDt),
          });
        } else {
          await addDoc(collection(db, "users", userId, "events"), {
            title: title.trim(),
            description: details.trim(),
            start: Timestamp.fromDate(startDt),
            end: Timestamp.fromDate(endDt),
            location: "",
            allDay: false,
            source: "manual",
            createdAt: Timestamp.now(),
          });
        }
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save:", err);
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editEvent) return;
    try {
      await deleteDoc(doc(db, "users", userId, "events", editEvent.id));
      onClose();
    } catch (err: any) {
      console.error("Failed to delete:", err);
      setError(err.message || "Failed to delete.");
    }
  };

  // Use refs to avoid stale closures in the keyboard handler
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const handleDeleteRef = useRef(handleDelete);
  handleDeleteRef.current = handleDelete;

  // Keyboard shortcut: ESC to close, Enter to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Enter" && !e.shiftKey && canSave && !saving) { handleSaveRef.current(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSave, saving, isEdit, onClose]);

  /* ── Helper: relative date label ── */
  const getRelativeDate = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return null;
  };

  /* ── Desktop popover (Chrono-style) ── */
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Ignore clicks on the calendar grid (drag-to-create)
        if ((e.target as HTMLElement).closest?.('[data-calendar-grid]')) return;
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 400);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const desktopPopover = (
    <motion.div
      ref={popoverRef}
      className="fixed z-[999] hidden lg:block w-[460px] rounded-[14px] bg-white border-2 border-accent shadow-lg overflow-visible"
      style={
        anchorPosition
          ? { top: Math.min(anchorPosition.top, window.innerHeight - 500), left: Math.max(8, anchorPosition.left - 470) }
          : { right: 32, top: 94 }
      }
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
        {/* Title + Notes section */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: itemType === "event" ? "var(--color-accent-dark)" : "var(--color-accent)" }}>
              {itemType === "event" ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17L4 12" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input
                className="w-full bg-transparent text-body leading-body font-medium text-text-strong placeholder:text-text-tertiary focus:outline-none"
                placeholder={itemType === "event" ? "Event title" : "Task title"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <input
                className="mt-1 w-full bg-transparent text-body leading-body text-text-secondary placeholder:text-text-tertiary focus:outline-none"
                placeholder={itemType === "event" ? "Add description" : "Add notes"}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="px-5 pb-2 text-caption leading-caption text-red-500">{error}</p>
        )}

        {overlapWarning && (
          <div className="mx-5 mb-2 flex items-start gap-2 rounded-[10px] bg-warning/10 px-3 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4B400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
            </svg>
            <p className="text-caption leading-caption text-text-strong">{overlapWarning}</p>
          </div>
        )}

        {/* Fields */}
        <AnimatePresence mode="wait" initial={false}>
          {itemType === "task" ? (
            <motion.div
              key="task-fields-desktop"
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Schedule */}
              <div className="border-t border-divider px-5 py-4">
                <p className="text-label leading-label font-medium text-text-tertiary uppercase tracking-wide mb-3">Schedule</p>
                <div className="relative">
                  <button type="button" onClick={() => togglePicker("dueDate")} className="flex items-center gap-2 text-body leading-body text-text-strong hover:text-accent transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                      <circle cx="12" cy="12" r="10" /><path d="M12 6V12L16 14" />
                    </svg>
                    {formatShortDate(dueDate)}
                  </button>
                  <AnimatePresence>
                    {activePicker === "dueDate" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute left-full top-0 z-[60] ml-2"
                      >
                        <InlineDatePicker value={dueDate} onChange={(d) => { setDueDate(d); setActivePicker(null); }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Urgent toggle removed */}
            </motion.div>
          ) : (
            <motion.div
              key="event-fields-desktop"
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Time */}
              <div className="border-t border-divider px-5 py-4">
                <p className="text-label leading-label font-medium text-text-tertiary uppercase tracking-wide mb-3">Time</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                      <circle cx="12" cy="12" r="10" /><path d="M12 6V12L16 14" />
                    </svg>
                    <div className="relative">
                      <button type="button" onClick={() => togglePicker("startTime")} className="text-body leading-body text-text-strong hover:text-accent transition-colors">
                        {formatTime12(startTime)}
                      </button>
                      {activePicker === "startTime" && (
                        <div className="absolute left-full top-0 z-[60] ml-2">
                          <WheelTimePicker value={startTime} onChange={setStartTime} />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-text-tertiary">→</span>
                  <div className="relative">
                    <button type="button" onClick={() => togglePicker("endTime")} className="text-body leading-body text-text-strong hover:text-accent transition-colors">
                      {formatTime12(endTime)}
                    </button>
                    {activePicker === "endTime" && (
                      <div className="absolute left-full top-0 z-[60] ml-2">
                        <WheelTimePicker value={endTime} onChange={setEndTime} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="border-t border-divider px-5 py-4">
                <p className="text-label leading-label font-medium text-text-tertiary uppercase tracking-wide mb-3">Date</p>
                <div className="relative">
                  <button type="button" onClick={() => togglePicker("startDate")} className="flex items-center gap-2 text-body leading-body text-text-strong hover:text-accent transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                      <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" />
                    </svg>
                    {formatShortDate(startDate)}
                  </button>
                  <AnimatePresence>
                    {activePicker === "startDate" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute left-full top-0 z-[60] ml-2"
                      >
                        <InlineDatePicker value={startDate} onChange={(d) => { setStartDate(d); setEndDate(d); setActivePicker(null); }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete button moved to footer bar */}

        {/* Footer bar — Chrono style */}
        <div className="flex items-center justify-between border-t border-divider px-5 py-3">
          {/* Type toggle icons */}
          {!isEdit ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setItemType("task"); setActivePicker(null); }}
                className={`flex h-8 w-8 items-center justify-center rounded-[12px] transition-colors ${
                  itemType === "task" ? "bg-subtle-fill text-text-strong" : "text-text-tertiary hover:bg-subtle-fill"
                }`}
                title="Task"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17L4 12" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => { setItemType("event"); setActivePicker(null); }}
                className={`flex h-8 w-8 items-center justify-center rounded-[12px] transition-colors ${
                  itemType === "event" ? "bg-subtle-fill text-text-strong" : "text-text-tertiary hover:bg-subtle-fill"
                }`}
                title="Event"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" />
                </svg>
              </button>
            </div>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={isEdit ? handleDelete : onClose}
              className={`rounded-[12px] px-3 py-1.5 text-small leading-small font-medium transition-colors ${
                isEdit
                  ? "bg-red-50 text-red-500 hover:bg-red-100"
                  : "bg-subtle-fill text-text-secondary hover:bg-gray-200"
              }`}
            >
              {isEdit ? "Delete" : "Discard"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="rounded-[12px] bg-accent px-3 py-1.5 text-small leading-small font-medium text-white disabled:opacity-30 hover:bg-accent-dark transition-colors"
            >
              {saving ? "Saving…" : "+ Add"}
            </button>
          </div>
        </div>
      </motion.div>
  );

  /* ── Mobile modal (unchanged) ── */
  const mobileModal = (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-visible bg-white/60 backdrop-blur-sm lg:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[370px] mx-4 rounded-[20px] bg-surface p-5 shadow-subtle overflow-visible"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="text-body leading-body text-text-secondary">
            Cancel
          </button>
          <span className="text-body leading-body font-semibold text-text-strong">{isEdit ? "Edit" : "New"}</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="text-body leading-body font-medium text-accent disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Type toggle (hidden in edit mode) */}
        {!isEdit && (
          <div className="mt-4">
            <LayoutGroup id="type-toggle">
              <div className="flex rounded-[10px] bg-background p-[3px]">
                {(["task", "event"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setItemType(t); setActivePicker(null); }}
                    className="relative flex-1 rounded-[8px] py-[6px] text-center text-caption leading-caption outline-none"
                  >
                    {itemType === t && (
                      <motion.div
                        layoutId="type-pill"
                        className="absolute inset-0 rounded-[8px] bg-surface shadow-subtle"
                        transition={smoothSpring}
                      />
                    )}
                    <span className={`relative z-10 ${itemType === t ? "text-text-strong font-medium" : "text-text-secondary"}`}>
                      {t === "task" ? "Task" : "Event"}
                    </span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
          </div>
        )}

        {/* Title + Details card */}
        <div className="mt-4 rounded-[16px] bg-background px-4 py-3">
          <input
            className="w-full bg-transparent text-secondary leading-body text-text-strong placeholder:text-text-tertiary focus:outline-none"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <div className="my-2 h-px bg-divider" />
          <input
            className="w-full bg-transparent text-secondary leading-body text-text-strong placeholder:text-text-tertiary focus:outline-none"
            placeholder="Add details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        {overlapWarning && (
          <div className="mt-2 flex items-start gap-2 rounded-[10px] bg-warning/10 px-3 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4B400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
            </svg>
            <p className="text-caption leading-caption text-text-strong">{overlapWarning}</p>
          </div>
        )}

        {error && (
          <p className="mt-2 px-1 text-caption leading-caption text-red-500">{error}</p>
        )}

        {/* Date / time section */}
        <AnimatePresence mode="wait" initial={false}>
          {itemType === "task" ? (
            <motion.div
              key="task-fields"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="mt-4 rounded-[16px] bg-background px-4"
            >
              <div className="flex items-center justify-between py-3">
                <span className="text-body leading-body text-text-strong">Due date</span>
                <div className="relative">
                  <Pill
                    label={formatShortDate(dueDate)}
                    isActive={activePicker === "dueDate"}
                    onClick={() => togglePicker("dueDate")}
                  />
                  <AnimatePresence>
                    {activePicker === "dueDate" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute right-0 top-full z-[60] mt-1"
                      >
                        <InlineDatePicker value={dueDate} onChange={(d) => { setDueDate(d); setActivePicker(null); }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="event-fields"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="mt-4 rounded-[16px] bg-background px-4"
            >
              {/* Starts row */}
              <div className="flex items-center justify-between py-3">
                <span className="text-body leading-body text-text-strong">Starts</span>
                <div className="flex gap-2">
                  <div className="relative">
                    <Pill
                      label={formatShortDate(startDate)}
                      isActive={activePicker === "startDate"}
                      onClick={() => togglePicker("startDate")}
                    />
                    <AnimatePresence>
                      {activePicker === "startDate" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="absolute right-0 top-full z-[60] mt-1"
                        >
                          <InlineDatePicker value={startDate} onChange={(d) => { setStartDate(d); setActivePicker(null); }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <Pill
                      label={formatTime12(startTime)}
                      isActive={activePicker === "startTime"}
                      onClick={() => togglePicker("startTime")}
                    />
                    {activePicker === "startTime" && (
                      <div className="absolute right-0 top-full z-[60] mt-1">
                        <WheelTimePicker value={startTime} onChange={setStartTime} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-px bg-divider" />

              {/* Ends row */}
              <div className="flex items-center justify-between py-3">
                <span className="text-body leading-body text-text-strong">Ends</span>
                <div className="flex gap-2">
                  <div className="relative">
                    <Pill
                      label={formatShortDate(endDate)}
                      isActive={activePicker === "endDate"}
                      onClick={() => togglePicker("endDate")}
                    />
                    <AnimatePresence>
                      {activePicker === "endDate" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="absolute right-0 top-full z-[60] mt-1"
                        >
                          <InlineDatePicker value={endDate} onChange={(d) => { setEndDate(d); setActivePicker(null); }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <Pill
                      label={formatTime12(endTime)}
                      isActive={activePicker === "endTime"}
                      onClick={() => togglePicker("endTime")}
                    />
                    {activePicker === "endTime" && (
                      <div className="absolute right-0 top-full z-[60] mt-1">
                        <WheelTimePicker value={endTime} onChange={setEndTime} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete button (edit mode only) */}
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="mt-4 w-full rounded-[16px] bg-background py-3 text-body leading-body font-medium text-red-500"
          >
            Delete Event
          </button>
        )}

        {/* Urgent toggle removed */}
      </motion.div>
    </motion.div>
  );

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  return (
    <AnimatePresence>
      {isDesktop ? desktopPopover : mobileModal}
    </AnimatePresence>
  );
}
