interface DayCellProps {
    day: number;
  }
  
  const DayCell = ({ day }: DayCellProps) => {
    return (
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "16px",
          minHeight: "80px",
          background: "white",
        }}
      >
        {day}
      </div>
    );
  };
  
  export default DayCell;
  