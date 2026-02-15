import { useState, useMemo, useCallback } from "react";
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
}

function App({ onSeeAllTasks, onNavPress, events = [], userId, userName }: AppProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekDirection, setWeekDirection] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scrollKey, setScrollKey] = useState(0);
  const { tasks: firestoreTasks } = useTasks(userId);

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

  const handlePrevWeek = useCallback(() => {
    setWeekDirection(-1);
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  }, []);

  const selectedEvents = useMemo(() => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    return events
      .filter((e) => !e.allDay && e.start <= dayEnd && e.end >= dayStart)
      .map((e) => {
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
        scrollKey={scrollKey}
        tasks={homeTasks}
        navItems={navItems}
        onAddPress={() => setShowAddModal(true)}
        onDayPress={handleDayPress}
        onNextWeek={handleNextWeek}
        onPrevWeek={handlePrevWeek}
        weekDirection={weekDirection}
        onSeeAllTasks={onSeeAllTasks}
        onNavPress={onNavPress}
      />
      {showAddModal && userId && (
        <AddItemModal
          userId={userId}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}

export default App;
