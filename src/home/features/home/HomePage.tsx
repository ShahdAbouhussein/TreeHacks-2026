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
    month: number;
    year: number;
    label: string;
    isSelected?: boolean;
    isToday?: boolean;
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
    category?: string;
  }[];
  navItems: {
    id: string;
    label: string;
    icon: "home" | "chat" | "calendar" | "profile";
    isActive?: boolean;
  }[];
  onAddPress?: () => void;
  onAiPress?: () => void;
  onDayPress?: (date: number, month: number, year: number) => void;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  weekDirection?: number;
  scrollKey?: number;
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
  onNextWeek,
  onPrevWeek,
  weekDirection,
  scrollKey,
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
        <WeekStrip
          days={days}
          onDayPress={onDayPress}
          onNextWeek={onNextWeek}
          onPrevWeek={onPrevWeek}
          direction={weekDirection}
        />
        <EventList timeSlots={timeSlots} events={events} scrollKey={scrollKey} />
      </div>
      <TasksSection tasks={tasks} onSeeAll={onSeeAllTasks} />
      <BottomNav items={navItems} onItemPress={onNavPress} />
    </div>
  );
}
