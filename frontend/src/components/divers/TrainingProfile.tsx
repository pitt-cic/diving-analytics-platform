import React from "react";
import { StatCard } from "./StatCard";
import {
  CalendarIcon,
  ChartBarIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import getTrainingDataByStatus from "../../services/getTrainingDataByStatus";
import { ConfirmedLogModal } from "../divelog/DiveLogModal";
import { PITT_DIVERS } from "../../constants/pittDivers";
import getPresignedUrl from "../../services/getPresignedUrl";
import ConfirmedLogCard from "../common/ConfirmedLogCard";
import TrainingCalendar from "./TrainingCalendar";

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

  // Extract diverName and diverId for useEffect dependencies
  const diverName = diverWithTraining.name;
  const diverId = (diverWithTraining as any).id;

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
          (d) => d.name === diverName || d.id === diverId
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
  }, [diverName, diverId]);

  // Calculate trainingStats from confirmedLogs (real backend data only)
  const totalSessions = confirmedLogs.length;
  const totalDives = confirmedLogs.reduce(
    (sum, log) => sum + (log.totalDives || 0),
    0
  );
  // Try to get a successRate from each log, fallback to 0 if not available
  const logSuccessRates = confirmedLogs
    .map((log) => {
      // Try to get a numeric successRate from extractedData if present
      if (
        log.extractedData &&
        typeof log.extractedData.successRate === "number"
      ) {
        return log.extractedData.successRate;
      }
      // Try to calculate from Dives if possible
      if (
        log.extractedData &&
        Array.isArray(log.extractedData.Dives) &&
        log.extractedData.Dives.length > 0
      ) {
        const dives = log.extractedData.Dives;
        let total = 0,
          count = 0;
        dives.forEach((dive: any) => {
          if (typeof dive.Success === "string" && dive.Success.includes("/")) {
            const [num, den] = dive.Success.split("/").map(Number);
            if (!isNaN(num) && !isNaN(den) && den > 0) {
              total += num / den;
              count++;
            }
          }
        });
        if (count > 0) {
          return Math.round((total / count) * 100);
        }
      }
      return 0;
    })
    .filter((val) => typeof val === "number" && !isNaN(val));
  const successRate =
    logSuccessRates.length > 0
      ? Math.round(
          logSuccessRates.reduce((a, b) => a + b, 0) / logSuccessRates.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Training Calendar and Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training Calendar */}
        <TrainingCalendar
          logs={confirmedLogs}
          monthDays={monthDays}
          firstWeekday={firstWeekday}
          monthName={monthName}
          goToPrevMonth={goToPrevMonth}
          goToNextMonth={goToNextMonth}
          onLogClick={(logIdx: number) => {
            setSelectedLogIndex(logIdx);
            setModalOpen(true);
          }}
          heightClass="h-[400px] lg:h-full"
          today={today}
        />
        {/* Stat Cards */}
        <div className="flex flex-col gap-6">
          <StatCard
            title="Training Sessions"
            value={totalSessions > 0 ? totalSessions : "No data"}
            icon={<CalendarIcon className="h-6 w-6 text-blue-500" />}
          />
          <StatCard
            title="Total Training Dives"
            value={totalDives > 0 ? totalDives : "No data"}
            icon={<ChartBarIcon className="h-6 w-6 text-green-500" />}
          />
          <StatCard
            title="Success Rate"
            value={successRate > 0 ? `${successRate}%` : "No data"}
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
      </div>
    </div>
  );
};
