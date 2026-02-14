import { HomePage } from "./features/home/HomePage";

// Placeholder data — replace with real props/state
const PLACEHOLDER_DAYS = [
  { date: 8, label: "Sun" },
  { date: 9, label: "Mon" },
  { date: 10, label: "Tues" },
  { date: 11, label: "Wed", isSelected: true },
  { date: 12, label: "Thurs" },
  { date: 13, label: "Fri" },
  { date: 14, label: "Sat" },
];

const PLACEHOLDER_TIME_SLOTS = [
  { hour: 9, label: "9 AM" },
  { hour: 10, label: "10 AM" },
  { hour: 11, label: "11 AM" },
  { hour: 12, label: "12 PM" },
  { hour: 13, label: "1 PM" },
  { hour: 14, label: "2 PM" },
  { hour: 15, label: "3 PM" },
  { hour: 16, label: "4 PM" },
];

const PLACEHOLDER_EVENTS = [
  { id: "1", title: "CS 109 Lecture", timeRange: "2:30 - 4:30 PM", startHour: 9, durationHours: 1 },
  { id: "2", title: "Lunch with Ana", timeRange: "2:30 - 4:30 PM", startHour: 11.5, durationHours: 1 },
  { id: "3", title: "Lunch with Ana", timeRange: "2:30 - 4:30 PM", startHour: 15, durationHours: 1 },
];

const PLACEHOLDER_TASKS = [
  { id: "1", title: "Task Analysis 1.1", dueDate: "Due 09/12/2026", description: "Lorem ipsum", tag: "Personal" },
  { id: "2", title: "Task Analysis 1.1", dueDate: "Due 09/12/2026", description: "Lorem ipsum", tag: "Personal" },
];

const PLACEHOLDER_NAV = [
  { id: "home", label: "Home", icon: "home" as const, isActive: true },
  { id: "chat", label: "Chat", icon: "chat" as const },
  { id: "calendar", label: "Calendar", icon: "calendar" as const },
  { id: "profile", label: "Profile", icon: "profile" as const },
];

function App() {
  return (
    <HomePage
      greeting="Welcome back,"
      userName="Carmah"
      days={PLACEHOLDER_DAYS}
      timeSlots={PLACEHOLDER_TIME_SLOTS}
      events={PLACEHOLDER_EVENTS}
      tasks={PLACEHOLDER_TASKS}
      navItems={PLACEHOLDER_NAV}
    />
  );
}

export default App;
