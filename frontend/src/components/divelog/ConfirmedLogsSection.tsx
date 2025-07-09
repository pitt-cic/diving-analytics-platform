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
}

interface ConfirmedLogsSectionProps {
  confirmedLogs: ConfirmedLog[];
}

export const ConfirmedLogsSection: React.FC<ConfirmedLogsSectionProps> = ({
  confirmedLogs,
}) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-2">
      Recently Confirmed Logs
    </h3>
    {confirmedLogs.length > 0 ? (
      <div className="flex flex-col gap-3">
        {confirmedLogs.map((log) => (
          <div key={log.id} className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-base text-blue-900">
                {log.diverName}
              </h3>
              <FileImage className="h-4 w-4 text-gray-400" />
            </div>
            <div className="space-y-0.5 text-xs text-gray-600">
              <div>Date: {log.date}</div>
              <div>Dives: {log.totalDives}</div>
              <div>Balks: {log.balks}</div>
              <div className="truncate" title={log.fileName}>
                File: {log.fileName}
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-gray-400 text-sm">No confirmed logs</div>
    )}
  </div>
);
