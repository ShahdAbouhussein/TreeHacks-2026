import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { collection, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import type { CalendarEvent } from "../../../../lib/useEvents";

/* ── constants ── */

const CATEGORIES = ["protect", "progress", "maintain"] as const;
type Category = (typeof CATEGORIES)[number];
const CATEGORY_LABELS: Record<Category, string> = {
  protect: "Protect",
  progress: "Progress",
  maintain: "Maintain",
};

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
    <div className="py-2">
      {/* Month header */}
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[15px] font-semibold text-text-strong">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div className="flex gap-2">
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
          <div key={i} className="py-1.5 text-center text-[11px] font-medium leading-3 tracking-[0.04em] text-text-tertiary">
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
              className={`relative flex h-[36px] items-center justify-center text-[15px] leading-5 ${
                cell.isCurrentMonth ? "text-text-strong" : "text-text-tertiary"
              }`}
            >
              {isSelected && (
                <span className="absolute inset-0 m-auto h-[32px] w-[32px] rounded-full bg-accent/15" />
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
      className={`rounded-[8px] px-3 py-[6px] text-[13px] font-medium leading-5 transition-colors ${
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
          className={`flex items-center justify-center text-[14px] transition-all cursor-pointer ${
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
}

function toDateStr2(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AddItemModal({ userId, onClose, editEvent }: AddItemModalProps) {
  const isEdit = !!editEvent;
  const [title, setTitle] = useState(editEvent?.title ?? "");
  const [details, setDetails] = useState(editEvent?.description ?? "");
  const [category, setCategory] = useState<Category>("protect");
  const [itemType, setItemType] = useState<ItemType>(editEvent ? "event" : "task");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(editEvent ? toDateStr2(editEvent.start) : todayStr);
  const [startTime, setStartTime] = useState(editEvent ? toTimeStr(editEvent.start) : "09:00");
  const [endDate, setEndDate] = useState(editEvent ? toDateStr2(editEvent.end) : todayStr);
  const [endTime, setEndTime] = useState(editEvent ? toTimeStr(editEvent.end) : "10:00");
  const [dueDate, setDueDate] = useState(todayStr);

  const [activePicker, setActivePicker] = useState<PickerTarget>(null);

  const togglePicker = (target: PickerTarget) => {
    setActivePicker((prev) => (prev === target ? null : target));
  };

  const canSave = title.trim().length > 0;

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
          category,
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

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-[370px] mx-4 max-h-[90vh] overflow-y-auto rounded-[20px] bg-surface p-5 shadow-subtle"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={onClose} className="text-[15px] leading-5 text-text-secondary">
              Cancel
            </button>
            <span className="text-[15px] font-semibold text-text-strong">{isEdit ? "Edit" : "New"}</span>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="text-[15px] leading-5 font-medium text-accent disabled:opacity-40"
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
                      className="relative flex-1 rounded-[8px] py-[6px] text-center text-[13px] leading-5 outline-none"
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
              className="w-full bg-transparent text-[15px] leading-6 text-text-strong placeholder:text-text-tertiary focus:outline-none"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <div className="my-2 h-px bg-divider" />
            <input
              className="w-full bg-transparent text-[15px] leading-6 text-text-strong placeholder:text-text-tertiary focus:outline-none"
              placeholder="Add details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {error && (
            <p className="mt-2 px-1 text-[13px] leading-4 text-red-500">{error}</p>
          )}

          {/* Date / time section */}
          <div className="mt-4 rounded-[16px] bg-background px-4">
            {itemType === "task" ? (
              /* ── Task: single due date row ── */
              <>
                <div className="flex items-center justify-between py-3">
                  <span className="text-[15px] text-text-strong">Due date</span>
                  <Pill
                    label={formatShortDate(dueDate)}
                    isActive={activePicker === "dueDate"}
                    onClick={() => togglePicker("dueDate")}
                  />
                </div>
                {activePicker === "dueDate" && (
                  <>
                    <div className="h-px bg-divider" />
                    <InlineDatePicker value={dueDate} onChange={(d) => { setDueDate(d); setActivePicker(null); }} />
                  </>
                )}
              </>
            ) : (
              /* ── Event: Starts / Ends rows (Apple Calendar style) ── */
              <>
                {/* Starts row */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-[15px] text-text-strong">Starts</span>
                  <div className="flex gap-2">
                    <Pill
                      label={formatShortDate(startDate)}
                      isActive={activePicker === "startDate"}
                      onClick={() => togglePicker("startDate")}
                    />
                    <div className="relative">
                      <Pill
                        label={formatTime12(startTime)}
                        isActive={activePicker === "startTime"}
                        onClick={() => togglePicker("startTime")}
                      />
                      {activePicker === "startTime" && (
                        <div className="absolute right-0 top-full z-20 mt-1">
                          <WheelTimePicker value={startTime} onChange={setStartTime} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Start date picker */}
                {activePicker === "startDate" && (
                  <>
                    <div className="h-px bg-divider" />
                    <InlineDatePicker value={startDate} onChange={(d) => { setStartDate(d); setActivePicker(null); }} />
                  </>
                )}

                <div className="h-px bg-divider" />

                {/* Ends row */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-[15px] text-text-strong">Ends</span>
                  <div className="flex gap-2">
                    <Pill
                      label={formatShortDate(endDate)}
                      isActive={activePicker === "endDate"}
                      onClick={() => togglePicker("endDate")}
                    />
                    <div className="relative">
                      <Pill
                        label={formatTime12(endTime)}
                        isActive={activePicker === "endTime"}
                        onClick={() => togglePicker("endTime")}
                      />
                      {activePicker === "endTime" && (
                        <div className="absolute right-0 top-full z-20 mt-1">
                          <WheelTimePicker value={endTime} onChange={setEndTime} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* End date picker */}
                {activePicker === "endDate" && (
                  <>
                    <div className="h-px bg-divider" />
                    <InlineDatePicker value={endDate} onChange={(d) => { setEndDate(d); setActivePicker(null); }} />
                  </>
                )}
              </>
            )}
          </div>

          {/* Priority selector (hidden in edit mode since events don't have categories) */}
          {!isEdit && (
            <div className="mt-4 rounded-[16px] bg-background px-4 py-3">
              <p className="text-[13px] leading-4 text-text-tertiary mb-3">
                How should we prioritize this item?
              </p>
              <LayoutGroup id="priority-pills">
                <div className="flex gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className="relative shrink-0 rounded-full px-[16px] py-[7px] text-[14px] leading-5 outline-none transition-colors duration-200"
                    >
                      {category === cat && (
                        <motion.div
                          layoutId="priority-pill"
                          className="absolute inset-0 rounded-full border border-border bg-surface"
                          transition={smoothSpring}
                        />
                      )}
                      <span className={`relative z-10 ${category === cat ? "text-text-strong" : "text-text-secondary"}`}>
                        {CATEGORY_LABELS[cat]}
                      </span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
