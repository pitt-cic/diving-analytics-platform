import React from "react";

interface TrainingCalendarProps {
  logs: any[];
  monthDays: Date[];
  firstWeekday: number;
  monthName: string;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  onLogClick: (logIdx: number) => void;
  heightClass: string;
  today: Date;
}

const dayLetters = ["S", "M", "T", "W", "T", "F", "S"];

const TrainingCalendar: React.FC<TrainingCalendarProps> = ({
  logs,
  monthDays,
  firstWeekday,
  monthName,
  goToPrevMonth,
  goToNextMonth,
  onLogClick,
  heightClass,
  today,
}) => {
  return (
    <div
      className={`lg:col-span-2 bg-white p-4 rounded-lg border border-gray-200 flex flex-col ${heightClass}`}
      style={{ minHeight: 220 }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Training Calendar
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="px-2 py-1 rounded hover:bg-blue-100 text-blue-700 font-bold"
          >
            &#8592;
          </button>
          <span className="font-medium text-blue-900">{monthName}</span>
          <button
            onClick={goToNextMonth}
            className="px-2 py-1 rounded hover:bg-blue-100 text-blue-700 font-bold"
          >
            &#8594;
          </button>
        </div>
      </div>
      <hr className="my-2 border-gray-200" />
      <div className="mb-3" />
      {/* Responsive indicators and calendar grid */}
      <div className="flex flex-col lg:flex-row lg:items-start flex-1 w-full max-w-2xl mx-auto">
        {/* Indicators: row on mobile, column on desktop */}
        <div className="flex flex-row justify-center gap-2 mb-3 lg:mb-0 lg:flex-col lg:justify-start lg:items-end lg:mr-6">
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-500 text-white text-xs font-medium">
            Green: Good
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-400 text-white text-xs font-medium">
            Yellow: Average
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-500 text-white text-xs font-medium">
            Red: Poor
          </span>
        </div>
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-x-2 gap-y-1 mb-1 w-full">
            {dayLetters.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-bold text-blue-700 py-1 tracking-wide uppercase"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-x-2 gap-y-2 w-full">
            {/* Blank days for alignment */}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={"blank-" + i} />
            ))}
            {/* Actual days of the month */}
            {monthDays.map((date, i) => {
              // Find log for this date
              const logIdx = logs.findIndex((log) => {
                const logDate = log.date
                  ? new Date(log.date).toDateString()
                  : "";
                return logDate === date.toDateString();
              });
              const log = logIdx !== -1 ? logs[logIdx] : null;
              // Default to green if log exists but no rating
              const rating =
                log?.extractedData?.rating || (log ? "green" : undefined);
              let colorClass = "bg-gray-100 text-gray-400";
              if (log) {
                if (rating === "green")
                  colorClass =
                    "bg-green-500 text-white cursor-pointer hover:bg-green-600";
                else if (rating === "yellow")
                  colorClass =
                    "bg-yellow-400 text-white cursor-pointer hover:bg-yellow-500";
                else if (rating === "red")
                  colorClass =
                    "bg-red-500 text-white cursor-pointer hover:bg-red-600";
              }
              return (
                <div
                  key={date.toISOString()}
                  className="flex items-center justify-center p-0.5"
                  onClick={() => {
                    if (log) {
                      onLogClick(logIdx);
                    }
                  }}
                >
                  <div
                    className={
                      `w-10 h-10 aspect-square flex items-center justify-center rounded-full text-base font-semibold transition-all duration-150 ` +
                      colorClass
                    }
                    style={{ cursor: log ? "pointer" : "default" }}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingCalendar;
