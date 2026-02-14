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
}

export function EventList({ timeSlots, events }: EventListProps) {
  const startHour = timeSlots[0]?.hour ?? 9;
  const slotHeight = 40; // px per hour slot
  const totalHeight = timeSlots.length * slotHeight;

  return (
    <section
      aria-label="Daily schedule"
      className="relative px-[16px] py-[12px]"
    >
      <div className="relative" style={{ height: totalHeight }}>
        {/* Time labels */}
        {timeSlots.map((slot) => (
          <div
            key={slot.hour}
            className="absolute left-0 flex w-[48px] items-start"
            style={{
              top: (slot.hour - startHour) * slotHeight,
              height: slotHeight,
            }}
          >
            <span className="text-[12px] leading-4 text-text-tertiary">
              {slot.label}
            </span>
          </div>
        ))}

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
    </section>
  );
}
