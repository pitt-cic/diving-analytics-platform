import React, { useState, useRef } from "react";
import {
  Upload,
  Edit2,
  Check,
  X,
  FileImage,
  AlertTriangle,
  Cloud,
} from "lucide-react";
import { s3UploadService } from "../services/s3Upload";

// Types
interface DiveEntry {
  DiveCode: string;
  DrillType: string;
  Reps: string[];
  Success: string;
  Confidence: number;
}

interface DiveData {
  Name: string;
  Balks: number;
  Dives: DiveEntry[];
}

interface ImageData {
  id: string;
  file: File;
  url: string;
  extractedData: DiveData;
  isEditing: boolean;
  s3Key?: string;
  s3Url?: string;
  uploadStatus?: "pending" | "uploading" | "success" | "error";
  uploadError?: string;
}

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

// Mock data generator
const generateConfidenceScore = (): number => {
  // Generate confidence scores between 0.3 and 0.98
  // Bias towards higher confidence scores but include some low ones
  const rand = Math.random();
  if (rand < 0.4) {
    // 40% chance of low confidence (0.3-0.69)
    return Math.random() * 0.39 + 0.3;
  } else {
    // 60% chance of high confidence (0.7-0.98)
    return Math.random() * 0.28 + 0.7;
  }
};

const generateMockData = (): DiveData => {
  const names = ["Ethan", "Sarah", "Mike", "Jessica", "Alex", "Emma"];
  const diveCodes = [
    "10B",
    "100B",
    "200B",
    "300B",
    "400B",
    "500B",
    "600",
    "300S",
  ];
  const drillTypes = ["A", "TO", "CON", "S", "CO", "ADJ", "RIP", "UW"];

  const generateReps = (count: number) => {
    return Array.from({ length: count }, () =>
      Math.random() > 0.4 ? "O" : "X"
    );
  };

  const dives = Array.from(
    { length: Math.floor(Math.random() * 4) + 3 },
    () => {
      const repCount = Math.floor(Math.random() * 12) + 3;
      const reps = generateReps(repCount);
      const successCount = reps.filter((rep) => rep === "O").length;

      return {
        DiveCode: diveCodes[Math.floor(Math.random() * diveCodes.length)],
        DrillType: drillTypes[Math.floor(Math.random() * drillTypes.length)],
        Reps: reps,
        Success: `${successCount}/${repCount}`,
        Confidence: generateConfidenceScore(),
      };
    }
  );

  return {
    Name: names[Math.floor(Math.random() * names.length)],
    Balks: Math.floor(Math.random() * 15),
    Dives: dives,
  };
};

// Drill type mapping
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

const DiveLog: React.FC = () => {
  const [pendingImages, setPendingImages] = useState<ImageData[]>([]);
  const [reviewImages, setReviewImages] = useState<ImageData[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [confirmedLogs, setConfirmedLogs] = useState<ConfirmedLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Helper to move image from pending to review after 3s
  const moveToReview = (image: ImageData) => {
    setPendingImages((prev) => prev.filter((img) => img.id !== image.id));
    setReviewImages((prev) => [...prev, image]);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const newImages: ImageData[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      url: URL.createObjectURL(file),
      extractedData: generateMockData(),
      isEditing: false,
      uploadStatus: "pending" as const,
    }));

    // Add to pending immediately
    setPendingImages((prev) => [...prev, ...newImages]);

    // Upload each file to S3
    for (let i = 0; i < newImages.length; i++) {
      const image = newImages[i];

      // Update status to uploading
      setPendingImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, uploadStatus: "uploading" } : img
        )
      );

      try {
        const uploadResult = await s3UploadService.uploadFile(image.file);

        if (uploadResult.success) {
          // Update with S3 information
          setPendingImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? {
                    ...img,
                    s3Key: uploadResult.key,
                    s3Url: uploadResult.url,
                    uploadStatus: "success",
                  }
                : img
            )
          );
        } else {
          // Update with error
          setPendingImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? {
                    ...img,
                    uploadStatus: "error",
                    uploadError: uploadResult.error,
                  }
                : img
            )
          );
        }
      } catch (error) {
        // Update with error
        setPendingImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  uploadStatus: "error",
                  uploadError:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : img
          )
        );
      }

      // Move to review after 3s (regardless of upload status)
      setTimeout(() => moveToReview(image), 3000);
    }

    // If nothing in review, set index to 0
    if (reviewImages.length === 0 && newImages.length > 0)
      setCurrentImageIndex(0);
  };

  const handleDataEdit = (
    field: string,
    value: any,
    diveIndex?: number,
    repIndex?: number
  ) => {
    setReviewImages((prev) =>
      prev.map((img, idx) => {
        if (idx === currentImageIndex) {
          const updatedData = { ...img.extractedData };
          if (field === "Name") {
            updatedData.Name = value;
          } else if (field === "Balks") {
            updatedData.Balks = parseInt(value) || 0;
          } else if (diveIndex !== undefined) {
            const dive = { ...updatedData.Dives[diveIndex] };
            if (repIndex !== undefined && field === "Reps") {
              dive.Reps = [...dive.Reps];
              dive.Reps[repIndex] = value;
              const successCount = dive.Reps.filter(
                (rep) => rep === "O"
              ).length;
              dive.Success = `${successCount}/${dive.Reps.length}`;
            } else if (field === "DiveCode") {
              dive.DiveCode = value;
            } else if (field === "DrillType") {
              dive.DrillType = value;
            } else if (field === "Confidence") {
              dive.Confidence = parseFloat(value) || 0;
            }
            updatedData.Dives = [...updatedData.Dives];
            updatedData.Dives[diveIndex] = dive;
          }
          return { ...img, extractedData: updatedData };
        }
        return img;
      })
    );
  };

  const toggleEditMode = () => {
    setReviewImages((prev) =>
      prev.map((img, idx) =>
        idx === currentImageIndex ? { ...img, isEditing: !img.isEditing } : img
      )
    );
  };

  const acceptCurrentEntry = () => {
    const currentImage = reviewImages[currentImageIndex];
    const newLog: ConfirmedLog = {
      id: currentImage.id,
      diverName: currentImage.extractedData.Name,
      date: new Date().toLocaleDateString(),
      totalDives: currentImage.extractedData.Dives.length,
      balks: currentImage.extractedData.Balks,
      fileName: currentImage.file.name,
      s3Key: currentImage.s3Key,
      s3Url: currentImage.s3Url,
    };
    setConfirmedLogs((prev) => [newLog, ...prev]);
    // Remove from reviewImages
    setReviewImages((prev) =>
      prev.filter((_, idx) => idx !== currentImageIndex)
    );
    // Move to next image or reset
    if (currentImageIndex < reviewImages.length - 1) {
      setCurrentImageIndex((prev) => prev);
    } else {
      setCurrentImageIndex(0);
    }
    if (fileInputRef.current && reviewImages.length === 1) {
      fileInputRef.current.value = "";
    }
  };

  const currentImage = reviewImages[currentImageIndex];

  // Open modal when clicking a review card
  const handleOpenModal = (idx: number) => {
    setCurrentImageIndex(idx);
    setModalOpen(true);
  };
  const handleCloseModal = () => setModalOpen(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          Training Log
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload up to 10 images to extract training sheet data
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {/* Upload Interface - always visible */}
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-12 text-center bg-blue-50 mb-4">
          <Upload className="mx-auto h-12 w-12 text-blue-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Training Sheets
          </h3>
          <p className="text-gray-500 mb-4">
            Select multiple images to process
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Choose Images
          </button>
        </div>
      </div>

      {/* Always show the three sections below the upload */}
      <div className="flex flex-col gap-6 mb-8">
        {/* Pending Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Pending</h3>
          {pendingImages.length > 0 ? (
            <div className="flex gap-4 flex-wrap">
              {pendingImages.map((img) => (
                <div
                  key={img.id}
                  className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-blue-200 relative"
                >
                  <img
                    src={img.url}
                    alt="pending"
                    className="w-28 h-28 object-contain opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {img.uploadStatus === "pending" && (
                      <div className="text-blue-400 text-xs font-semibold animate-pulse">
                        Queued...
                      </div>
                    )}
                    {img.uploadStatus === "uploading" && (
                      <div className="text-blue-600 text-xs font-semibold animate-pulse">
                        <Cloud className="h-4 w-4 mx-auto mb-1" />
                        Uploading...
                      </div>
                    )}
                    {img.uploadStatus === "success" && (
                      <div className="text-green-600 text-xs font-semibold">
                        <Check className="h-4 w-4 mx-auto mb-1" />
                        Uploaded
                      </div>
                    )}
                    {img.uploadStatus === "error" && (
                      <div className="text-red-600 text-xs font-semibold">
                        <AlertTriangle className="h-4 w-4 mx-auto mb-1" />
                        Failed
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No pending images</div>
          )}
        </div>
        {/* Awaiting Review Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Awaiting Review
          </h3>
          {reviewImages.length > 0 ? (
            <div className="flex gap-4 flex-wrap">
              {reviewImages.map((img, idx) => (
                <button
                  key={img.id}
                  className={`w-32 h-32 bg-gray-100 rounded-lg border-2 ${
                    idx === currentImageIndex && modalOpen
                      ? "border-blue-500"
                      : "border-gray-200"
                  } flex flex-col items-center justify-center focus:outline-none`}
                  onClick={() => handleOpenModal(idx)}
                >
                  <img
                    src={img.url}
                    alt="review"
                    className="w-28 h-28 object-contain"
                  />
                  <span className="text-xs mt-1 truncate w-full">
                    {img.file.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">
              No images awaiting review
            </div>
          )}
        </div>
        {/* Recently Confirmed Logs Section */}
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
                    <div className="flex items-center gap-1">
                      {log.s3Key && (
                        <Cloud className="h-4 w-4 text-green-500" />
                      )}
                      <FileImage className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="space-y-0.5 text-xs text-gray-600">
                    <div>Date: {log.date}</div>
                    <div>Dives: {log.totalDives}</div>
                    <div>Balks: {log.balks}</div>
                    <div className="truncate" title={log.fileName}>
                      File: {log.fileName}
                    </div>
                    {log.s3Key && (
                      <div className="text-green-600 font-medium">
                        ✓ Stored in S3
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No confirmed logs</div>
          )}
        </div>
      </div>

      {/* Modal for Review UI */}
      {modalOpen && reviewImages.length > 0 && currentImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full mx-4 p-8 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={handleCloseModal}
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
                    Image {currentImageIndex + 1} of {reviewImages.length}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {currentImage.file.name}
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
                      onClick={toggleEditMode}
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
                      onClick={() => {
                        acceptCurrentEntry();
                        setModalOpen(false);
                      }}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Accept
                    </button>
                  </div>
                </div>
                {/* Diver Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="font-medium text-gray-700 w-16">
                      Name:
                    </label>
                    {currentImage.isEditing ? (
                      <input
                        type="text"
                        value={currentImage.extractedData.Name}
                        onChange={(e) => handleDataEdit("Name", e.target.value)}
                        className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-semibold text-lg">
                        {currentImage.extractedData.Name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="font-medium text-gray-700 w-16">
                      Balks:
                    </label>
                    {currentImage.isEditing ? (
                      <input
                        type="number"
                        value={currentImage.extractedData.Balks}
                        onChange={(e) =>
                          handleDataEdit("Balks", e.target.value)
                        }
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
                      <div
                        key={diveIdx}
                        className={`border rounded-lg p-4 bg-white ${
                          dive.Confidence < 0.7
                            ? "border-yellow-400 border-2"
                            : ""
                        }`}
                      >
                        {dive.Confidence < 0.7 && (
                          <div className="flex items-center gap-2 mb-2 text-yellow-600 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Low confidence detected - please review</span>
                          </div>
                        )}
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
                                  handleDataEdit(
                                    "DiveCode",
                                    e.target.value,
                                    diveIdx
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <div className="font-semibold">
                                {dive.DiveCode}
                              </div>
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
                                  handleDataEdit(
                                    "DrillType",
                                    e.target.value,
                                    diveIdx
                                  )
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
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Confidence
                            </label>
                            {currentImage.isEditing ? (
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.01"
                                value={dive.Confidence.toFixed(2)}
                                onChange={(e) =>
                                  handleDataEdit(
                                    "Confidence",
                                    e.target.value,
                                    diveIdx
                                  )
                                }
                                className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <div
                                className={`font-semibold ${
                                  dive.Confidence < 0.7
                                    ? "text-yellow-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {(dive.Confidence * 100).toFixed(0)}%
                              </div>
                            )}
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
                                  currentImage.isEditing
                                    ? "hover:opacity-75"
                                    : ""
                                }`}
                                onClick={() =>
                                  currentImage.isEditing &&
                                  handleDataEdit(
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
      )}
    </div>
  );
};

export default DiveLog;
