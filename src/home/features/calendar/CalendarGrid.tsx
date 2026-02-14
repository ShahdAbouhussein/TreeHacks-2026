import DayCell from "./DayCell";

const days = Array.from({ length: 30 }, (_, i) => i + 1);

const CalendarGrid = () => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "12px",
        marginTop: "20px",
      }}
    >
      {days.map((day) => (
        <DayCell key={day} day={day} />
      ))}
    </div>
  );
};

export default CalendarGrid;
