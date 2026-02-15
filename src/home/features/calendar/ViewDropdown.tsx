import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import useMeasure from "react-use-measure";

export type CalendarView = "month" | "week" | "day";

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
};

const VIEWS: CalendarView[] = ["month", "week", "day"];

interface ViewDropdownProps {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
}

export function ViewDropdown({ value, onChange }: ViewDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentRef, contentBounds] = useMeasure();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const openHeight = Math.max(40, Math.ceil(contentBounds.height));

  return (
    <div ref={containerRef} className="relative z-30 h-10 w-10">
      <motion.div
        layout
        initial={false}
        animate={{
          width: isOpen ? 160 : 40,
          height: isOpen ? openHeight : 40,
          borderRadius: isOpen ? 14 : 20,
        }}
        transition={{
          type: "spring",
          damping: 34,
          stiffness: 380,
          mass: 0.8,
        }}
        className="absolute top-0 right-0 origin-top-right cursor-pointer overflow-hidden border border-border bg-surface shadow-subtle"
        onClick={() => !isOpen && setIsOpen(true)}
      >
        {/* Collapsed state — grid icon */}
        <motion.div
          initial={false}
          animate={{
            opacity: isOpen ? 0 : 1,
            scale: isOpen ? 0.8 : 1,
          }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: isOpen ? "none" : "auto" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5H17M3 10H17M3 15H17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        {/* Expanded menu */}
        <div ref={contentRef}>
          <motion.div
            layout
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.2, delay: isOpen ? 0.08 : 0 }}
            className="p-[6px]"
            style={{ pointerEvents: isOpen ? "auto" : "none" }}
          >
            <ul className="flex flex-col gap-[2px]">
              {VIEWS.map((view, index) => {
                const isActive = value === view;
                const showIndicator = hoveredItem
                  ? hoveredItem === view
                  : isActive;

                return (
                  <motion.li
                    key={view}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{
                      opacity: isOpen ? 1 : 0,
                      x: isOpen ? 0 : 8,
                    }}
                    transition={{
                      delay: isOpen ? 0.06 + index * 0.02 : 0,
                      duration: 0.15,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                    onClick={() => {
                      onChange(view);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHoveredItem(view)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`relative flex cursor-pointer items-center rounded-lg px-3 py-2 text-[14px] font-medium transition-colors duration-200 ${
                      isActive
                        ? "text-text-strong"
                        : "text-text-secondary hover:text-text-strong"
                    }`}
                  >
                    {showIndicator && (
                      <motion.div
                        layoutId="viewIndicator"
                        className="absolute inset-0 rounded-lg bg-subtle-fill"
                        transition={{
                          type: "spring",
                          damping: 30,
                          stiffness: 520,
                          mass: 0.8,
                        }}
                      />
                    )}
                    <span className="relative z-10">
                      {VIEW_LABELS[view]}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
