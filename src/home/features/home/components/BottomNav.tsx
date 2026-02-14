interface NavItem {
  id: string;
  label: string;
  icon: "home" | "chat" | "calendar" | "profile";
  isActive?: boolean;
}

interface BottomNavProps {
  items: NavItem[];
  onItemPress?: (id: string) => void;
}

const icons = {
  home: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  chat: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  calendar: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  profile: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export function BottomNav({ items, onItemPress }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-xs rounded-full bg-surface-alt px-sm py-sm shadow-subtle"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemPress?.(item.id)}
          aria-label={item.label}
          aria-current={item.isActive ? "page" : undefined}
          className={`flex h-12 w-[69px] items-center justify-center rounded-full transition-colors ${
            item.isActive
              ? "bg-surface text-text-strong shadow-subtle"
              : "text-text-secondary"
          }`}
        >
          {icons[item.icon]}
        </button>
      ))}
    </nav>
  );
}
