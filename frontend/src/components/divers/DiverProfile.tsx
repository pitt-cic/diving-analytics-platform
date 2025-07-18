import React, { useState, useMemo, useEffect } from "react";

import {
  DiverStats,
  TrendData,
  DiverProfileProps,
  DiveCodeTrendData,
  Diver,
} from "../../types";
import { TrophyIcon, BeakerIcon } from "@heroicons/react/24/outline";
import { CompetitionProfile } from "./CompetitionProfile";
import { TrainingProfile } from "./TrainingProfile";

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

  // Remove the useMemo-based trainingStats calculation and instead expect trainingStats as a prop from TrainingProfile, calculated from confirmedLogs.
  // Update the TrainingProfile to calculate trainingStats from confirmedLogs and pass it down.

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

  // const handleBarClick = (data: any, index: number) => {
  //   if (data && data.code) {
  //     setSelectedDiveCode(data.code);
  //   }
  // };

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

      {activeTab === "competition" ? (
        <CompetitionProfile
          diver={diver}
          diverStats={diverStats}
          trendData={trendData}
          diveCodeData={diveCodeData}
          selectedDiveCode={selectedDiveCode}
          setSelectedDiveCode={setSelectedDiveCode}
          selectedDiveCodeTrendData={selectedDiveCodeTrendData}
          handleBackClick={handleBackClick}
        />
      ) : (
        <TrainingProfile
          diverWithTraining={diverWithTraining}
          trainingCalendarData={trainingCalendarData}
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          goToPrevMonth={goToPrevMonth}
          goToNextMonth={goToNextMonth}
          monthName={monthName}
          monthDays={monthDays}
          firstWeekday={firstWeekday}
          calendarSessions={calendarSessions}
          today={today}
          diveCodePerformanceData={diveCodePerformanceData}
        />
      )}
    </div>
  );
};
