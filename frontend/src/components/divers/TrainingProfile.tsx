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
import getTrainingDataByStatus from "../../services/getTrainingDataByStatus";
import { ConfirmedLogModal } from "../divelog/DiveLogModal";
import { PITT_DIVERS } from "../../constants/pittDivers";
import getPresignedUrl from "../../services/getPresignedUrl";
import ConfirmedLogCard from "../common/ConfirmedLogCard";

// Copy of mapApiToConfirmedLog from DiveLog
function mapApiToConfirmedLog(item: any) {
  let extractedData = {
    Name: item.diver_name || "",
    Dives: [],
    comment: "",
    rating: undefined,
  };
  if (item.json_output) {
    try {
      const parsed =
        typeof item.json_output === "string"
          ? JSON.parse(item.json_output)
          : item.json_output;
      let dives = parsed.dives || [];
      if (typeof dives === "string") {
        try {
          dives = JSON.parse(dives);
        } catch (e) {
          dives = [];
        }
      }
      extractedData = {
        Name: parsed.Name || parsed.diver_info?.name || item.diver_name || "",
        Dives: parsed.Dives ?? parsed.dives ?? [],
        comment: parsed.comment || item.comment || "",
        rating: parsed.rating || item.rating || undefined,
      };
    } catch (e) {}
  }
  return {
    id: item.id,
    diverName: extractedData.Name,
    date: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "",
    totalDives: extractedData.Dives?.length || 0,
    balks: 0,
    fileName: item.s3_key || item.s3_url || item.id,
    s3Key: item.s3_key,
    s3Url: item.s3_url,
    extractedData,
  };
}

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
  const [confirmedLogs, setConfirmedLogs] = React.useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(true);
  const [logsError, setLogsError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedLogIndex, setSelectedLogIndex] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;
    setLoadingLogs(true);
    setLogsError(null);
    (async () => {
      try {
        // Fetch all confirmed logs using the raw API call
        const result = await getTrainingDataByStatus("CONFIRMED");
        const mapped = (result.data || []).map(mapApiToConfirmedLog);
        // Find diver by id or name in PITT_DIVERS
        const diverObj = PITT_DIVERS.find(
          (d) =>
            d.name === diverWithTraining.name ||
            d.id === (diverWithTraining as any).id
        );
        // Filter logs for this diver
        let filtered = mapped.filter((log: any) => {
          if (diverObj && log.extractedData?.Name) {
            return (
              log.extractedData.Name.trim().toLowerCase() ===
              diverObj.name.trim().toLowerCase()
            );
          }
          return false;
        });
        // For each filtered log, resolve the S3 image URL
        filtered = await Promise.all(
          filtered.map(async (log: any) => {
            let url = undefined;
            if (log.s3Key) {
              url = await getPresignedUrl(log.s3Key);
            } else if (log.s3Url) {
              try {
                const key = log.s3Url.startsWith("http")
                  ? new URL(log.s3Url).pathname.slice(1)
                  : log.s3Url;
                url = await getPresignedUrl(key);
              } catch {}
            }
            return { ...log, url };
          })
        );
        // Sort logs by date descending (most recent first)
        filtered.sort((a: any, b: any) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });
        if (isMounted) {
          setConfirmedLogs(filtered);
          setLoadingLogs(false);
        }
      } catch (err) {
        if (isMounted) {
          setLogsError("Failed to load confirmed training logs");
          setLoadingLogs(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [diverWithTraining.name, (diverWithTraining as any).id]);

  return (
    <div className="space-y-6">
      {/* Training Calendar and Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training Calendar */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
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
        {/* Stat Cards */}
        <div className="flex flex-col gap-6">
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
      </div>

      {/* Confirmed Training Logs Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Confirmed Training Logs
        </h3>
        {loadingLogs ? (
          <div className="text-gray-500">Loading logs...</div>
        ) : logsError ? (
          <div className="text-red-500">{logsError}</div>
        ) : confirmedLogs.length === 0 ? (
          <div className="text-gray-500">No confirmed logs for this diver.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {confirmedLogs.map((log, idx) => (
              <ConfirmedLogCard
                key={log.id || idx}
                log={log}
                onClick={() => {
                  setSelectedLogIndex(idx);
                  setModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
        {/* Modal for confirmed log with navigation */}
        <ConfirmedLogModal
          isOpen={modalOpen && confirmedLogs.length > 0}
          log={
            confirmedLogs[selectedLogIndex]
              ? {
                  ...confirmedLogs[selectedLogIndex],
                  url: confirmedLogs[selectedLogIndex].url,
                }
              : undefined
          }
          currentLogIndex={selectedLogIndex}
          totalLogs={confirmedLogs.length}
          onClose={() => setModalOpen(false)}
        />
        {modalOpen && confirmedLogs.length > 0 && (
          <div className="flex justify-between mt-4">
            <button
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
              onClick={() => setSelectedLogIndex((i) => Math.max(0, i - 1))}
              disabled={selectedLogIndex === 0}
            >
              Previous
            </button>
            <button
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
              onClick={() =>
                setSelectedLogIndex((i) =>
                  Math.min(confirmedLogs.length - 1, i + 1)
                )
              }
              disabled={selectedLogIndex === confirmedLogs.length - 1}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
