import React from "react";
import { StatCard } from "./StatCard";
import {
  CalendarIcon,
  ChartBarIcon,
  TrophyIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";

interface TrainingDive {
  code: string;
  drillType: string;
  reps: string[];
  success: number;
}

interface TrainingSession {
  date: string;
  dives: TrainingDive[];
  balks: number;
}

interface DiveCodeStats {
  totalReps: number;
  successfulReps: number;
  sessions: number;
}

interface TrainingData {
  sessions: TrainingSession[];
  totalDives: number;
  successRate: number;
  diveCodeStats: Record<string, DiveCodeStats>;
}

interface DiverWithTraining {
  name: string;
  gender: string;
  city_state: string;
  country: string;
  age: number;
  hs_grad_year: number;
  training?: TrainingData;
}

interface TrainingProfileProps {
  diverWithTraining: DiverWithTraining;
  trainingStats: {
    totalSessions: number;
    totalDives: number;
    successRate: number;
  };
  trainingCalendarData: { date: Date; count: number; successRate: number }[];
  calendarMonth: number;
  calendarYear: number;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  monthName: string;
  monthDays: Date[];
  firstWeekday: number;
  calendarSessions: { date: Date; count: number; successRate: number }[];
  today: Date;
  diveCodePerformanceData: {
    code: string;
    successRate: number;
    totalReps: number;
    sessions: number;
  }[];
}

export const TrainingProfile: React.FC<TrainingProfileProps> = ({
  diverWithTraining,
  trainingStats,
  trainingCalendarData,
  calendarMonth,
  calendarYear,
  goToPrevMonth,
  goToNextMonth,
  monthName,
  monthDays,
  firstWeekday,
  calendarSessions,
  today,
  diveCodePerformanceData,
}) => {
  return (
    <div className="space-y-6">
      {/* Training Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Training Sessions"
          value={trainingStats.totalSessions}
          icon={<CalendarIcon className="h-6 w-6 text-blue-500" />}
        />
        <StatCard
          title="Total Training Dives"
          value={trainingStats.totalDives}
          icon={<ChartBarIcon className="h-6 w-6 text-green-500" />}
        />
        <StatCard
          title="Success Rate"
          value={`${trainingStats.successRate}%`}
          icon={<TrophyIcon className="h-6 w-6 text-yellow-500" />}
        />
      </div>

      {/* Training Calendar and Dive Code Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Calendar */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
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
          {/* Legend */}
          <div className="mb-2 flex items-center gap-4">
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
              Session
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-200 text-gray-500 text-xs font-medium">
              No Session
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full border border-blue-500 text-blue-700 text-xs font-medium">
              Today
            </span>
          </div>
          <div className="rounded-xl bg-white">
            <div className="flex justify-center w-full p-2">
              <div className="grid grid-cols-7 gap-x-16 gap-y-1 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-bold text-blue-700 py-1 tracking-wide uppercase"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="flex justify-center w-full p-2">
              <div className="grid grid-cols-7 gap-x-16 gap-y-1">
                {/* Blank days for alignment */}
                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <div key={"blank-" + i} />
                ))}
                {/* Actual days of the month */}
                {monthDays.map((date, i) => {
                  const session = calendarSessions.find(
                    (d) => d.date.toDateString() === date.toDateString()
                  );
                  const isToday = today.toDateString() === date.toDateString();
                  return (
                    <div
                      key={date.toISOString()}
                      className="flex items-center justify-center p-0.5"
                      onClick={() => {
                        if (session) {
                          const element = document.getElementById(
                            `session-${
                              session.date.toISOString().split("T")[0]
                            }`
                          );
                          element?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    >
                      <div
                        className={
                          `w-11 h-11 aspect-square flex items-center justify-center rounded-full text-base font-semibold transition-all duration-150 ` +
                          (session
                            ? isToday
                              ? "bg-blue-600 text-white border-2 border-blue-800 shadow-lg cursor-pointer hover:bg-blue-700"
                              : "bg-blue-200 text-blue-900 cursor-pointer hover:bg-blue-300"
                            : isToday
                            ? "border-2 border-blue-500 bg-white text-blue-700"
                            : "bg-gray-100 text-gray-400")
                        }
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

        {/* Dive Code Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Dive Code Performance
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diveCodePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(1)}%`,
                    "Success Rate",
                  ]}
                  labelFormatter={(label) => `Dive Code: ${label}`}
                />
                <Bar
                  dataKey="successRate"
                  fill="#3B82F6"
                  barSize={50}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Training History */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Training History
        </h3>
        <div className="space-y-4">
          {diverWithTraining.training?.sessions?.map(
            (session: TrainingSession, index: number) => (
              <div
                key={index}
                id={`session-${session.date}`}
                className="border-l-4 border-green-500 px-4 py-3 bg-gray-50 rounded-r-lg"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {new Date(session.date).toLocaleDateString()}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {session.dives.length} dives • {session.balks} balks
                    </p>
                  </div>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    onClick={() => {
                      // TODO: Implement photo viewing functionality
                      console.log("View photo for session:", session.date);
                    }}
                  >
                    <PhotoIcon className="h-4 w-4" />
                    View Photo
                  </button>
                </div>

                <div className="mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {session.dives.map(
                      (dive: TrainingDive, diveIndex: number) => (
                        <div
                          key={diveIndex}
                          className="bg-white p-3 rounded border"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{dive.code}</p>
                              <p className="text-xs text-gray-600 mb-1">
                                {dive.drillType}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">
                                Success: {dive.success}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Reps:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {dive.reps.map(
                                (rep: string, repIndex: number) => (
                                  <span
                                    key={repIndex}
                                    className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${
                                      rep === "O"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {rep}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
