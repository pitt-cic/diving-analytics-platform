import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Diver } from "../../types";
import { StatCard } from "./StatCard";
import {
  UserIcon,
  ChartBarIcon,
  TrophyIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

interface TeamOverviewProps {
  divers: Diver[];
}

export const TeamOverview: React.FC<TeamOverviewProps> = ({ divers }) => {
  const teamStats = useMemo(() => {
    const allDives = divers.flatMap((diver) =>
      diver.results.flatMap((result) => result.dives)
    );

    return {
      totalDivers: divers.length,
      totalDives: allDives.length,
      averageScore:
        allDives.length > 0
          ? (
              allDives.reduce((sum, dive) => sum + dive.award, 0) /
              allDives.length
            ).toFixed(1)
          : "0",
      totalCompetitions: new Set(
        divers.flatMap((diver) =>
          diver.results.map((result) => result.meet_name)
        )
      ).size,
    };
  }, [divers]);

  const performanceData = useMemo(() => {
    const monthlyData: {
      [month: string]: { total: number; count: number };
    } = {};

    divers.forEach((diver) => {
      diver.results.forEach((result) => {
        const rawDate = result.start_date || result.date || result.end_date;
        if (rawDate) {
          const month = new Date(rawDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          });
          if (!monthlyData[month]) {
            monthlyData[month] = { total: 0, count: 0 };
          }
          result.dives.forEach((dive) => {
            monthlyData[month].total += dive.award;
            monthlyData[month].count += 1;
          });
        }
      });
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        average: data.count > 0 ? (data.total / data.count).toFixed(1) : "0",
      }))
      .sort(
        (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
      );
  }, [divers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Overview</h1>
        <p className="text-gray-600 mt-2">
          Complete diving team performance analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Divers"
          value={teamStats.totalDivers}
          icon={<UserIcon className="h-6 w-6 text-blue-500" />}
        />
        <StatCard
          title="Total Dives"
          value={teamStats.totalDives}
          icon={<ChartBarIcon className="h-6 w-6 text-green-500" />}
        />
        <StatCard
          title="Average Score"
          value={teamStats.averageScore}
          icon={<TrophyIcon className="h-6 w-6 text-yellow-500" />}
        />
        <StatCard
          title="Competitions"
          value={teamStats.totalCompetitions}
          icon={<CalendarIcon className="h-6 w-6 text-purple-500" />}
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Team Performance Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={performanceData.map((item) => ({
              ...item,
              average:
                item.average === null ||
                item.average === undefined ||
                item.average === "0"
                  ? null
                  : Number(item.average),
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.getFullYear().toString();
              }}
            />
            <YAxis
              domain={["dataMin - 5", "dataMax + 5"]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => [
                typeof value === "number" ? value.toFixed(1) : "N/A",
                "Performance Score",
              ]}
              labelFormatter={(label) => {
                const date = new Date(label);
                return date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                });
              }}
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: "#3B82F6", strokeWidth: 0, r: 3 }}
              connectNulls={true}
              activeDot={{ r: 5, stroke: "#3B82F6", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Divers Overview
        </h3>
        <div className="space-y-4">
          {divers.map((diver) => {
            const diverStats = {
              totalDives: diver.results.flatMap((r) => r.dives).length,
              avgScore: diver.results
                .flatMap((r) => r.dives)
                .reduce((sum, dive, _, arr) => sum + dive.award / arr.length, 0)
                .toFixed(1),
              competitions: diver.results.length,
            };

            return (
              <Link
                key={diver.id}
                to={`/divers/${diver.name.toLowerCase().replace(/\s+/g, "-")}`}
                className="block group transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:scale-95"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 bg-white rounded-lg border border-gray-200 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all duration-200 cursor-pointer touch-manipulation">
                  <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                    <div
                      className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center text-sm font-bold transition-transform duration-200 group-hover:scale-110 flex-shrink-0 ${
                        diver.gender === "M"
                          ? "bg-blue-500 text-white group-hover:bg-blue-600"
                          : "bg-pink-500 text-white group-hover:bg-pink-600"
                      }`}
                    >
                      {diver.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 text-base sm:text-lg truncate">
                        {diver.name}
                      </h4>
                      <p className="text-sm text-gray-500 group-hover:text-blue-600 transition-colors duration-200 truncate">
                        {diver.city_state} • Age {diver.age}
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto">
                    <div className="grid grid-cols-3 gap-4 sm:flex sm:space-x-6 sm:gap-0 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-sm sm:text-xl text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                          {diverStats.totalDives}
                        </p>
                        <p className="text-gray-500 group-hover:text-blue-600 transition-colors duration-200 text-xs uppercase tracking-wide">
                          Dives
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm sm:text-xl text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                          {diverStats.avgScore}
                        </p>
                        <p className="text-gray-500 group-hover:text-blue-600 transition-colors duration-200 text-xs uppercase tracking-wide">
                          Avg Score
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm sm:text-xl text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                          {diverStats.competitions}
                        </p>
                        <p className="text-gray-500 group-hover:text-blue-600 transition-colors duration-200 text-xs uppercase tracking-wide">
                          Competitions
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
