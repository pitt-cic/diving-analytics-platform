import React, { useCallback } from "react";
import {
  X,
  Edit2,
  Check,
  AlertTriangle,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PITT_DIVERS } from "../../constants/pittDivers";
import Papa from "papaparse";
import type { DiveEntry, DiveData } from "../../types/index";
import { UserIcon } from "@heroicons/react/24/outline";
import CompetitionTable from "./CompetitionTable";
import CSVTable from "./CSVTable";
import { validateDives } from "./utils";

interface ImageData {
  id: string;
  file: File | undefined;
  url: string;
  extractedData: DiveData;
  isEditing: boolean;
  s3Key?: string;
  s3Url?: string;
  uploadStatus?: "pending" | "uploading" | "success" | "error";
  uploadError?: string;
  session_date?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DiveLogModalProps {
  isOpen: boolean;
  image: ImageData | undefined;
  currentImageIndex: number;
  totalImages: number;
  onClose: () => void;
  onEditToggle: () => void;
  onSave: () => void;
  onAccept: () => void;
  onDelete: () => void;
  onDataEdit: (
    field: string,
    value: any,
    diveIndex?: number,
    repIndex?: number
  ) => void;
  onTableDataChange: (newData: DiveEntry[]) => void;
  isNameValid: boolean;
  nameError: string;
  strictValidation?: boolean;
  mode?: "training" | "competition";
  onPrevImage?: () => void;
  onNextImage?: () => void;
}

function BalksInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [localBalks, setLocalBalks] = React.useState(String(value ?? 0));
  React.useEffect(() => {
    setLocalBalks(String(value ?? 0));
  }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={localBalks}
      onChange={(e) => {
        const val = e.target.value;
        if (/^\d*$/.test(val)) {
          setLocalBalks(val);
          if (val !== "") {
            onChange(Number(val));
          }
        }
      }}
      onBlur={(e) => {
        if (e.target.value === "") {
          setLocalBalks("0");
          onChange(0);
        }
      }}
      className="w-24 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

const DiveLogModal: React.FC<DiveLogModalProps> = ({
  isOpen,
  image,
  currentImageIndex,
  totalImages,
  onClose,
  onEditToggle,
  onSave,
  onAccept,
  onDelete,
  onDataEdit,
  onTableDataChange,
  isNameValid,
  nameError,
  strictValidation = true,
  mode = "training",
  onPrevImage,
  onNextImage,
}) => {
  // Memoize the table data change handler (must be before any return)
  const stableTableDataChange = useCallback(
    (newData: DiveEntry[]) => {
      onTableDataChange(newData);
    },
    [onTableDataChange]
  );

  if (!isOpen || !image) return null;
  const currentImage = image;

  const divesValid = strictValidation
    ? validateDives(currentImage.extractedData.Dives)
    : (currentImage.extractedData?.Dives || []).length > 0;

  // Download CSV function
  const downloadCSV = () => {
    const name = currentImage.extractedData.Name || "";
    const comment = currentImage.extractedData.comment || "";
    const rating = currentImage.extractedData.rating || "";
    const sessionDate = getUploadedDate();
    const csvData = currentImage.extractedData.Dives.map((dive) => {
      let successRate = dive.Success;
      if (typeof successRate === "string" && successRate.includes("/")) {
        const [num, den] = successRate
          .split("/")
          .map((s) => parseFloat(s.trim()));
        if (!isNaN(num) && !isNaN(den) && den > 0) {
          successRate = Math.round((num / den) * 100) + "%";
        }
      }
      return {
        "Diver Name": name,
        "Session Date": sessionDate,
        "Log Rating": rating,
        Balks: currentImage.extractedData.balks ?? 0,
        Comment: comment,
        "Dive Code": dive.DiveCode,
        "Drill Type": dive.DrillType,
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
      `${currentImage.extractedData.Name}_dives_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isRatingValid = strictValidation
    ? !!currentImage?.extractedData?.rating
    : true;

  // Helper to get today's date in yyyy-mm-dd
  const getToday = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };
  // Helper to get the uploaded date in yyyy-mm-dd
  const getUploadedDate = () => {
    // 1. Use session_date if set
    if (currentImage.session_date) {
      // Parse YYYY-MM-DD format explicitly to avoid timezone issues
      const [year, month, day] = currentImage.session_date
        .split("-")
        .map(Number);
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
      return currentImage.session_date;
    }
    // 2. Use createdAt if available
    if (currentImage.createdAt) {
      const d = new Date(currentImage.createdAt);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    }
    // 3. Use updatedAt if available
    if (currentImage.updatedAt) {
      const d = new Date(currentImage.updatedAt);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    }
    // 4. Try to extract from image.id if it looks like a timestamp
    if (currentImage.id && /^\d{13}/.test(currentImage.id)) {
      const ts = parseInt(currentImage.id.split("-")[0], 10);
      if (!isNaN(ts)) {
        const d = new Date(ts);
        return d.toLocaleDateString();
      }
    }
    // 5. Fallback to today
    return getToday();
  };

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
              Image {currentImageIndex + 1} of {totalImages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  currentImageIndex > 0 && onPrevImage && onPrevImage()
                }
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border text-gray-600 ${
                  currentImageIndex > 0
                    ? "bg-white border-gray-300 hover:bg-gray-50"
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  currentImageIndex < totalImages - 1 &&
                  onNextImage &&
                  onNextImage()
                }
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border text-gray-600 ${
                  currentImageIndex < totalImages - 1
                    ? "bg-white border-gray-300 hover:bg-gray-50"
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {/* Mobile Close moved to far right */}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {(strictValidation || mode === "competition") && (
              <button
                onClick={onEditToggle}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentImage.isEditing
                    ? "bg-red-600 text-white shadow hover:bg-red-700"
                    : "bg-blue-600 text-white shadow hover:bg-blue-700"
                }`}
              >
                {currentImage.isEditing ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Edit2 className="h-4 w-4" />
                )}
                {currentImage.isEditing ? "Cancel" : "Edit"}
              </button>
            )}
            {strictValidation && currentImage.isEditing ? (
              <button
                onClick={onSave}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white shadow hover:bg-green-700 text-sm font-medium"
                disabled={!isNameValid || !divesValid || !isRatingValid}
              >
                <Check className="h-4 w-4" />
                Accept
              </button>
            ) : (
              <button
                onClick={onAccept}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white shadow hover:bg-green-700 text-sm font-medium"
                disabled={!isNameValid || !divesValid || !isRatingValid}
              >
                <Check className="h-4 w-4" />
                Accept
              </button>
            )}
            <button
              aria-label="Close"
              onClick={onClose}
              className="ml-1 inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Mobile-only close button on far right of header */}
          <div className="md:hidden">
            <button
              aria-label="Close"
              onClick={onClose}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Mobile actions bar */}
        <div className="md:hidden px-6 pt-0 pb-3 border-b bg-white/90 backdrop-blur flex gap-2 items-center">
          {(strictValidation || mode === "competition") && (
            <button
              onClick={onEditToggle}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentImage.isEditing
                  ? "bg-red-600 text-white shadow hover:bg-red-700"
                  : "bg-blue-600 text-white shadow hover:bg-blue-700"
              }`}
            >
              {currentImage.isEditing ? (
                <X className="h-4 w-4" />
              ) : (
                <Edit2 className="h-4 w-4" />
              )}
              {currentImage.isEditing ? "Cancel" : "Edit"}
            </button>
          )}
          {strictValidation && currentImage.isEditing ? (
            <button
              onClick={onSave}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white shadow hover:bg-green-700 text-sm font-medium"
              disabled={!isNameValid || !divesValid || !isRatingValid}
            >
              <Check className="h-4 w-4" />
              Accept
            </button>
          ) : (
            <button
              onClick={onAccept}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white shadow hover:bg-green-700 text-sm font-medium"
              disabled={!isNameValid || !divesValid || !isRatingValid}
            >
              <Check className="h-4 w-4" />
              Accept
            </button>
          )}
        </div>
        {/* Scrollable content below sticky header */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(94vh-64px)] pb-24 md:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Image */}
            <div className="space-y-4">
              <div className="border rounded-xl overflow-hidden bg-gray-100 shadow-inner flex items-center justify-center h-[28rem]">
                <img
                  src={currentImage.url}
                  alt={`${
                    mode === "competition" ? "Competition" : "Training"
                  } sheet`}
                  className="max-h-full object-contain"
                />
              </div>
            </div>

            {/* Right: Single-use form sections */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {mode === "competition"
                    ? "Competition Details"
                    : "Training Details"}
                </h3>
                {currentImage.isEditing && (
                  <button
                    onClick={onDelete}
                    title="Delete log"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* Diver Name */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block font-medium text-gray-700">
                    Diver Name
                  </label>
                  {currentImage.isEditing ? (
                    <div className="relative">
                      <select
                        value={currentImage.extractedData.Name}
                        onChange={(e) => onDataEdit("Name", e.target.value)}
                        className={`w-full appearance-none px-3 pr-9 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          !isNameValid ? "border-red-500" : ""
                        }`}
                        required
                      >
                        <option value="">Select Diver</option>
                        {PITT_DIVERS.map((diver) => (
                          <option key={diver.id} value={diver.name}>
                            {diver.name}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-semibold text-base text-gray-900">
                      {isNameValid ? (
                        <>
                          <UserIcon className="h-5 w-5 text-gray-500" />
                          {currentImage.extractedData.Name}
                        </>
                      ) : (
                        <span className="text-red-500 text-sm flex font-semibold items-center gap-1">
                          <AlertTriangle className="inline h-4 w-4" /> Needs
                          edit
                        </span>
                      )}
                    </div>
                  )}
                  {!isNameValid && currentImage.isEditing && (
                    <span className="text-red-500 text-xs mt-1">
                      {nameError}
                    </span>
                  )}
                </div>
                {/* Session Date - moved below name */}
                <div className="space-y-2">
                  <label className="block font-medium text-gray-700">
                    Session Date
                  </label>
                  {currentImage.isEditing ? (
                    <input
                      type="date"
                      value={currentImage.session_date || ""}
                      placeholder="mm/dd/yyyy"
                      onChange={(e) =>
                        onDataEdit("session_date", e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="font-semibold text-base text-gray-900">
                      {getUploadedDate()}
                    </div>
                  )}
                </div>
                {mode === "training" && (
                  <div className="space-y-2">
                    <label className="block font-medium text-gray-700">
                      Log Rating
                    </label>
                    {currentImage.isEditing ? (
                      <div className="flex gap-3">
                        {["green", "yellow", "red"].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => onDataEdit("rating", color)}
                            className={`px-3 py-1.5 rounded-lg font-semibold border focus:outline-none transition-colors ${
                              currentImage.extractedData.rating === color
                                ? color === "green"
                                  ? "bg-green-600 text-white border-green-700"
                                  : color === "yellow"
                                  ? "bg-yellow-500 text-white border-yellow-600"
                                  : "bg-red-600 text-white border-red-700"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {color.charAt(0).toUpperCase() + color.slice(1)}
                          </button>
                        ))}
                      </div>
                    ) : currentImage.extractedData.rating ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-4 h-4 rounded-full ${
                            currentImage.extractedData.rating === "green"
                              ? "bg-green-500"
                              : currentImage.extractedData.rating === "yellow"
                              ? "bg-yellow-400"
                              : "bg-red-500"
                          }`}
                        ></span>
                        <span className="font-semibold">
                          {currentImage.extractedData.rating
                            .charAt(0)
                            .toUpperCase() +
                            currentImage.extractedData.rating.slice(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-red-500 text-sm flex font-semibold items-center gap-1">
                        <AlertTriangle className="inline h-4 w-4" /> Needs edit
                      </span>
                    )}
                  </div>
                )}
                {/* Baulk (Balks) Field */}
                {mode === "training" && (
                  <div className="space-y-2">
                    <label className="block font-medium text-gray-700">
                      Balks
                    </label>
                    {currentImage.isEditing ? (
                      <BalksInput
                        value={currentImage.extractedData.balks ?? 0}
                        onChange={(val) => onDataEdit("balks", val)}
                      />
                    ) : (
                      <div className="font-semibold text-base text-gray-900">
                        {currentImage.extractedData.balks ?? 0}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Comment Box */}
              {mode === "training" && (
                <div className="space-y-2">
                  <label className="block font-medium text-gray-700">
                    Comment
                  </label>
                  {currentImage.isEditing ? (
                    <textarea
                      value={currentImage.extractedData.comment || ""}
                      onChange={(e) => onDataEdit("comment", e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                      placeholder="Add a comment about this training log..."
                    />
                  ) : (
                    <div className="bg-gray-50 rounded p-3 min-h-[60px] text-gray-700 whitespace-pre-line">
                      {currentImage.extractedData.comment || (
                        <span className="text-gray-400">No comment</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Dives CSV editor across full width */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">
                Dives ({currentImage.extractedData.Dives.length})
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
              {mode === "training" ? (
                <CSVTable
                  data={currentImage.extractedData.Dives}
                  isEditing={currentImage.isEditing}
                  onDataChange={stableTableDataChange}
                />
              ) : (
                <CompetitionTable
                  data={currentImage.extractedData.Dives}
                  isEditing={currentImage.isEditing}
                  onDataEdit={onDataEdit}
                  onDataChange={(newData) => stableTableDataChange(newData)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { DiveLogModal };
