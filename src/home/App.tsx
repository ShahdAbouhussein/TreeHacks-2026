import { useMemo } from "react";
import { HomePage } from "./features/home/HomePage";
import type { CalendarEvent } from "../lib/useEvents";
import { useTasks } from "../lib/useTasks";

const DAY_LABELS = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];

const TIME_SLOTS = [
  { hour: 9, label: "9 AM" },
  { hour: 10, label: "10 AM" },
  { hour: 11, label: "11 AM" },
  { hour: 12, label: "12 PM" },
  { hour: 13, label: "1 PM" },
  { hour: 14, label: "2 PM" },
  { hour: 15, label: "3 PM" },
  { hour: 16, label: "4 PM" },
];

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function getCurrentWeekDays(): { date: number; label: string; isSelected?: boolean }[] {
  const now = new Date();
  const today = now.getDate();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(today - dayOfWeek);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return {
      date: d.getDate(),
      label: DAY_LABELS[i],
      isSelected: d.getDate() === today && d.getMonth() === now.getMonth(),
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
  const days = useMemo(() => getCurrentWeekDays(), []);
  const { tasks: firestoreTasks } = useTasks(userId);

  const todayEvents = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    return events
      .filter((e) => {
        const s = e.start;
        return `${s.getFullYear()}-${s.getMonth()}-${s.getDate()}` === todayStr && !e.allDay;
      })
      .map((e) => ({
        id: e.id,
        title: e.title,
        timeRange: `${formatTime(e.start)} - ${formatTime(e.end)}`,
        startHour: e.start.getHours() + e.start.getMinutes() / 60,
        durationHours: Math.max(
          (e.end.getTime() - e.start.getTime()) / (1000 * 60 * 60),
          0.5
        ),
      }));
  }, [events]);

  const homeTasks = useMemo(
    () =>
      firestoreTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        description: t.description,
        tag: t.tag,
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
    <HomePage
      greeting="Welcome back,"
      userName={userName || "there"}
      days={days}
      timeSlots={TIME_SLOTS}
      events={todayEvents}
      tasks={homeTasks}
      navItems={navItems}
      onSeeAllTasks={onSeeAllTasks}
      onNavPress={onNavPress}
    />
  );
}

export default App;
