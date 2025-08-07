import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "./StatCard";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChartBarIcon,
  TrophyIcon,
  UserIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import {
  Dive,
  DiveCodeTrendData,
  Diver,
  DiverStats,
  TrendData,
} from "../../types";
import { MultiSelectDropdown } from "../common/MultiSelectDropdown";

interface CompetitionProfileProps {
  diver: Diver;
  diverStats: DiverStats;
  trendData: TrendData[];
  diveCodeData: {
    key: string;
    code: string;
    board: string;
    average: number;
    count: number;
    description: string;
    displayCode: string;
  }[];
  selectedDiveCode: string | null;
  setSelectedDiveCode: (code: string | null) => void;
  selectedDiveCodeTrendData: DiveCodeTrendData[];
  handleBackClick: () => void;
  // Filter props
  availableDiveCodes: string[];
  availableBoards: string[];
  selectedDiveCodes: string[];
  selectedBoards: string[];
  onDiveCodesChange: (codes: string[]) => void;
  onBoardsChange: (boards: string[]) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
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
  availableDiveCodes,
  availableBoards,
  selectedDiveCodes,
  selectedBoards,
  onDiveCodesChange,
  onBoardsChange,
  onApplyFilters,
  onClearFilters,
}) => {
  const handleBarClick = (data: any, index: number) => {
    if (data) {
      // The data object should contain the key which has both code and board
      setSelectedDiveCode(data.key);
    }
  };

  // Extract code and board from selectedDiveCode for display
  const selectedDiveInfo = selectedDiveCode
    ? {
        code: selectedDiveCode.split("-")[0],
        board: selectedDiveCode.split("-")[1],
      }
    : null;

  // --- Filter Dropdown State ---
  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterButtonRef = React.useRef<HTMLButtonElement>(null);
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);
  // Count active filters
  const activeFilterCount =
    (selectedDiveCodes.length > 0 ? 1 : 0) +
    (selectedBoards.length > 0 ? 1 : 0);
  // Close dropdown on outside click
  React.useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);
  // Keyboard accessibility (Escape closes)
  React.useEffect(() => {
    if (!filterOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [filterOpen]);

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
        <div className="bg-white p-6 pb-2 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-10">
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
        <div className="bg-white p-6 pb-2 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-row w-full items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDiveInfo
                    ? `${selectedDiveInfo.code} (${selectedDiveInfo.board}) Performance Over Time`
                    : "Dive Code Performance"}
                </h3>
                {selectedDiveInfo ? (
                  <p className="text-sm text-gray-600">
                    {
                      diveCodeData.find((d) => d.key === selectedDiveCode)
                        ?.description
                    }
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Click a bar to view performance trend
                  </p>
                )}
              </div>
              {!selectedDiveCode && (
                <div className="relative">
                  <button
                    ref={filterButtonRef}
                    type="button"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-blue-50 transition-colors font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => setFilterOpen((v) => !v)}
                    aria-haspopup="true"
                    aria-expanded={filterOpen}
                  >
                    <FunnelIcon className="h-5 w-5 text-blue-500" />
                    Filter
                    {activeFilterCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  {/* Dropdown */}
                  {filterOpen && (
                    <div
                      ref={filterDropdownRef}
                      className="absolute mt-2 z-20 w-80 md:w-96 min-w-[20rem] bg-white border border-gray-200 rounded-xl shadow-lg p-5 flex flex-col gap-4 animate-fade-in whitespace-nowrap overflow-visible right-0"
                      tabIndex={-1}
                    >
                      <MultiSelectDropdown
                        label="Dive Codes"
                        options={availableDiveCodes}
                        selectedValues={selectedDiveCodes}
                        onChange={onDiveCodesChange}
                        placeholder="Select"
                      />
                      <MultiSelectDropdown
                        label="Boards"
                        options={availableBoards}
                        selectedValues={selectedBoards}
                        onChange={onBoardsChange}
                        placeholder="Select"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            onApplyFilters();
                            setFilterOpen(false);
                          }}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium shadow"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            onClearFilters();
                            setFilterOpen(false);
                          }}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium shadow"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedDiveCode && (
              <button
                onClick={handleBackClick}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-blue-50 transition-colors font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </button>
            )}
          </div>

          {selectedDiveCode ? (
            <div className="space-y-2">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={selectedDiveCodeTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    domain={[
                      0,
                      (dataMax: number) => {
                        // Round up to the nearest 5
                        return Math.ceil(dataMax / 5) * 5;
                      },
                    ]}
                  />
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
            <div className="space-y-4">
              {/* Bar Chart */}
              <div className="overflow-x-auto">
                <div
                  style={{
                    minWidth: Math.max(diveCodeData.length * 50, 500) + "px",
                  }}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={diveCodeData.filter(
                        (item) => item.code && item.code.trim() !== ""
                      )}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="displayCode"
                        height={70}
                        interval={0}
                        tick={(props) => {
                          const { x, y, payload } = props;
                          // Split the displayCode into code and board
                          const parts =
                            payload.value.match(/^(.*?)\s*\((.*?)\)$/);
                          const code = parts ? parts[1] : payload.value;
                          const board = parts ? parts[2] : "";

                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text
                                x={0}
                                y={0}
                                dy={16}
                                textAnchor="middle"
                                fill="#666"
                                fontSize={12}
                              >
                                {code}
                              </text>
                              <text
                                x={0}
                                y={0}
                                dy={32}
                                textAnchor="middle"
                                fill="#666"
                                fontSize={10}
                              >
                                {board}
                              </text>
                            </g>
                          );
                        }}
                      />
                      <YAxis
                        domain={[
                          0,
                          (dataMax: number) => {
                            // Round up to the nearest 5
                            return Math.ceil(dataMax / 5) * 5;
                          },
                        ]}
                      />
                      <Tooltip
                        formatter={(value, name) => [value, "Average Score"]}
                        labelFormatter={(label) => {
                          // Split the displayCode into code and board
                          const parts = label.match(/^(.*?)\s*\((.*?)\)$/);
                          const code = parts ? parts[1] : label;
                          const board = parts ? parts[2] : "";
                          return `Dive: ${code}\nBoard: ${board}`;
                        }}
                      />
                      <Bar
                        dataKey="average"
                        fill="#3B82F6"
                        maxBarSize={40}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleBarClick}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
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
            .map((result, index) => {
              // Extract board level from event_name
              const boardMatch = result.event_name.match(
                /(1m|3m|5m|10m|platform)/i
              );
              const board = boardMatch
                ? boardMatch[0].toLowerCase()
                : "unknown";

              return (
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
                              <p className="font-medium text-sm">{dive.code}</p>
                              <p className="text-xs text-gray-600 mb-1">
                                {dive.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                DD: {dive.difficulty}
                              </p>
                              <p className="text-xs text-gray-500">
                                Board: {board}
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
              );
            })}
        </div>
      </div>
    </>
  );
};
