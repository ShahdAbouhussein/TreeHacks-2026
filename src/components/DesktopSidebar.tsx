import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Settings,
  CircleArrowUp,
  Download,
  SunMedium,
  Languages,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";

interface DesktopSidebarProps {
  activeTab: string;
  onNavPress: (id: string) => void;
  userEmail?: string;
  onAddPress?: () => void;
  onSignOut?: () => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 260;

export function DesktopSidebar({ activeTab, onNavPress, userEmail, onSignOut }: DesktopSidebarProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isDragging = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setDragging(true);
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (e.clientX - startX)));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      setDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width]);
  const items = [
    { id: "home", label: "Home" },
    { id: "tasks", label: "Tasks" },
    { id: "chat", label: "Assistant" },
  ];

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:shrink-0 lg:flex-col lg:border-r lg:bg-surface-alt lg:h-screen lg:sticky lg:top-0 relative transition-colors",
        dragging ? "border-accent bg-accent/[0.03]" : "border-divider"
      )}
      style={{ width }}
    >
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
      <div ref={menuRef} className="relative mt-auto border-t border-divider px-3 py-3">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors",
            menuOpen ? "bg-subtle-fill" : "hover:bg-subtle-fill"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
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
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-[16px] bg-surface shadow-floating animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-small font-semibold text-accent">
                {userEmail?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body leading-body font-medium text-text-strong">
                  {userEmail?.split("@")[0] || "User"}
                </p>
                <p className="truncate text-caption leading-caption text-text-tertiary">
                  {userEmail || ""}
                </p>
              </div>
            </div>

            <MenuDivider />

            <MenuItem icon={<Settings size={18} />} label="All settings" trailing={<KbdHint>⇧⌘,</KbdHint>} onClick={() => setMenuOpen(false)} />
            <MenuItem icon={<CircleArrowUp size={18} />} label="Upgrade plan" onClick={() => setMenuOpen(false)} />
            <MenuItem icon={<Download size={18} />} label="Install apps" onClick={() => setMenuOpen(false)} />

            <MenuDivider />

            <MenuItem
              icon={<SunMedium size={18} />}
              label="Appearance"
              caption="System (Light)"
              trailing={<ChevronRight size={16} className="text-text-tertiary" />}
              onClick={() => setMenuOpen(false)}
            />
            <MenuItem
              icon={<Languages size={18} />}
              label="Language"
              caption="Default"
              trailing={<ChevronRight size={16} className="text-text-tertiary" />}
              onClick={() => setMenuOpen(false)}
            />
            <MenuItem
              icon={<HelpCircle size={18} />}
              label="Help"
              trailing={<ChevronRight size={16} className="text-text-tertiary" />}
              onClick={() => setMenuOpen(false)}
            />

            <MenuDivider />

            <MenuItem
              icon={<LogOut size={18} />}
              label="Sign out"
              onClick={() => {
                setMenuOpen(false);
                onSignOut?.();
              }}
            />
            <div className="h-2" />
          </div>
        )}
      </div>

      {/* Drag handle (invisible hit area over the border) */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 -right-[3px] h-full w-[7px] cursor-col-resize z-10"
      />

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

/* ── Profile menu primitives ── */

function MenuItem({
  icon,
  label,
  caption,
  trailing,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  caption?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-subtle-fill"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-text-strong">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body leading-body font-normal text-text-strong">
          {label}
        </span>
        {caption && (
          <span className="block truncate text-caption leading-caption text-text-tertiary">
            {caption}
          </span>
        )}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  );
}

function MenuDivider() {
  return <div className="mx-4 h-px bg-divider" />;
}

function KbdHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-caption leading-caption text-text-tertiary">
      {children}
    </span>
  );
}
