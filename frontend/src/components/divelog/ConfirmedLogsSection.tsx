import React from "react";
import ConfirmedLogCard from "../common/ConfirmedLogCard";

interface ConfirmedLog {
  id: string;
  diverName: string;
  date: string;
  totalDives: number;
  balks: number;
  fileName: string;
  s3Key?: string;
  s3Url?: string;
  url?: string; // Add url for image display
}

interface ConfirmedLogsSectionProps {
  confirmedLogs: ConfirmedLog[];
  currentConfirmedIndex: number;
  onOpenModal: (idx: number) => void;
}

export const ConfirmedLogsSection: React.FC<ConfirmedLogsSectionProps> = ({
  confirmedLogs,
  currentConfirmedIndex,
  onOpenModal,
}) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-2">
      Recently Confirmed Logs
    </h3>
    {confirmedLogs.length > 0 ? (
      <div className="flex gap-4 flex-nowrap overflow-x-auto pb-2">
        {confirmedLogs.map((log, idx) => (
          <div key={log.id} className="w-40 min-w-[10rem] flex-shrink-0">
            <ConfirmedLogCard
              log={log}
              onClick={() => onOpenModal(idx)}
              subtitleMode="diver"
            />
          </div>
        ))}
      </div>
    ) : (
      <div className="text-gray-400 text-sm">No confirmed logs</div>
    )}
  </div>
);
