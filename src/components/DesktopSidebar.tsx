import { cn } from "@/lib/utils";

interface DesktopSidebarProps {
  activeTab: string;
  onNavPress: (id: string) => void;
  userEmail?: string;
  onAddPress?: () => void;
}

export function DesktopSidebar({ activeTab, onNavPress, userEmail }: DesktopSidebarProps) {
  const items = [
    { id: "home", label: "Home" },
    { id: "tasks", label: "Tasks" },
    { id: "chat", label: "Assistant" },
    { id: "profile", label: "Settings" },
  ];

  return (
    <aside className="hidden lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col lg:border-r lg:border-divider lg:bg-surface lg:h-screen lg:sticky lg:top-0">
      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-6">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavPress(item.id)}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-[8px] px-3 text-small leading-small font-medium transition-colors",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-subtle-fill hover:text-text-strong"
              )}
            >
              <span className={cn("transition-colors", isActive ? "text-accent" : "text-text-tertiary")}>
                {item.id === "home" && <HomeIcon />}
                {item.id === "tasks" && <TasksIcon />}
                {item.id === "chat" && <ChatIcon />}
                {item.id === "profile" && <ProfileIcon />}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="mt-auto border-t border-divider px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
            {userEmail?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-small leading-small font-normal text-text-strong">
              {userEmail?.split("@")[0] || "User"}
            </p>
            <p className="truncate text-caption leading-label text-text-tertiary">
              {userEmail || ""}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        /* Home: gentle bounce */
        .nav-home {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .nav-home {
          transform: translateY(-2px);
        }

        /* Tasks: slight tilt on hover */
        .nav-tasks {
          transition: transform 0.25s ease;
        }
        .group:hover .nav-tasks {
          transform: rotate(-8deg);
        }

        /* Chat: gentle wave animation on hover */
        .nav-chat .wave-line {
          transition: transform 0.3s ease;
        }
        .group:hover .nav-chat .wave-line:nth-child(1) { transform: scaleY(1.3); }
        .group:hover .nav-chat .wave-line:nth-child(2) { transform: scaleY(0.7); transition-delay: 0.05s; }
        .group:hover .nav-chat .wave-line:nth-child(3) { transform: scaleY(1.2); transition-delay: 0.1s; }
        .group:hover .nav-chat .wave-line:nth-child(4) { transform: scaleY(0.8); transition-delay: 0.15s; }
        .group:hover .nav-chat .wave-line:nth-child(5) { transform: scaleY(1.4); transition-delay: 0.2s; }

        /* Profile: head nod */
        .nav-profile .head {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: 12px 7px;
        }
        .group:hover .nav-profile .head {
          transform: translateY(1px);
        }
      `}</style>
    </aside>
  );
}

/* ── Animated nav icons ── */

function HomeIcon() {
  return (
    <svg className="nav-home" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg className="nav-tasks" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11L12 14L22 4M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="nav-chat" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line className="wave-line" x1="3" y1="10" x2="3" y2="14" />
      <line className="wave-line" x1="7.5" y1="11" x2="7.5" y2="13" />
      <line className="wave-line" x1="12" y1="6" x2="12" y2="18" />
      <line className="wave-line" x1="16.5" y1="3" x2="16.5" y2="21" />
      <line className="wave-line" x1="21" y1="10" x2="21" y2="14" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="nav-profile" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" />
      {/* Head circle — nods on hover */}
      <circle className="head" cx="12" cy="7" r="4" />
    </svg>
  );
}
