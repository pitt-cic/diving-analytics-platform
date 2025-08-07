import React from "react";
import { StatCard } from "./StatCard";
import {
  CalendarIcon,
  ChartBarIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import getTrainingDataByStatus from "../../services/getTrainingDataByStatus";
import { ConfirmedLogModal } from "../divelog";
import { PITT_DIVERS } from "../../constants/pittDivers";
import ConfirmedLogCard from "../common/ConfirmedLogCard";
import TrainingCalendar from "./TrainingCalendar";
import { mapApiToConfirmedLog as mapApiToConfirmedLogService } from "../../services/dataFormatters";

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
    date: item.session_date
      ? (() => {
          // Parse YYYY-MM-DD format explicitly to avoid timezone issues
          const [year, month, day] = item.session_date.split("-").map(Number);
          return new Date(year, month - 1, day).toLocaleDateString();
        })()
      : item.updated_at
      ? new Date(item.updated_at).toLocaleDateString()
      : "",
    totalDives: extractedData.Dives?.length || 0,
    balks: 0,
    fileName: item.s3_key || item.s3_url || item.id,
    s3Key: item.s3_key,
    s3Url: item.s3_url,
    session_date: item.session_date || undefined,
    createdAt: item.created_at || undefined,
    updatedAt: item.updated_at || undefined,
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

  // Competition logs state
  const [competitionLogs, setCompetitionLogs] = React.useState<any[]>([]);
  const [loadingCompetition, setLoadingCompetition] = React.useState(true);
  const [competitionError, setCompetitionError] = React.useState<string | null>(
    null
  );
  const [competitionModalOpen, setCompetitionModalOpen] = React.useState(false);
  const [selectedCompetitionIndex, setSelectedCompetitionIndex] =
    React.useState(0);

  // Progressive reveal controls
  const INITIAL_VISIBLE = 6;
  const VISIBLE_INCREMENT = 6;
  const [trainingVisibleCount, setTrainingVisibleCount] =
    React.useState(INITIAL_VISIBLE);
  const [competitionVisibleCount, setCompetitionVisibleCount] =
    React.useState(INITIAL_VISIBLE);

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
        // Use shared mapper that sets isCompetition
        const mapped = (result.data || []).map(mapApiToConfirmedLogService);
        // Find diver by id or name in PITT_DIVERS
        const diverObj = PITT_DIVERS.find(
          (d) => d.name === diverName || d.id === diverId
        );
        // Filter logs for this diver and exclude competition logs for training list
        let filtered = mapped.filter((log: any) => {
          const matchesDiver =
            diverObj && log.extractedData?.Name
              ? log.extractedData.Name.trim().toLowerCase() ===
                diverObj.name.trim().toLowerCase()
              : false;
          const isCompetition = log.isCompetition === true;
          return matchesDiver && !isCompetition;
        });
        // Do not resolve S3 URLs up front; defer to lazy-load in card
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

  // Reset visible counts when diver changes
  React.useEffect(() => {
    setTrainingVisibleCount(INITIAL_VISIBLE);
    setCompetitionVisibleCount(INITIAL_VISIBLE);
  }, [diverName, diverId]);

  // Fetch confirmed competition logs for this diver
  React.useEffect(() => {
    let isMounted = true;
    setLoadingCompetition(true);
    setCompetitionError(null);
    (async () => {
      try {
        const result = await getTrainingDataByStatus("CONFIRMED");
        const mapped = (result.data || []).map(mapApiToConfirmedLogService);
        // Find diver by id or name in PITT_DIVERS
        const diverObj = PITT_DIVERS.find(
          (d) => d.name === diverName || d.id === diverId
        );
        // Filter logs for this diver and competition only
        let filtered = mapped.filter((log: any) => {
          const matchesDiver =
            diverObj && log.extractedData?.Name
              ? log.extractedData.Name.trim().toLowerCase() ===
                diverObj.name.trim().toLowerCase()
              : false;
          const isCompetition = log.isCompetition === true;
          return matchesDiver && isCompetition;
        });

        // Do not resolve S3 URLs up front; defer to lazy-load in card

        // Sort by date desc
        filtered.sort((a: any, b: any) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });

        if (isMounted) {
          setCompetitionLogs(filtered);
          setLoadingCompetition(false);
        }
      } catch (err) {
        if (isMounted) {
          setCompetitionError("Failed to load confirmed competition logs");
          setLoadingCompetition(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [diverName, diverId]);

  // Calculate high-level counts
  const totalSessions = confirmedLogs.length;
  const totalDives = confirmedLogs.reduce(
    (sum, log) => sum + (log.totalDives || 0),
    0
  );

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
            value={totalSessions}
            icon={<CalendarIcon className="h-6 w-6 text-blue-500" />}
          />
          <StatCard
            title="Total Training Dives"
            value={totalDives}
            icon={<ChartBarIcon className="h-6 w-6 text-green-500" />}
          />
          <StatCard
            title="Competition Sheets"
            value={competitionLogs.length}
            icon={<TrophyIcon className="h-6 w-6 text-yellow-500" />}
          />
        </div>
      </div>

      {/* Confirmed Training Logs Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Training Logs
        </h3>
        {loadingLogs ? (
          <div className="text-gray-500">Loading logs...</div>
        ) : logsError ? (
          <div className="text-red-500">{logsError}</div>
        ) : confirmedLogs.length === 0 ? (
          <div className="text-gray-500">No confirmed logs for this diver.</div>
        ) : (
          <>
            <div
              className={
                trainingVisibleCount > INITIAL_VISIBLE
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1"
                  : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
              }
            >
              {confirmedLogs.slice(0, trainingVisibleCount).map((log, idx) => (
                <ConfirmedLogCard
                  key={log.id || idx}
                  log={log}
                  onClick={() => {
                    setSelectedLogIndex(idx);
                    setModalOpen(true);
                  }}
                  subtitleMode="dives"
                />
              ))}
            </div>
            <div className="mt-4 flex justify-center gap-3">
              {confirmedLogs.length > trainingVisibleCount && (
                <button
                  onClick={() =>
                    setTrainingVisibleCount((prev) => prev + VISIBLE_INCREMENT)
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  See more
                </button>
              )}
              {trainingVisibleCount > INITIAL_VISIBLE && (
                <button
                  onClick={() => setTrainingVisibleCount(INITIAL_VISIBLE)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  See less
                </button>
              )}
            </div>
          </>
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
          mode="training"
          onPrev={() => setSelectedLogIndex((prev) => Math.max(0, prev - 1))}
          onNext={() =>
            setSelectedLogIndex((prev) =>
              Math.min(Math.min(confirmedLogs.length, 10) - 1, prev + 1)
            )
          }
          canPrev={selectedLogIndex > 0}
          canNext={selectedLogIndex < Math.min(confirmedLogs.length, 10) - 1}
          capAtTen={confirmedLogs.length > 10}
        />
      </div>

      {/* Competition Logs Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Competition Logs
        </h3>
        {loadingCompetition ? (
          <div className="text-gray-500">Loading logs...</div>
        ) : competitionError ? (
          <div className="text-red-500">{competitionError}</div>
        ) : competitionLogs.length === 0 ? (
          <div className="text-gray-500">
            No competition logs for this diver.
          </div>
        ) : (
          <>
            <div
              className={
                competitionVisibleCount > INITIAL_VISIBLE
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1"
                  : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
              }
            >
              {competitionLogs
                .slice(0, competitionVisibleCount)
                .map((log, idx) => (
                  <ConfirmedLogCard
                    key={log.id || idx}
                    log={log}
                    onClick={() => {
                      setSelectedCompetitionIndex(idx);
                      setCompetitionModalOpen(true);
                    }}
                    subtitleMode="dives"
                  />
                ))}
            </div>
            <div className="mt-4 flex justify-center gap-3">
              {competitionLogs.length > competitionVisibleCount && (
                <button
                  onClick={() =>
                    setCompetitionVisibleCount(
                      (prev) => prev + VISIBLE_INCREMENT
                    )
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  See more
                </button>
              )}
              {competitionVisibleCount > INITIAL_VISIBLE && (
                <button
                  onClick={() => setCompetitionVisibleCount(INITIAL_VISIBLE)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  See less
                </button>
              )}
            </div>
          </>
        )}
        {/* Modal for confirmed competition log */}
        <ConfirmedLogModal
          isOpen={competitionModalOpen && competitionLogs.length > 0}
          log={
            competitionLogs[selectedCompetitionIndex]
              ? {
                  ...competitionLogs[selectedCompetitionIndex],
                  url: competitionLogs[selectedCompetitionIndex].url,
                }
              : undefined
          }
          currentLogIndex={selectedCompetitionIndex}
          totalLogs={competitionLogs.length}
          onClose={() => setCompetitionModalOpen(false)}
          mode="competition"
          onPrev={() =>
            setSelectedCompetitionIndex((prev) => Math.max(0, prev - 1))
          }
          onNext={() =>
            setSelectedCompetitionIndex((prev) =>
              Math.min(Math.min(competitionLogs.length, 10) - 1, prev + 1)
            )
          }
          canPrev={selectedCompetitionIndex > 0}
          canNext={
            selectedCompetitionIndex < Math.min(competitionLogs.length, 10) - 1
          }
          capAtTen={competitionLogs.length > 10}
        />
      </div>
    </div>
  );
};
