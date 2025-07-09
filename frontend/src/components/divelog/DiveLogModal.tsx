import React from "react";
import { X, Edit2, Check, AlertTriangle } from "lucide-react";
import { PITT_DIVERS } from "../../constants/pittDivers";

interface DiveEntry {
  DiveCode: string;
  DrillType: string;
  Reps: string[];
  Success: string;
}

interface DiveData {
  Name: string;
  Balks: number;
  Dives: DiveEntry[];
}

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
  onDataEdit: (
    field: string,
    value: any,
    diveIndex?: number,
    repIndex?: number
  ) => void;
  isNameValid: boolean;
  nameError: string;
}

const drillTypeMap: Record<string, string> = {
  A: "Approach",
  TO: "Takeoff",
  CON: "Connection",
  S: "Shape",
  CO: "Comeout",
  ADJ: "Adjustment",
  RIP: "Entry",
  UW: "Underwater",
};

export const DiveLogModal: React.FC<DiveLogModalProps> = ({
  isOpen,
  image,
  currentImageIndex,
  totalImages,
  onClose,
  onEditToggle,
  onSave,
  onAccept,
  onDataEdit,
  isNameValid,
  nameError,
}) => {
  if (!isOpen || !image) return null;
  const currentImage = image;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full mx-4 p-8 relative overflow-y-auto max-h-[95vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
          aria-label="Close"
        >
          &times;
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Image {currentImageIndex + 1} of {totalImages}
              </h3>
              <span className="text-sm text-gray-500">
                {currentImage.file?.name || "No file"}
              </span>
            </div>
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <img
                src={currentImage.url}
                alt="Training sheet"
                className="w-full h-96 object-contain"
              />
            </div>
          </div>

          {/* Extracted Data */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between">
              <h3 className="text-xl font-semibold md:mb-0 mb-3 text-gray-900">
                Extracted Data
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={onEditToggle}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentImage.isEditing
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  {currentImage.isEditing ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Edit2 className="h-4 w-4" />
                  )}
                  {currentImage.isEditing ? "Cancel Edit" : "Edit Data"}
                </button>
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  style={{
                    display: currentImage.isEditing ? undefined : "none",
                  }}
                  disabled={!isNameValid}
                >
                  <Check className="h-4 w-4" />
                  Save
                </button>
                {/* Only show Accept when not editing */}
                {!currentImage.isEditing && (
                  <button
                    onClick={onAccept}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    disabled={!isNameValid}
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                )}
              </div>
            </div>
            {/* Diver Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-4">
                <label className="font-medium text-gray-700 w-16">Name:</label>
                {currentImage.isEditing ? (
                  <div className="flex-1 flex flex-col">
                    <select
                      value={currentImage.extractedData.Name}
                      onChange={(e) => onDataEdit("Name", e.target.value)}
                      className={`flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                    {!isNameValid && (
                      <span className="text-red-500 text-xs mt-1">
                        {nameError}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="font-semibold text-lg flex items-center gap-2">
                    {isNameValid ? currentImage.extractedData.Name : ""}
                    {!isNameValid && (
                      <span className="text-red-500 text-xs ml-2 flex items-center gap-1">
                        <AlertTriangle className="inline h-4 w-4" /> Needs edit
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <label className="font-medium text-gray-700 w-16">Balks:</label>
                {currentImage.isEditing ? (
                  <input
                    type="number"
                    value={currentImage.extractedData.Balks}
                    onChange={(e) => onDataEdit("Balks", e.target.value)}
                    className="w-20 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="font-semibold">
                    {currentImage.extractedData.Balks}
                  </span>
                )}
              </div>
            </div>
            {/* Dives */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">
                Dives ({currentImage.extractedData.Dives.length})
              </h4>
              <div className="space-y-3 md:max-h-96 overflow-y-auto">
                {currentImage.extractedData.Dives.map((dive, diveIdx) => (
                  <div key={diveIdx} className="border rounded-lg p-4 bg-white">
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Dive Code
                        </label>
                        {currentImage.isEditing ? (
                          <input
                            type="text"
                            value={dive.DiveCode}
                            onChange={(e) =>
                              onDataEdit("DiveCode", e.target.value, diveIdx)
                            }
                            className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="font-semibold">{dive.DiveCode}</div>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Drill Type
                        </label>
                        {currentImage.isEditing ? (
                          <select
                            value={dive.DrillType}
                            onChange={(e) =>
                              onDataEdit("DrillType", e.target.value, diveIdx)
                            }
                            className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {Object.keys(drillTypeMap).map((key) => (
                              <option key={key} value={key}>
                                {key} - {drillTypeMap[key]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div
                            className="font-semibold"
                            title={drillTypeMap[dive.DrillType]}
                          >
                            {dive.DrillType}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Success Rate
                        </label>
                        <div className="font-semibold text-green-600">
                          {dive.Success}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">
                        Repetitions
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {dive.Reps.map((rep, repIdx) => (
                          <span
                            key={repIdx}
                            className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded cursor-pointer ${
                              rep === "O"
                                ? "bg-green-100 text-green-800 border-2 border-green-300"
                                : "bg-red-100 text-red-800 border-2 border-red-300"
                            } ${
                              currentImage.isEditing ? "hover:opacity-75" : ""
                            }`}
                            onClick={() =>
                              currentImage.isEditing &&
                              onDataEdit(
                                "Reps",
                                rep === "O" ? "X" : "O",
                                diveIdx,
                                repIdx
                              )
                            }
                          >
                            {rep}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
