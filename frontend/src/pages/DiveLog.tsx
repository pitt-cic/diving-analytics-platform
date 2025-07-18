import React, { useState, useRef, useContext, useEffect } from "react";
import { Upload } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import { SidebarContext } from "../components/layout/AppLayout";
import { PlusIcon } from "@heroicons/react/24/outline";
import { s3UploadService } from "../services/s3Upload";
import getTrainingDataByStatus from "../services/getTrainingDataByStatus";
import updateTrainingData from "../services/updateTrainingData";
import getPresignedUrl from "../services/getPresignedUrl";
import { Auth } from "aws-amplify";
import { PITT_DIVERS } from "../constants/pittDivers";
import { PendingSection } from "../components/divelog/PendingSection";
import { ReviewSection } from "../components/divelog/ReviewSection";
import { ConfirmedLogsSection } from "../components/divelog/ConfirmedLogsSection";
import {
  ConfirmedLogModal,
  DiveLogModal,
} from "../components/divelog/DiveLogModal";
import type { DiveEntry, DiveData } from "../types/index";

// Types
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
const generateMockData = (): DiveData => {
  // Pick a random diver from PITT_DIVERS
  const randomDiver =
    PITT_DIVERS[Math.floor(Math.random() * PITT_DIVERS.length)];
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
  const boards = ["1M", "3M", "5M", "7.5M", "10M"]; // Example boards

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
        Board: boards[Math.floor(Math.random() * boards.length)],
        Reps: reps,
        Success: `${successCount}/${repCount}`,
      };
    }
  );

  return {
    Name: randomDiver.name,
    Dives: dives,
    comment: "",
    rating: undefined,
  };
};

// Drill type mapping
// const drillTypeMap: Record<string, string> = {
//   A: "Approach",
//   TO: "Takeoff",
//   CON: "Connection",
//   S: "Shape",
//   CO: "Comeout",
//   ADJ: "Adjustment",
//   RIP: "Entry",
//   UW: "Underwater",
// };

// Improved S3 key extraction from S3 URL
function extractS3KeyFromUrl(s3Url: string): string | null {
  try {
    const url = new URL(s3Url);
    return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  } catch {
    return null;
  }
}

// Helper to map API data to ImageData (for review/pending) - now async for signed URLs
async function mapApiToImageDataWithSignedUrl(item: any): Promise<ImageData> {
  let s3Key = item.s3_url ? extractS3KeyFromUrl(item.s3_url) : null;
  let imageUrl = "";
  if (s3Key) {
    imageUrl = (await getPresignedUrl(s3Key)) || "";
    // Log only part of the key if sensitive
    // const safeKey =
    //   s3Key.length > 10 ? s3Key.slice(0, 5) + "..." + s3Key.slice(-5) : s3Key;
    // console.log("[DEBUG] S3 Key:", safeKey, "Presigned URL:", imageUrl);
  } else {
    // console.warn("[DEBUG] No S3 key found for item:", item.id);
  }
  // Parse json_output if present
  let extractedData: DiveData = {
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
      extractedData = {
        Name: parsed.diver_info?.name || item.diver_name || "",
        Dives: (parsed.dives || []).map((d: any) => ({
          DiveCode: d.dive_skill || d.code || "",
          DrillType: d.area_of_dive || d.drillType || "",
          Board: d.board || d.Board || "",
          Reps: d.attempts || d.reps || [],
          Success: d.success_rate || d.success || "",
        })),
        comment: parsed.comment || item.comment || "",
        rating: parsed.rating || item.rating || undefined,
      };
    } catch (e) {
      // fallback to empty
    }
  }
  return {
    id: item.id,
    file: undefined as any, // No local file, so undefined
    url: imageUrl,
    extractedData,
    isEditing: false,
    s3Key: s3Key || undefined,
    s3Url: item.s3_url,
    uploadStatus: "success",
  };
}

// Helper to map API data to ConfirmedLog (no image needed)
function mapApiToConfirmedLog(
  item: any
): ConfirmedLog & { extractedData?: DiveData } {
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
      // If dives is a string, parse it
      if (typeof dives === "string") {
        try {
          dives = JSON.parse(dives);
        } catch (e) {
          console.error("Could not parse dives string as JSON:", dives);
          dives = [];
        }
      }
      extractedData = {
        Name: parsed.Name || parsed.diver_info?.name || item.diver_name || "",
        Dives: parsed.Dives ?? parsed.dives ?? [],
        comment: parsed.comment || item.comment || "",
        rating: parsed.rating || item.rating || undefined,
      };
    } catch (e) {
      console.error(
        "Error parsing json_output for confirmed log:",
        e,
        item.json_output
      );
    }
  }
  return {
    id: item.id,
    diverName: extractedData.Name,
    date: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "",
    totalDives: extractedData.Dives?.length || 0,
    balks: 0, // Removed Balks from ConfirmedLog
    fileName: item.s3_key || item.s3_url || item.id,
    s3Key: item.s3_key,
    s3Url: item.s3_url,
    extractedData, // <-- add this!
  };
}

const DiveLog: React.FC = () => {
  const { onOpenSidebar } = useContext(SidebarContext)!;
  const [pendingImages, setPendingImages] = useState<ImageData[]>([]);
  const [reviewImages, setReviewImages] = useState<ImageData[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [confirmedLogs, setConfirmedLogs] = useState<ConfirmedLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true); // NEW: loading state
  const pendingImagesRef = useRef(pendingImages);
  const [currentConfirmedIndex, setCurrentConfirmedIndex] = useState(0);
  const [confirmedModalOpen, setConfirmedModalOpen] = useState(false);
  const [confirmedLogsWithData, setConfirmedLogsWithData] = useState<
    (ConfirmedLog & { url?: string; extractedData?: DiveData })[]
  >([]);

  // Fetch API data on mount (now async for signed URLs)
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const [pending, review, confirmed] = await Promise.all([
          getTrainingDataByStatus("PROCESSING"),
          getTrainingDataByStatus("PENDING_REVIEW"),
          getTrainingDataByStatus("CONFIRMED"),
        ]);
        // Map and await signed URLs for images
        const pendingMapped = await Promise.all(
          (pending.data || []).map(mapApiToImageDataWithSignedUrl)
        );
        const reviewMapped = await Promise.all(
          (review.data || []).map(mapApiToImageDataWithSignedUrl)
        );
        setPendingImages(pendingMapped);
        setReviewImages(reviewMapped);
        setConfirmedLogs((confirmed.data || []).map(mapApiToConfirmedLog));
        setCurrentImageIndex(0);
        setLoading(false);
      } catch (e) {
        console.error("Error in useEffect data load:", e);
      }
    })();
    Auth.currentCredentials().then((creds) => {
      // console.log("Current identityId:", creds.identityId);
    });
  }, []);

  // Add polling for pending images
  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    if (pendingImages.length === 0) return;
    const interval = setInterval(async () => {
      const review = await getTrainingDataByStatus("PENDING_REVIEW");
      const localPendingIds = pendingImagesRef.current.map((img: any) =>
        String(img.id)
      );
      const backendReviewIds = (review.data || []).map((item: any) =>
        String(item.id)
      );
      console.log("[Polling] Local pending IDs:", localPendingIds);
      console.log("[Polling] Backend review IDs:", backendReviewIds);
      const reviewIds = new Set(backendReviewIds);
      // Which local pending images are now in review?
      const toMove = pendingImagesRef.current.filter((img: any) =>
        reviewIds.has(String(img.id))
      );
      console.log(
        "[Polling] Images to move from pending to review:",
        toMove.map((img: any) => img.id)
      );
      setPendingImages((prevPending) =>
        prevPending.filter((img: any) => !reviewIds.has(String(img.id)))
      );
      // Use the ref to get the latest pending images
      const newReviewImages = (review.data || []).filter((item: any) =>
        pendingImagesRef.current.some(
          (img: any) => String(img.id) === String(item.id)
        )
      );
      if (newReviewImages.length > 0) {
        const mapped = await Promise.all(
          newReviewImages.map(mapApiToImageDataWithSignedUrl)
        );
        setReviewImages((prev) => [...prev, ...mapped]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingImages.length]);

  useEffect(() => {
    async function mapConfirmedLogs() {
      const mapped = await Promise.all(
        confirmedLogs.map(async (log) => {
          let extractedData = undefined;
          let url = undefined;
          const found = [...reviewImages, ...pendingImages].find(
            (img) => img.id === log.id
          );
          if (found && found.url) {
            url = found.url;
          } else if (log.s3Key) {
            url = await getPresignedUrl(log.s3Key);
          } else if (log.s3Url) {
            // Try to extract key from s3Url and get presigned URL
            const key = extractS3KeyFromUrl(log.s3Url);
            if (key) {
              const presigned = await getPresignedUrl(key);
              if (presigned) url = presigned;
            }
          }
          // After all url logic, ensure url is string or undefined
          if (url == null) url = undefined;
          // Fix: use type assertion to access extractedData
          const logWithData = log as ConfirmedLog & {
            extractedData?: DiveData;
          };
          if (found && found.extractedData) {
            extractedData = found.extractedData;
          }
          return {
            ...log,
            url,
            extractedData: extractedData || logWithData.extractedData,
          };
        })
      );
      setConfirmedLogsWithData(mapped);
    }
    mapConfirmedLogs();
  }, [confirmedLogs, reviewImages, pendingImages]);

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
          } else if (field === "comment") {
            updatedData.comment = value;
          } else if (field === "rating") {
            updatedData.rating = value;
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
            } else if (field === "Board") {
              dive.Board = value;
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

  // Handle table data changes (for the CSV table)
  const handleTableDataChange = (newData: DiveEntry[]) => {
    setReviewImages((prev) =>
      prev.map((img, idx) => {
        if (idx === currentImageIndex) {
          return {
            ...img,
            extractedData: {
              ...img.extractedData,
              Dives: newData,
            },
          };
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

  // Defensive acceptCurrentEntry
  const acceptCurrentEntry = () => {
    const currentImage = reviewImages[currentImageIndex];
    if (!currentImage || !currentImage.extractedData) {
      console.error(
        "[acceptCurrentEntry] currentImage or extractedData is undefined",
        { currentImage }
      );
      alert("Error: No current image or extracted data to confirm.");
      return;
    }
    const newLog: ConfirmedLog = {
      id: currentImage.id,
      diverName: currentImage.extractedData.Name || "",
      date: new Date().toLocaleDateString(),
      totalDives: currentImage.extractedData.Dives?.length || 0,
      balks: 0, // Removed Balks from ConfirmedLog
      fileName:
        currentImage.file?.name ||
        currentImage.s3Key ||
        currentImage.s3Url ||
        currentImage.id,
      s3Key: currentImage.s3Key,
      s3Url: currentImage.s3Url,
    };
    setConfirmedLogs((prev) => [newLog, ...prev]);
    setReviewImages((prev) =>
      prev.filter((_, idx) => idx !== currentImageIndex)
    );
    if (currentImageIndex < reviewImages.length - 1) {
      setCurrentImageIndex((prev) => prev);
    } else {
      setCurrentImageIndex(0);
    }
    if (fileInputRef.current && reviewImages.length === 1) {
      fileInputRef.current.value = "";
    }
  };

  // Enhanced handleSaveEdit with logging
  const handleSaveEdit = async () => {
    const img = reviewImages[currentImageIndex];
    if (!img || !img.extractedData) {
      console.error("[handleSaveEdit] No image or extracted data to save", {
        img,
      });
      alert("Error: No image or extracted data to save.");
      return;
    }
    // Look up diver_id from PITT_DIVERS by name
    const diverName = img.extractedData.Name;
    const diverObj = PITT_DIVERS.find((d) => d.name === diverName);
    const diverId = diverObj ? diverObj.id : "";
    const payload = {
      name: diverName,
      training_data_id: img.id,
      diver_id: diverId,
      updated_json: img.extractedData,
    };
    console.log("[DEBUG] Payload to updateTrainingData:", payload);
    try {
      const response = await updateTrainingData(payload);
      console.log("[DEBUG] updateTrainingData response:", response);
      alert("Saved successfully!");
      toggleEditMode();
    } catch (error: any) {
      console.error("[SAVE] Error saving training data:", error);
      if (
        error &&
        error.message &&
        error.message.includes("Failed to update")
      ) {
        alert(
          "Failed to save training data. Please check the backend logs and payload format."
        );
      } else {
        alert(
          "An unexpected error occurred while saving. See console for details."
        );
      }
    }
  };

  // Open modal when clicking a review card
  const handleOpenModal = (idx: number) => {
    setCurrentImageIndex(idx);
    setModalOpen(true);
  };
  const handleCloseModal = () => setModalOpen(false);

  // UI: Add loading spinner if loading
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-500 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <div className="text-center text-gray-500 text-lg">
            Loading training log...
          </div>
        </div>
      </div>
    );
  }

  const currentImage = reviewImages[currentImageIndex];
  let isNameValid = false;
  let nameError = "";
  if (currentImage && currentImage.extractedData) {
    const name = currentImage.extractedData.Name?.trim();
    if (!name) {
      nameError = "Diver name is required";
    } else if (!PITT_DIVERS.some((d) => d.name === name)) {
      nameError = "Diver name must match a valid Pitt diver";
    } else {
      isNameValid = true;
    }
  }

  return (
    <>
      <Header
        title="Training Log"
        subtitle="Upload up to 10 images to extract training sheet data"
        right={
          <Link
            to="/dive-log"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            Add Log
            <PlusIcon className="h-5 w-5 ml-1" />
          </Link>
        }
        onOpenSidebar={onOpenSidebar}
      />
      <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        {/* Upload Interface - always visible */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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
          <PendingSection pendingImages={pendingImages} />
          <ReviewSection
            reviewImages={reviewImages}
            currentImageIndex={currentImageIndex}
            onOpenModal={handleOpenModal}
          />
          <ConfirmedLogsSection
            confirmedLogs={confirmedLogsWithData}
            currentConfirmedIndex={currentConfirmedIndex}
            onOpenModal={(idx: number) => {
              setCurrentConfirmedIndex(idx);
              setConfirmedModalOpen(true);
            }}
          />
        </div>
        {/* Modal for Review UI */}
        <DiveLogModal
          isOpen={modalOpen && reviewImages.length > 0 && !!currentImage}
          image={currentImage}
          currentImageIndex={currentImageIndex}
          totalImages={reviewImages.length}
          onClose={handleCloseModal}
          onEditToggle={toggleEditMode}
          onSave={handleSaveEdit}
          onAccept={async () => {
            await handleSaveEdit();
            acceptCurrentEntry();
            setModalOpen(false);
          }}
          onDataEdit={handleDataEdit}
          onTableDataChange={handleTableDataChange}
          isNameValid={isNameValid}
          nameError={nameError}
        />
        {/* Modal for Confirmed Logs */}
        {confirmedModalOpen && confirmedLogsWithData.length > 0 && (
          <ConfirmedLogModal
            isOpen={confirmedModalOpen && confirmedLogsWithData.length > 0}
            log={confirmedLogsWithData[currentConfirmedIndex]}
            currentLogIndex={currentConfirmedIndex}
            totalLogs={confirmedLogsWithData.length}
            onClose={() => setConfirmedModalOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default DiveLog;
