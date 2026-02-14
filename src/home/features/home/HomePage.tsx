import { Header } from "./components/Header";
import { WeekStrip } from "./components/WeekStrip";
import { EventList } from "./components/EventList";
import { TasksSection } from "./components/TasksSection";
import { BottomNav } from "./components/BottomNav";

interface HomePageProps {
  userName: string;
  greeting: string;
  days: {
    date: number;
    label: string;
    isSelected?: boolean;
  }[];
  timeSlots: {
    hour: number;
    label: string;
  }[];
  events: {
    id: string;
    title: string;
    timeRange: string;
    startHour: number;
    durationHours: number;
  }[];
  tasks: {
    id: string;
    title: string;
    dueDate: string;
    description: string;
    tag: string;
  }[];
  navItems: {
    id: string;
    label: string;
    icon: "home" | "chat" | "calendar" | "profile";
    isActive?: boolean;
  }[];
  onAddPress?: () => void;
  onAiPress?: () => void;
  onDayPress?: (date: number) => void;
  onSeeAllTasks?: () => void;
  onNavPress?: (id: string) => void;
}

export function HomePage({
  userName,
  greeting,
  days,
  timeSlots,
  events,
  tasks,
  navItems,
  onAddPress,
  onAiPress,
  onDayPress,
  onSeeAllTasks,
  onNavPress,
}: HomePageProps) {
  return (
    <div className="relative mx-auto min-h-screen max-w-[402px] bg-background pb-28">
      <Header
        greeting={greeting}
        name={userName}
        onAddPress={onAddPress}
        onAiPress={onAiPress}
      />
      <div className="mx-lg overflow-hidden rounded-[16px] bg-surface shadow-subtle">
        <WeekStrip days={days} onDayPress={onDayPress} />
        <EventList timeSlots={timeSlots} events={events} />
      </div>
      <TasksSection tasks={tasks} onSeeAll={onSeeAllTasks} />
      <BottomNav items={navItems} onItemPress={onNavPress} />
    </div>
  );
}
