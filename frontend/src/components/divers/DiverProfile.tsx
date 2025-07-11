import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  DiverStats,
  TrendData,
  DiverProfileProps,
  DiveCodeTrendData,
  Diver,
  Dive,
} from "../../types";
import { StatCard } from "./StatCard";
import {
  ChartBarIcon,
  UserIcon,
  TrophyIcon,
  CalendarIcon,
  ArrowLeftIcon,
  BeakerIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

// Define training-related types locally since they're not in the main types file
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

// Extend the Diver interface to include training data
interface DiverWithTraining extends Diver {
  training?: TrainingData;
}

export const DiverProfile: React.FC<DiverProfileProps> = ({ diver }) => {
  const [selectedDiveCode, setSelectedDiveCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"competition" | "training">(
    "competition"
  );

  // Cast diver to include training data
  const diverWithTraining = diver as DiverWithTraining;

  // Reset selectedDiveCode when diver changes
  useEffect(() => {
    setSelectedDiveCode(null);
  }, [diver.name]);

  const diverStats: DiverStats = useMemo(() => {
    const allDives = diver.results.flatMap((result) => result.dives);
    const scores = allDives.map((dive) => dive.award);
    const events = diver.results.map((result) => result.event_name);
    const eventCounts = events.reduce((acc, event) => {
      acc[event] = (acc[event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteEvent =
      Object.entries(eventCounts).reduce((a, b) =>
        eventCounts[a[0]] > eventCounts[b[0]] ? a : b
      )[0] || "N/A";

    return {
      totalDives: allDives.length,
      averageScore:
        scores.length > 0
          ? parseFloat(
              (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
            )
          : 0,
      bestScore: scores.length > 0 ? Math.max(...scores) : 0,
      competitions: diver.results.length,
      favoriteEvent,
      averageDifficulty:
        allDives.length > 0
          ? parseFloat(
              (
                allDives.reduce((sum, dive) => sum + dive.difficulty, 0) /
                allDives.length
              ).toFixed(1)
            )
          : 0,
      recentTrend: "stable" as const,
    };
  }, [diver]);

  const trainingStats = useMemo(() => {
    if (!diverWithTraining.training) {
      return {
        totalSessions: 0,
        totalDives: 0,
        successRate: 0,
      };
    }

    const { sessions, totalDives, successRate } = diverWithTraining.training;
    return {
      totalSessions: sessions.length,
      totalDives,
      successRate,
    };
  }, [diverWithTraining.training]);

  const trainingCalendarData = useMemo(() => {
    if (!diverWithTraining.training?.sessions) return [];

    return diverWithTraining.training.sessions.map((session) => ({
      date: new Date(session.date),
      count: session.dives.length,
      successRate:
        session.dives.reduce((sum, dive) => sum + dive.success, 0) /
        session.dives.reduce((sum, dive) => sum + dive.reps.length, 0),
    }));
  }, [diverWithTraining.training]);

  const diveCodePerformanceData = useMemo(() => {
    if (!diverWithTraining.training?.diveCodeStats) return [];

    return Object.entries(diverWithTraining.training.diveCodeStats)
      .map(([code, stats]) => ({
        code,
        successRate: (stats.successfulReps / stats.totalReps) * 100,
        totalReps: stats.totalReps,
        sessions: stats.sessions,
      }))
      .sort((a, b) => b.successRate - a.successRate);
  }, [diverWithTraining.training]);

  const trendData: TrendData[] = useMemo(() => {
    const individualScores = diver.results
      .sort(
        (a, b) =>
          new Date(a.start_date || a.date || "").getTime() -
          new Date(b.start_date || b.date || "").getTime()
      )
      .map((result) => {
        const score =
          result.dives.length > 0
            ? parseFloat(
                (
                  result.dives.reduce((sum, dive) => sum + dive.award, 0) /
                  result.dives.length
                ).toFixed(1)
              )
            : 0;

        return {
          date: new Date(
            result.start_date || result.date || ""
          ).toLocaleDateString(),
          score,
          competition: result.meet_name,
        };
      })
      .filter((item) => item.score > 0);

    const groupedByDate = individualScores.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {
          scores: [],
          competitions: [],
        };
      }
      acc[item.date].scores.push(item.score);
      acc[item.date].competitions.push(item.competition);
      return acc;
    }, {} as Record<string, { scores: number[]; competitions: string[] }>);

    return Object.entries(groupedByDate)
      .map(([date, data]) => ({
        date,
        score: parseFloat(
          (
            data.scores.reduce((sum, score) => sum + score, 0) /
            data.scores.length
          ).toFixed(1)
        ),
        competition:
          data.competitions.length > 1
            ? `${data.competitions.length} competitions`
            : data.competitions[0],
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [diver]);

  const diveCodeData = useMemo(() => {
    const codeStats = diver.results
      .flatMap((result) => result.dives)
      .reduce((acc, dive) => {
        if (!acc[dive.code]) {
          acc[dive.code] = {
            total: 0,
            count: 0,
            description: dive.description,
          };
        }
        acc[dive.code].total += dive.award;
        acc[dive.code].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number; description: string }>);

    return Object.entries(codeStats)
      .map(([code, stats]) => ({
        code,
        average: parseFloat((stats.total / stats.count).toFixed(1)),
        count: stats.count,
        description: stats.description,
      }))
      .sort((a, b) => b.average - a.average);
  }, [diver]);

  // for dive code bar chart
  const selectedDiveCodeTrendData: DiveCodeTrendData[] = useMemo(() => {
    if (!selectedDiveCode) return [];

    const divesForCode = diver.results
      .flatMap((result) =>
        result.dives
          .filter((dive) => dive.code === selectedDiveCode)
          .map((dive) => ({
            ...dive,
            date: result.start_date || result.date || "",
            competition: result.meet_name,
          }))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return divesForCode.map((dive) => ({
      date: new Date(dive.date).toLocaleDateString(),
      score: dive.award,
      competition: dive.competition,
      difficulty: dive.difficulty,
    }));
  }, [diver, selectedDiveCode]);

  const handleBarClick = (data: any, index: number) => {
    if (data && data.code) {
      setSelectedDiveCode(data.code);
    }
  };

  const handleBackClick = () => {
    setSelectedDiveCode(null);
  };

  // Calendar month navigation state
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  // Helper to get days in month and first day of week
  const getMonthDays = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return { days, firstWeekday: firstDay.getDay() };
  };
  const { days: monthDays, firstWeekday } = getMonthDays(
    calendarMonth,
    calendarYear
  );

  // Filter sessions for current month
  const calendarSessions = useMemo(() => {
    return trainingCalendarData.filter(
      (d) =>
        d.date.getMonth() === calendarMonth &&
        d.date.getFullYear() === calendarYear
    );
  }, [trainingCalendarData, calendarMonth, calendarYear]);

  // Month name
  const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleString(
    "default",
    { month: "long", year: "numeric" }
  );

  // Navigation handlers
  const goToPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };
  const goToNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Diver Title Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div
            className={`h-16 w-16 rounded-full flex items-center justify-center text-lg font-bold ${
              diver.gender === "M"
                ? "bg-blue-500 text-white"
                : "bg-pink-500 text-white"
            }`}
          >
            {diver.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{diver.name}</h1>
            <p className="text-gray-600">
              {diver.city_state} • {diver.country}
            </p>
            <p className="text-sm text-gray-500">
              Age {diver.age} • Grad Year {diver.hs_grad_year}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {/*
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("competition")}
            className={`${
              activeTab === "competition"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <TrophyIcon className="h-5 w-5" />
            Competition
          </button>
          <button
            onClick={() => setActiveTab("training")}
            className={`${
              activeTab === "training"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <BeakerIcon className="h-5 w-5" />
            Training
          </button>
        </nav>
      </div>
      */}

      {activeTab === "competition" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Total Dives"
              value={diverStats.totalDives}
              icon={<ChartBarIcon className="h-6 w-6 text-blue-500" />}
            />
            <StatCard
              title="Average Score"
              value={diverStats.averageScore}
              subtitle="All competitions"
              icon={<TrophyIcon className="h-6 w-6 text-yellow-500" />}
            />
            <StatCard
              title="Best Score"
              value={diverStats.bestScore.toFixed(1)}
              icon={<TrophyIcon className="h-6 w-6 text-green-500" />}
            />
            <StatCard
              title="Competitions"
              value={diverStats.competitions}
              icon={<CalendarIcon className="h-6 w-6 text-purple-500" />}
            />
            <StatCard
              title="Average Difficulty"
              value={diverStats.averageDifficulty}
              icon={<ChartBarIcon className="h-6 w-6 text-red-500" />}
            />
            <StatCard
              title="Most Competed Event"
              value={diverStats.favoriteEvent.replace(/^(Men|Women)\s/, "")}
              icon={<UserIcon className="h-6 w-6 text-indigo-500" />}
            />
          </div>

          {/* Performance Trend Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Performance Trend
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dot={{ fill: "#3B82F6", strokeWidth: 0, r: 3 }}
                    dataKey="score"
                    stroke="#3B82F6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Dive Code Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedDiveCode
                      ? `${selectedDiveCode} Performance Over Time`
                      : "Dive Code Performance"}
                  </h3>
                  {selectedDiveCode ? (
                    <p className="text-sm text-gray-600">
                      {
                        diveCodeData.find((d) => d.code === selectedDiveCode)
                          ?.description
                      }
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Click on a bar to see performance trend for that dive code
                    </p>
                  )}
                </div>
                {selectedDiveCode && (
                  <button
                    onClick={handleBackClick}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span className="text-sm">Back to Overview</span>
                  </button>
                )}
              </div>

              {selectedDiveCode ? (
                <div className="space-y-2">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={selectedDiveCodeTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [value, "Score"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dot={{ fill: "#10B981", strokeWidth: 0, r: 4 }}
                        dataKey="score"
                        stroke="#10B981"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <ResponsiveContainer
                    width={diveCodeData.length * 60}
                    height={250}
                  >
                    <BarChart
                      data={diveCodeData.filter(
                        (item) => item.code && item.code.trim() !== ""
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="code" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [value, "Average Score"]}
                        labelFormatter={(label) => `Dive Code: ${label}`}
                      />
                      <Bar
                        dataKey="average"
                        fill="#3B82F6"
                        barSize={50}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleBarClick}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Competition History */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Competition History
            </h3>
            <div className="space-y-4">
              {diver.results
                .slice()
                .sort(
                  (a, b) =>
                    new Date(
                      b.start_date || b.date || b.end_date || ""
                    ).getTime() -
                    new Date(
                      a.start_date || a.date || a.end_date || ""
                    ).getTime()
                )
                .map((result, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-blue-500 px-4 py-3 bg-gray-50 rounded-r-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {result.meet_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {result.event_name} • {result.round_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {result.start_date
                            ? new Date(result.start_date).toLocaleDateString()
                            : ""}
                          {result.end_date &&
                          result.end_date !== result.start_date
                            ? ` - ${new Date(
                                result.end_date
                              ).toLocaleDateString()}`
                            : ""}
                        </p>
                        {result.detail_href && (
                          <a
                            href={`https://secure.meetcontrol.com/divemeets/system/${result.detail_href}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline text-xs"
                          >
                            View on DiveMeets
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {result.total_score}
                        </p>
                        <p className="text-sm text-gray-500">Total Score</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Individual Dives
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {result.dives.map((dive: Dive, diveIndex: number) => (
                          <div
                            key={diveIndex}
                            className="bg-white p-3 rounded border"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">
                                  {dive.code}
                                </p>
                                <p className="text-xs text-gray-600 mb-1">
                                  {dive.description}
                                </p>
                                <p className="text-xs text-gray-500">
                                  DD: {dive.difficulty}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-sm">
                                  Score: {dive.award}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Round Place: #{dive.round_place}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-xs text-gray-500">Scores:</p>
                              <p className="text-xs">
                                {dive.scores
                                  .filter((s: number | null) => s !== null)
                                  .join(", ")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      ) : (
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
                      const isToday =
                        today.toDateString() === date.toDateString();
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
                                  <p className="font-medium text-sm">
                                    {dive.code}
                                  </p>
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
      )}
    </div>
  );
};
