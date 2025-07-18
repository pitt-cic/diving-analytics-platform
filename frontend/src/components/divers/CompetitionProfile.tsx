import React from "react";
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
import { StatCard } from "./StatCard";
import {
  ChartBarIcon,
  UserIcon,
  TrophyIcon,
  CalendarIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import {
  Diver,
  Dive,
  DiverStats,
  TrendData,
  DiveCodeTrendData,
} from "../../types";

interface CompetitionProfileProps {
  diver: Diver;
  diverStats: DiverStats;
  trendData: TrendData[];
  diveCodeData: {
    code: string;
    average: number;
    count: number;
    description: string;
  }[];
  selectedDiveCode: string | null;
  setSelectedDiveCode: (code: string | null) => void;
  selectedDiveCodeTrendData: DiveCodeTrendData[];
  handleBackClick: () => void;
}

export const CompetitionProfile: React.FC<CompetitionProfileProps> = ({
  diver,
  diverStats,
  trendData,
  diveCodeData,
  selectedDiveCode,
  setSelectedDiveCode,
  selectedDiveCodeTrendData,
  handleBackClick,
}) => {
  const handleBarClick = (data: any, index: number) => {
    if (data && data.code) {
      setSelectedDiveCode(data.code);
    }
  };

  return (
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
                new Date(b.start_date || b.date || b.end_date || "").getTime() -
                new Date(a.start_date || a.date || a.end_date || "").getTime()
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
                      {result.end_date && result.end_date !== result.start_date
                        ? ` - ${new Date(result.end_date).toLocaleDateString()}`
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
                            <p className="font-medium text-sm">{dive.code}</p>
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
  );
};
