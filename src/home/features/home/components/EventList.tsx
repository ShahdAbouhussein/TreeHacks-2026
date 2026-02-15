import { useEffect, useRef, useState } from "react";
import { EventItem } from "./EventItem";

interface Event {
  id: string;
  title: string;
  timeRange: string;
  startHour: number;
  durationHours: number;
}

interface TimeSlot {
  hour: number;
  label: string;
}

interface EventListProps {
  timeSlots: TimeSlot[];
  events: Event[];
  scrollKey?: number;
}

function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function EventList({ timeSlots, events, scrollKey }: EventListProps) {
  const startHour = timeSlots[0]?.hour ?? 0;
  const slotHeight = 40; // px per hour slot
  const totalHeight = timeSlots.length * slotHeight;
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useCurrentTime();
  const currentFractionalHour = now.getHours() + now.getMinutes() / 60;
  const nowTop = (currentFractionalHour - startHour) * slotHeight;

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = Math.max(nowTop - 80, 0);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [scrollKey, nowTop]);

  return (
    <section aria-label="Daily schedule" className="relative">
      <div ref={scrollRef} className="overflow-y-auto max-h-[270px] px-[16px] py-[12px]">
        <div className="relative" style={{ height: totalHeight }}>
          {/* Time labels */}
          {timeSlots.map((slot) => {
            const isCurrentHour = slot.hour === now.getHours();
            return (
              <div
                key={slot.hour}
                className="absolute left-0 flex w-[48px] items-start"
                style={{
                  top: (slot.hour - startHour) * slotHeight,
                  height: slotHeight,
                }}
              >
                <span className={`text-[12px] leading-4 ${isCurrentHour ? "font-semibold text-accent" : "text-text-tertiary"}`}>
                  {slot.label}
                </span>
              </div>
            );
          })}

          {/* Current time indicator */}
          <div
            className="absolute left-[48px] right-0 flex items-center z-10"
            style={{ top: nowTop }}
          >
            <div className="h-[6px] w-[6px] rounded-full bg-accent -ml-[3px]" />
            <div className="flex-1 h-[1.5px] bg-accent" />
          </div>

          {/* Events */}
          {events.map((event) => (
            <div
              key={event.id}
              className="absolute left-[56px] right-0"
              style={{
                top: (event.startHour - startHour) * slotHeight,
                height: event.durationHours * slotHeight,
              }}
            >
              <EventItem title={event.title} timeRange={event.timeRange} />
            </div>
          ))}
        </div>
      </div>
      {/* Subtle top fade */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-[40px] z-10"
        style={{ background: "linear-gradient(to top, rgba(255,255,255,0), rgba(255,255,255,0.97))" }}
      />
      {/* Subtle bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[40px] z-10"
        style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.97))" }}
      />
    </section>
  );
}
