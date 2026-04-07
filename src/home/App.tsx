import { useState, useMemo, useCallback, useEffect } from "react";
import { HomePage } from "./features/home/HomePage";
import { AddItemModal } from "./features/home/components/AddItemModal";
import type { CalendarEvent } from "../lib/useEvents";
import { useTasks } from "../lib/useTasks";

const DAY_LABELS = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`,
}));

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function getWeekDays(selectedDate: Date) {
  const dayOfWeek = selectedDate.getDay();
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - dayOfWeek);

  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return {
      date: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
      label: DAY_LABELS[i],
      isSelected:
        d.getDate() === selectedDate.getDate() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear(),
      isToday:
        d.getDate() === todayDate &&
        d.getMonth() === todayMonth &&
        d.getFullYear() === todayYear,
    };
  });
}

interface AppProps {
  onSeeAllTasks?: () => void;
  onNavPress?: (id: string) => void;
  events?: CalendarEvent[];
  userId?: string;
  userName?: string;
  desktopAddTrigger?: number;
}

function App({ onSeeAllTasks, onNavPress, events = [], userId, userName, desktopAddTrigger }: AppProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekDirection, setWeekDirection] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventAnchor, setEventAnchor] = useState<{ top: number; left: number } | null>(null);
  const [dragCreateInfo, setDragCreateInfo] = useState<{ date: string; startTime: string; endTime: string } | null>(null);
  const [scrollKey, setScrollKey] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const { tasks: firestoreTasks } = useTasks(userId);

  // Open add modal when desktop sidebar triggers it
  useEffect(() => {
    if (desktopAddTrigger && desktopAddTrigger > 0) {
      setShowAddModal(true);
    }
  }, [desktopAddTrigger]);

  const days = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const handleDayPress = useCallback((date: number, month: number, year: number) => {
    setSelectedDate(new Date(year, month, date));
    setScrollKey((k) => k + 1);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekDirection(1);
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  }, []);

  const handleEventPress = useCallback((eventId: string, clickEvent?: React.MouseEvent) => {
    const found = events.find((e) => e.id === eventId);
    if (found) {
      setEditingEvent(found);
      if (clickEvent) {
        const rect = (clickEvent.currentTarget as HTMLElement).getBoundingClientRect();
        setEventAnchor({ top: rect.top, left: rect.left });
      } else {
        setEventAnchor(null);
      }
    }
  }, [events]);

  const handleDragCreate = useCallback((date: string, startTime: string, endTime: string, anchorPosition: { top: number; left: number }) => {
    console.log("[drag] handleDragCreate called:", date, startTime, endTime);
    setDragCreateInfo({ date, startTime, endTime });
    setEventAnchor(anchorPosition);
    setEditingEvent(null);
    setShowAddModal(true);
  }, []);

  const handlePrevWeek = useCallback(() => {
    setWeekDirection(-1);
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  }, []);

  const handleAiPress = useCallback(async () => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }
    setShowSummary(true);
    setSummaryLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayEvents = events
        .filter((e) => e.start <= todayEnd && e.end >= todayStart)
        .map((e) => ({ title: e.title, start: e.start.toISOString(), end: e.end.toISOString() }));

      const todayTasks = firestoreTasks.map((t) => ({
        title: t.title,
        dueDate: t.dueDate,
        category: t.category,
      }));

      const res = await fetch("/api/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: todayTasks, events: todayEvents, userName }),
      });
      const data = await res.json();
      setSummary(data.summary || "You have a clear day ahead!");
    } catch {
      setSummary("Couldn't load your summary right now. Try again later!");
    } finally {
      setSummaryLoading(false);
    }
  }, [showSummary, events, firestoreTasks, userName]);

  const selectedEvents = useMemo(() => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    return events
      .filter((e) => e.start <= dayEnd && e.end >= dayStart)
      .map((e) => {
        if (e.allDay) {
          return {
            id: e.id,
            title: e.title,
            timeRange: "All day",
            startHour: 0,
            durationHours: 1,
          };
        }
        // Clamp start/end to the visible day
        const visibleStart = e.start < dayStart ? dayStart : e.start;
        const visibleEnd = e.end > dayEnd ? dayEnd : e.end;
        const startHour = visibleStart.getHours() + visibleStart.getMinutes() / 60;
        const endHour = visibleEnd > dayEnd
          ? 24
          : visibleEnd.getHours() + visibleEnd.getMinutes() / 60;

        return {
          id: e.id,
          title: e.title,
          timeRange: `${formatTime(e.start)} - ${formatTime(e.end)}`,
          startHour,
          durationHours: Math.max(endHour - startHour, 0.5),
        };
      });
  }, [events, selectedDate]);

  // All events for the visible week, keyed by day-of-month
  const weekEventsByDay = useMemo(() => {
    const map: Record<string, typeof selectedEvents> = {};
    for (const day of days) {
      const dayStart = new Date(day.year, day.month, day.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day.year, day.month, day.date);
      dayEnd.setHours(23, 59, 59, 999);

      map[`${day.year}-${day.month}-${day.date}`] = events
        .filter((e) => e.start <= dayEnd && e.end >= dayStart)
        .map((e) => {
          if (e.allDay) {
            return { id: e.id, title: e.title, timeRange: "All day", startHour: 0, durationHours: 1 };
          }
          const visibleStart = e.start < dayStart ? dayStart : e.start;
          const visibleEnd = e.end > dayEnd ? dayEnd : e.end;
          const startHour = visibleStart.getHours() + visibleStart.getMinutes() / 60;
          const endHour = visibleEnd > dayEnd ? 24 : visibleEnd.getHours() + visibleEnd.getMinutes() / 60;
          return {
            id: e.id,
            title: e.title,
            timeRange: `${formatTime(e.start)} - ${formatTime(e.end)}`,
            startHour,
            durationHours: Math.max(endHour - startHour, 0.5),
          };
        });
    }
    return map;
  }, [events, days]);

  const homeTasks = useMemo(
    () =>
      firestoreTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        description: t.description,
        tag: t.tag,
        category: t.category,
      })),
    [firestoreTasks]
  );

  const navItems = [
    { id: "home", label: "Home", icon: "home" as const, isActive: true },
    { id: "chat", label: "Chat", icon: "chat" as const },
    { id: "calendar", label: "Calendar", icon: "calendar" as const },
    { id: "profile", label: "Profile", icon: "profile" as const },
  ];

  return (
    <>
      <HomePage
        greeting="Welcome back,"
        userName={userName || "there"}
        days={days}
        timeSlots={TIME_SLOTS}
        events={selectedEvents}
        weekEventsByDay={weekEventsByDay}
        scrollKey={scrollKey}
        tasks={homeTasks}
        navItems={navItems}
        onAddPress={() => setShowAddModal(true)}
        onAiPress={handleAiPress}
        onDayPress={handleDayPress}
        onNextWeek={handleNextWeek}
        onPrevWeek={handlePrevWeek}
        weekDirection={weekDirection}
        onSeeAllTasks={onSeeAllTasks}
        onNavPress={onNavPress}
        onEventPress={handleEventPress}
        onDragCreate={handleDragCreate}
        allEvents={events}
        showSummary={showSummary}
        summary={summary}
        summaryLoading={summaryLoading}
        onCloseSummary={() => setShowSummary(false)}
      />
      {(showAddModal || editingEvent) && userId && (
        <AddItemModal
          key={dragCreateInfo ? `${dragCreateInfo.date}-${dragCreateInfo.startTime}-${dragCreateInfo.endTime}` : "default"}
          userId={userId}
          editEvent={editingEvent ?? undefined}
          anchorPosition={eventAnchor ?? undefined}
          allEvents={events}
          initialDate={dragCreateInfo?.date}
          initialStartTime={dragCreateInfo?.startTime}
          initialEndTime={dragCreateInfo?.endTime}
          onClose={() => { console.log("[modal] onClose called", new Error().stack); setShowAddModal(false); setEditingEvent(null); setEventAnchor(null); setDragCreateInfo(null); }}
        />
      )}
    </>
  );
}

export default App;
