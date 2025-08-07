import React from "react";
import Papa from "papaparse";
import type { DiveData, DiveEntry } from "../../types/index";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { DRILL_TYPE_MAP } from "./utils";
import getPresignedUrl from "../../services/getPresignedUrl";

interface ConfirmedLogModalProps {
  isOpen: boolean;
  log:
    | {
        url?: string;
        diverName: string;
        date: string;
        totalDives: number;
        balks: number;
        extractedData?: DiveData;
        session_date?: string;
        createdAt?: string;
        updatedAt?: string;
      }
    | undefined;
  currentLogIndex: number;
  totalLogs: number;
  onClose: () => void;
  mode?: "training" | "competition";
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  capAtTen?: boolean;
}

const ConfirmedLogModal: React.FC<ConfirmedLogModalProps> = ({
  isOpen,
  log,
  currentLogIndex,
  totalLogs,
  onClose,
  mode = "training",
  onPrev,
  onNext,
  canPrev = false,
  canNext = false,
  capAtTen = false,
}) => {
  const [resolvedUrl, setResolvedUrl] = React.useState<string | undefined>(
    (log as any)?.url
  );

  React.useEffect(() => {
    let cancelled = false;
    async function resolveUrl() {
      if (!isOpen || !log) return;
      // If url already present, use it
      const existing = (log as any).url as string | undefined;
      if (existing) {
        setResolvedUrl(existing);
        return;
      }
      // Try to resolve via s3Key or s3Url
      try {
        let signed: string | null = null;
        if ((log as any).s3Key) {
          signed = await getPresignedUrl((log as any).s3Key as string);
        } else if ((log as any).s3Url) {
          const raw = (log as any).s3Url as string;
          try {
            const u = new URL(raw);
            const key = u.pathname.startsWith("/")
              ? u.pathname.slice(1)
              : u.pathname;
            signed = await getPresignedUrl(key);
          } catch {
            signed = await getPresignedUrl(String(raw || ""));
          }
        }
        if (!cancelled) setResolvedUrl(signed ?? undefined);
      } catch {
        if (!cancelled) setResolvedUrl(undefined);
      }
    }
    resolveUrl();
    return () => {
      cancelled = true;
    };
  }, [isOpen, log]);

  if (!isOpen || !log) return null;
  const extracted = log.extractedData || {
    Name: log.diverName,
    Balks: log.balks,
    Dives: [],
    comment: "",
    rating: undefined,
  };

  const getSessionDate = () => {
    let sessionDate = "";
    if (log && (log as any).session_date) {
      sessionDate = (log as any).session_date;
    }
    if (sessionDate) {
      const [year, month, day] = sessionDate.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        sessionDate = d.toLocaleDateString();
      }
    }
    return sessionDate;
  };
  const sessionDate = getSessionDate();

  const getBalks = () => {
    if (typeof log.balks === "number") return log.balks;
    if (extracted && typeof (extracted as any).balks === "number")
      return (extracted as any).balks;
    if (extracted && typeof (extracted as any).Balks === "number")
      return (extracted as any).Balks;
    return 0;
  };
  const balks = getBalks();

  const downloadCSV = () => {
    const name = extracted.Name || "";
    const comment = extracted.comment || "";
    const rating = extracted.rating || "";
    let sessionDate = "";
    if (log && (log as any).session_date)
      sessionDate = (log as any).session_date;
    else if (log && (log as any).createdAt)
      sessionDate = (log as any).createdAt;
    else if (log && (log as any).updatedAt)
      sessionDate = (log as any).updatedAt;
    else if (log && (log as any).date) sessionDate = (log as any).date;
    else sessionDate = "";
    if (sessionDate) {
      const d = new Date(sessionDate);
      if (!isNaN(d.getTime())) sessionDate = d.toISOString().slice(0, 10);
    }
    const csvData = (extracted.Dives || []).map((dive: DiveEntry) => {
      let successRate: any = dive.Success;
      if (typeof successRate === "string" && successRate.includes("/")) {
        const [num, den] = successRate
          .split("/")
          .map((s) => parseFloat(s.trim()));
        if (!isNaN(num) && !isNaN(den) && den > 0) {
          successRate = Math.round((num / den) * 100) + "%";
        }
      }
      let balksValue = 0;
      if (
        "balks" in extracted &&
        typeof (extracted as any).balks === "number"
      ) {
        balksValue = (extracted as any).balks;
      } else if (
        "Balks" in extracted &&
        typeof (extracted as any).Balks === "number"
      ) {
        balksValue = (extracted as any).Balks;
      }
      return {
        "Diver Name": name,
        "Session Date": sessionDate,
        "Log Rating": rating,
        Balks: balksValue,
        Comment: comment,
        "Dive Code": dive.DiveCode,
        "Drill Type": dive.DrillType,
        Board: dive.Board,
        "Success Rate": successRate,
      };
    });
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${extracted.Name}_dives_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const headerTotal = capAtTen ? Math.min(totalLogs || 0, 10) : totalLogs;
  const headerIndex = capAtTen
    ? Math.min(currentLogIndex + 1, headerTotal)
    : currentLogIndex + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden max-h-[94vh]">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 md:border-b bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                mode === "competition"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {mode === "competition" ? "Competition" : "Training"}
            </span>
            <span className="text-sm font-semibold text-gray-500">
              Image {headerIndex} of {headerTotal}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => canPrev && onPrev && onPrev()}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border text-gray-600 ${
                  canPrev
                    ? "bg-white border-gray-300 hover:bg-gray-50"
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                aria-label="Previous log"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => canNext && onNext && onNext()}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border text-gray-600 ${
                  canNext
                    ? "bg-white border-gray-300 hover:bg-gray-50"
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                aria-label="Next log"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Close"
              onClick={onClose}
              className="ml-1 inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Scrollable content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(94vh-64px)] pb-24 md:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Image */}
            <div className="space-y-4">
              <div className="border rounded-xl overflow-hidden bg-gray-100 shadow-inner flex items-center justify-center h-[28rem]">
                {resolvedUrl ? (
                  <img
                    src={resolvedUrl}
                    alt={`${
                      mode === "competition" ? "Competition" : "Training"
                    } sheet`}
                    className="max-h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-400">
                      <svg
                        className="w-16 h-16 mx-auto mb-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-sm font-medium">No Image Available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Details */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {mode === "competition"
                    ? "Competition Details"
                    : "Training Details"}
                </h3>
              </div>
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <label className="block font-medium text-gray-700">
                    Diver Name
                  </label>
                  <div className="flex items-center gap-1 font-semibold text-base text-gray-900">
                    {extracted.Name || ""}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block font-medium text-gray-700">
                    Session Date
                  </label>
                  <div className="font-semibold text-base text-gray-900">
                    {sessionDate || ""}
                  </div>
                </div>
                {mode === "training" && (
                  <>
                    <div className="space-y-2">
                      <label className="block font-medium text-gray-700">
                        Log Rating
                      </label>
                      {extracted.rating ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block w-4 h-4 rounded-full ${
                              extracted.rating === "green"
                                ? "bg-green-500"
                                : extracted.rating === "yellow"
                                ? "bg-yellow-400"
                                : "bg-red-500"
                            }`}
                          ></span>
                          <span className="font-semibold">
                            {extracted.rating.charAt(0).toUpperCase() +
                              extracted.rating.slice(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-base text-gray-900"></span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="block font-medium text-gray-700">
                        Balks
                      </label>
                      <div className="font-semibold text-base text-gray-900">
                        {balks}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {mode === "training" && (
                <div className="space-y-2">
                  <label className="block font-medium text-gray-700">
                    Comment
                  </label>
                  <div className="bg-gray-50 rounded p-3 min-h-[60px] text-gray-700 whitespace-pre-line">
                    {extracted.comment || (
                      <span className="text-gray-400">No comment</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">
                Dives ({extracted.Dives.length})
              </h4>
              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white shadow hover:bg-green-700 transition-colors text-xs font-medium"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </button>
            </div>
            <div className="md:max-h-96 overflow-y-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  {mode === "competition" ? (
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Drill Type
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Dive Code
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Board
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Degree of Difficulty
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Success Rate
                      </th>
                    </tr>
                  ) : (
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Dive Code
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Board
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Drill Type
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Success Rate
                      </th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {extracted.Dives.map((dive: DiveEntry, idx: number) =>
                    mode === "competition" ? (
                      <tr key={idx} className="hover:bg-gray-50 relative">
                        <td
                          className="border border-gray-300 px-3 py-2 text-sm font-semibold"
                          title={
                            DRILL_TYPE_MAP[dive.DrillType] || dive.DrillType
                          }
                        >
                          {dive.DrillType}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                          {dive.DiveCode}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                          {dive.Board}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                          {(dive as any).DegreeOfDifficulty ||
                            (dive as any).difficulty ||
                            ""}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold text-green-600">
                          {dive.Success}
                        </td>
                      </tr>
                    ) : (
                      <tr key={idx} className="hover:bg-gray-50 relative">
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                          {dive.DiveCode}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                          {dive.Board}
                        </td>
                        <td
                          className="border border-gray-300 px-3 py-2 text-sm font-semibold"
                          title={
                            DRILL_TYPE_MAP[dive.DrillType] || dive.DrillType
                          }
                        >
                          {dive.DrillType}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold text-green-600">
                          {dive.Success}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmedLogModal;
