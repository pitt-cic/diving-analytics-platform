import React from "react";
import { FileImage } from "lucide-react";

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
          <button
            key={log.id}
            className={`w-32 h-32 bg-gray-100 rounded-lg border-2 ${
              idx === currentConfirmedIndex
                ? "border-blue-500"
                : "border-gray-200"
            } flex flex-col items-center justify-center focus:outline-none flex-shrink-0`}
            onClick={() => onOpenModal(idx)}
          >
            {log.url && (
              <img
                src={log.url}
                alt="confirmed"
                className="w-28 h-28 object-contain"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </button>
        ))}
      </div>
    ) : (
      <div className="text-gray-400 text-sm">No confirmed logs</div>
    )}
  </div>
);
