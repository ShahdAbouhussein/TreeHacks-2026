import { useEffect, useRef } from "react";
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

export function EventList({ timeSlots, events, scrollKey }: EventListProps) {
  const startHour = timeSlots[0]?.hour ?? 0;
  const slotHeight = 40;
  const totalHeight = timeSlots.length * slotHeight;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [scrollKey, nowTop]);

  return (
    <section aria-label="Daily schedule" className="relative">
      <div className="mx-[16px] border-t border-gray-200" />
      <div ref={scrollRef} className="overflow-y-auto max-h-[270px] px-[16px] py-[8px]">
        <div className="relative" style={{ height: totalHeight }}>
          {timeSlots.map((slot) => (
            <div
              key={slot.hour}
              className="absolute left-0 flex w-[52px] items-start"
              style={{
                top: (slot.hour - startHour) * slotHeight,
                height: slotHeight,
              }}
            >
              <span className="text-[14px] leading-5 text-text-secondary">
                {slot.label}
              </span>
            </div>
          ))}

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
        className="pointer-events-none absolute top-0 left-0 right-0 h-[24px] z-10"
        style={{ background: "linear-gradient(to top, rgba(255,255,255,0), rgba(255,255,255,0.58))" }}
      />
      {/* Subtle bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[24px] z-10"
        style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.58))" }}
      />
    </section>
  );
}
