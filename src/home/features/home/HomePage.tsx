import { motion, AnimatePresence } from "framer-motion";
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
  onEventPress?: (eventId: string) => void;
  showSummary?: boolean;
  summary?: string;
  summaryLoading?: boolean;
  onCloseSummary?: () => void;
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
}: HomePageProps) {
  return (
    <div className="relative mx-auto max-w-[402px] bg-background pb-28">
      <Header
        greeting={greeting}
        name={userName}
        onAddPress={onAddPress}
        onAiPress={onAiPress}
      />
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
      <TasksSection tasks={tasks} onSeeAll={onSeeAllTasks} />
      <BottomNav items={navItems} onItemPress={onNavPress} />

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
                  <svg width="20" height="16" viewBox="0 0 49 39" fill="none">
                    <path d="M40.1328 0.030652C41.8301 -0.200838 44.4242 0.924777 45.8063 1.86093C47.2807 2.85959 48.5803 4.33524 48.9059 6.11753C49.1179 7.27843 48.9955 8.66324 48.2933 9.64301C45.6498 13.3299 36.1121 14.7777 31.7339 15.3079C30.7629 15.4251 29.7899 15.5256 28.8156 15.6094C28.4076 15.6458 27.9599 15.6708 27.551 15.7154C27.4835 15.7228 27.4641 15.7685 27.4384 15.8142C27.4374 17.114 34.8789 20.3045 36.2391 20.9446C36.6579 21.1433 37.0698 21.3562 37.4735 21.583C38.8204 22.3404 40.0227 23.2028 41.094 24.2935C43.1221 26.3586 44.2149 28.9427 44.1188 31.826C44.1098 32.0979 44.104 32.6661 44.0265 32.9126C43.7268 33.8636 42.8678 34.9103 42.1576 35.5809C40.4625 37.1818 38.3303 38.0833 35.9753 38.0145C34.275 37.9646 32.5219 37.5287 31.115 36.5613C27.9722 34.4002 26.3571 30.1019 25.533 26.5798C25.3369 25.7238 25.1684 24.8619 25.028 23.9954C24.9593 23.5702 24.9104 22.7519 24.8196 22.3863C24.6396 21.6619 23.994 20.5228 23.465 19.9841C23.1505 19.6638 22.71 19.3714 22.247 19.3732C21.9286 19.3745 21.411 19.5801 21.1916 19.8119C20.4372 20.6089 20.804 21.7553 20.8677 22.6999C20.9133 23.3644 20.9343 24.0302 20.9307 24.696C20.929 28.1582 20.1842 31.6617 18.6754 34.7989C18.4044 35.3624 17.9894 36.213 17.5232 36.6338C15.4722 38.4378 12.1491 39.0003 9.48248 39C7.28493 38.9997 4.77996 38.4356 3.20479 36.8526C2.47697 36.0698 2.02847 34.9176 2.06889 33.8493C2.26728 28.6087 5.87401 24.024 9.94391 20.9518C10.8159 20.2935 11.8868 19.6977 12.8148 19.0961C14.4975 18.0088 16.151 16.8779 17.7736 15.7046C19.0508 14.7733 20.3919 13.7365 21.5161 12.6311C21.8766 12.2459 22.7302 11.3976 22.6529 10.8392C22.4981 9.72276 21.3866 9.82168 20.6363 10.1991C19.488 10.7769 18.7255 11.6241 17.779 12.4268C16.2713 13.7029 14.8124 15.0346 13.1296 16.0922C12.3512 16.5813 11.041 17.0427 10.161 17.384C9.84634 17.5061 8.36765 17.6897 7.99306 17.6807C5.93169 17.6312 3.56187 16.8393 2.00107 15.4835C1.75095 15.2592 1.31753 14.785 1.1738 14.5178C0.575788 13.4059 0.0585924 11.9605 0.00460554 10.7012C-0.0531781 9.35317 0.43516 8.40385 1.3352 7.44466C1.83415 6.91292 2.65277 6.22554 3.28944 5.90241C4.67542 5.19893 6.2873 4.66945 7.78014 4.24057C10.5818 3.44947 13.4305 2.83105 16.3098 2.3889C18.2495 2.08339 20.286 1.83393 22.2456 1.76012C23.8504 1.74569 26.1522 1.60406 27.3917 2.80955C29.1071 4.47781 28.516 7.66571 27.6318 9.61979C27.1134 10.7966 25.8072 12.4664 25.7704 13.7549C25.7351 14.9926 29.0175 12.8822 29.3343 12.6622C30.8353 11.6198 32.3086 10.3844 33.2357 8.79669C33.5921 8.18626 33.8868 7.43657 34.1564 6.78499C34.464 6.03031 34.7797 5.279 35.1042 4.53122C35.4432 3.75642 36.055 2.4739 36.6172 1.83911C37.3465 1.01547 39.0176 0.118624 40.1328 0.030652Z" fill="#6F8F7A"/>
                  </svg>
                  <span className="text-secondary leading-secondary font-semibold text-text-strong">Today's summary</span>
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
