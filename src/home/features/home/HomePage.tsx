import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "./components/Header";
import { WeekStrip } from "./components/WeekStrip";
import { EventList } from "./components/EventList";
import { TasksSection } from "./components/TasksSection";
import { BottomNav } from "./components/BottomNav";
import { DesktopWeekCalendar } from "@/components/DesktopWeekCalendar";
import type { CalendarEvent } from "@/lib/useEvents";

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
  onEventPress?: (eventId: string, clickEvent?: React.MouseEvent) => void;
  showSummary?: boolean;
  summary?: string;
  summaryLoading?: boolean;
  onCloseSummary?: () => void;
  allEvents?: CalendarEvent[];
  weekEventsByDay?: Record<string, { id: string; title: string; timeRange: string; startHour: number; durationHours: number }[]>;
  onDragCreate?: (date: string, startTime: string, endTime: string, anchorPosition: { top: number; left: number }) => void;
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
  onEventPress,
  showSummary,
  summary,
  summaryLoading,
  onCloseSummary,
  allEvents = [],
  weekEventsByDay,
  onDragCreate,
}: HomePageProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchResults = searchQuery.trim().length > 0
    ? allEvents.filter((e) =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const formatSearchDate = (d: Date) => {
    const month = d.toLocaleString("default", { month: "short" });
    const day = d.getDate();
    const h = d.getHours();
    const m = d.getMinutes();
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    const time = m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
    return `${month} ${day}, ${time}`;
  };

  return (
    <div className="relative mx-auto max-w-[402px] lg:max-w-none bg-background pb-28 lg:pb-8 lg:px-8">
      {/* Desktop header area */}
      <div className="lg:hidden">
        <Header
          greeting={greeting}
          name={userName}
          onAddPress={onAddPress}
          onAiPress={onAiPress}
        />
      </div>
      <div className="hidden lg:block pt-8 pb-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-body leading-body text-text-secondary">{greeting}</p>
            <h1 className="font-serif text-display leading-display lg:text-heading lg:leading-heading tracking-[-0.3px] text-text-strong">
              {userName}
            </h1>
          </div>
          <div className="flex items-center gap-2 relative">
            {/* Search */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}
                aria-label="Search events"
                className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-divider bg-surface text-text-secondary transition-colors hover:bg-subtle-fill"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>

              {/* Search dropdown */}
              {searchOpen && (
                <div className="absolute right-0 top-11 z-50 w-[320px] rounded-[8px] border border-divider bg-surface shadow-subtle">
                  <div className="flex items-center gap-2 border-b border-divider px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary shrink-0">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search events..."
                      className="flex-1 bg-transparent text-small leading-small text-text-strong placeholder:text-text-tertiary outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="text-text-tertiary hover:text-text-secondary"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="max-h-[280px] overflow-y-auto py-1">
                    {searchQuery.trim().length === 0 ? (
                      <p className="px-3 py-3 text-caption leading-label text-text-tertiary">Type to search events...</p>
                    ) : searchResults.length === 0 ? (
                      <p className="px-3 py-3 text-caption leading-label text-text-tertiary">No events found</p>
                    ) : (
                      searchResults.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-subtle-fill transition-colors"
                          onClick={() => {
                            onDayPress?.(event.start.getDate(), event.start.getMonth(), event.start.getFullYear());
                            onEventPress?.(event.id);
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                        >
                          <div className="h-2 w-2 rounded-full bg-accent shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-small leading-small font-medium text-text-strong truncate">{event.title}</p>
                            <p className="text-label leading-label text-text-tertiary">{formatSearchDate(event.start)}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onAiPress}
              aria-label="AI summary"
              className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-divider bg-surface text-text-secondary transition-colors hover:bg-subtle-fill"
            >
              <svg width="18" height="16" viewBox="0 0 29 25" fill="none">
                <path d="M21.6333 0C22.9681 0.104094 24.0386 0.83307 24.7934 1.91075C25.5685 3.00821 25.8575 4.36986 25.5931 5.68214C25.0461 8.54764 21.8167 10.5302 19.1928 11.2148C18.8591 11.3019 18.3249 11.3661 18.0594 11.541L18.1543 11.6973C20.7611 13.1106 24.5205 10.6652 26.9663 10.1784C27.315 10.1177 28.0975 10.1924 28.3406 10.5011C29.7512 12.2944 28.6402 15.3338 27.4194 16.7284C26.3351 17.9687 24.7913 18.7254 23.1345 18.8276C19.1256 19.1096 17.183 16.9782 14.4873 14.6596C15.7129 17.401 20.4082 21.2419 16.6316 23.7253C14.9389 24.8355 12.8714 25.2428 10.8767 24.8591C6.54646 22.8821 9.96539 16.6931 10.9677 13.5786C10.3636 13.9381 9.87413 14.2608 9.33474 14.7033C7.65519 16.1355 5.08867 19.6262 2.72963 17.4132C-3.14951 11.8983 1.42686 9.32598 7.41625 9.32556C7.87663 9.32556 9.50469 8.97875 9.29871 8.34703C8.6172 6.19115 7.30356 4.37923 8.69599 2.17462C10.4063 -0.533312 13.8269 1.62773 15.0735 3.62752C15.549 4.39038 15.577 6.47522 16.1568 6.87086C17.8846 6.56595 18.6554 0.803285 21.6333 0Z" fill="#6F8F7A"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={onAddPress}
              aria-label="Add new"
              className="flex h-9 items-center gap-2 rounded-[8px] bg-accent px-3 text-small leading-small font-medium text-white transition-colors hover:bg-accent-dark"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Calendar / schedule - Mobile */}
      <div className="lg:hidden">
        <div className="mx-lg overflow-hidden rounded-[18px]" style={{ border: "1px solid rgba(150, 150, 150, 0.2)", backgroundColor: "#FFFFFF" }}>
          <WeekStrip
            days={days}
            onDayPress={onDayPress}
            onNextWeek={onNextWeek}
            onPrevWeek={onPrevWeek}
            direction={weekDirection}
          />
          <EventList timeSlots={timeSlots} events={events} scrollKey={scrollKey} onEventPress={onEventPress} />
        </div>
      </div>

      {/* Calendar / schedule - Desktop week grid */}
      <div className="hidden lg:block">
        <DesktopWeekCalendar
          days={days}
          events={events}
          weekEventsByDay={weekEventsByDay}
          onDayPress={onDayPress}
          onEventPress={onEventPress}
          onDragCreate={onDragCreate}
        />
      </div>

      {/* Tasks section — mobile only */}
      <div className="lg:hidden">
        <TasksSection tasks={tasks} onSeeAll={onSeeAllTasks} />
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <BottomNav items={navItems} onItemPress={onNavPress} />
      </div>

      {/* Summary modal */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm"
            onClick={onCloseSummary}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full max-w-[370px] mx-4 rounded-[20px] bg-surface p-5 shadow-subtle"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="20" height="17" viewBox="0 0 29 25" fill="none">
                    <path d="M21.6333 0C22.9681 0.104094 24.0386 0.83307 24.7934 1.91075C25.5685 3.00821 25.8575 4.36986 25.5931 5.68214C25.0461 8.54764 21.8167 10.5302 19.1928 11.2148C18.8591 11.3019 18.3249 11.3661 18.0594 11.541L18.1543 11.6973C20.7611 13.1106 24.5205 10.6652 26.9663 10.1784C27.315 10.1177 28.0975 10.1924 28.3406 10.5011C29.7512 12.2944 28.6402 15.3338 27.4194 16.7284C26.3351 17.9687 24.7913 18.7254 23.1345 18.8276C19.1256 19.1096 17.183 16.9782 14.4873 14.6596C15.7129 17.401 20.4082 21.2419 16.6316 23.7253C14.9389 24.8355 12.8714 25.2428 10.8767 24.8591C6.54646 22.8821 9.96539 16.6931 10.9677 13.5786C10.3636 13.9381 9.87413 14.2608 9.33474 14.7033C7.65519 16.1355 5.08867 19.6262 2.72963 17.4132C-3.14951 11.8983 1.42686 9.32598 7.41625 9.32556C7.87663 9.32556 9.50469 8.97875 9.29871 8.34703C8.6172 6.19115 7.30356 4.37923 8.69599 2.17462C10.4063 -0.533312 13.8269 1.62773 15.0735 3.62752C15.549 4.39038 15.577 6.47522 16.1568 6.87086C17.8846 6.56595 18.6554 0.803285 21.6333 0Z" fill="#6F8F7A"/>
                  </svg>
                  <span className="text-body leading-body font-semibold text-text-strong">Today's summary</span>
                </div>
                <button
                  type="button"
                  onClick={onCloseSummary}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-text-tertiary hover:bg-subtle-fill"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {summaryLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent"
                  />
                  <span className="text-caption leading-caption text-text-secondary">Thinking...</span>
                </div>
              ) : (
                <p className="text-body leading-body text-text-strong py-2">
                  {summary}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
