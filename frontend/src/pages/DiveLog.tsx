import React, { useContext, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { TrophyIcon, BeakerIcon } from "@heroicons/react/24/outline";
import Header from "../components/layout/Header";
import { SidebarContext } from "../components/layout/AppLayout";
import { PITT_DIVERS } from "../constants/pittDivers";
import { PendingSection, ManualEntryModal } from "../components/divelog";
import { ReviewSection } from "../components/divelog/ReviewSection";
import { ConfirmedLogsSection } from "../components/divelog/ConfirmedLogsSection";
import { ConfirmedLogModal, DiveLogModal } from "../components/divelog";
import type { DiveData, DiveEntry } from "../types/index";
import { useDiveLogData } from "../hooks/useDiveLogData";

const DiveLog: React.FC = () => {
  const { onOpenSidebar } = useContext(SidebarContext)!;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmedModalOpen, setConfirmedModalOpen] = useState(false);
  const [manualEntryModalOpen, setManualEntryModalOpen] = useState(false);
  const [currentConfirmedIndex, setCurrentConfirmedIndex] = useState(0);

  // Mode: training or competition
  const [mode, setMode] = useState<"training" | "competition">("training");

  // Use the custom hook for all data management
  const {
    pendingImages,
    reviewImages,
    confirmedLogsWithData,
    isLoading,
    isRefetching, // kept for future UI if needed
    uploadFiles,
    updateImageData,
    saveImageData,
    deleteImage,
    confirmImage,
    addManualEntry,
    currentImageIndex,
    setCurrentImageIndex,
    error,
    isUploading,
  } = useDiveLogData(mode);

  // Handle file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      await uploadFiles(files);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    }
  };

  // Handle data editing
  const handleDataEdit = (
    field: string,
    value: any,
    diveIndex?: number,
    repIndex?: number
  ) => {
    const currentImage = reviewImages[currentImageIndex];
    if (!currentImage) return;

    const updatedData = { ...currentImage.extractedData };
    let updates: any = {};

    if (field === "Name") {
      updatedData.Name = value;
    } else if (field === "comment") {
      updatedData.comment = value;
    } else if (field === "rating") {
      updatedData.rating = value;
    } else if (field === "balks") {
      updatedData.balks = value;
    } else if (field === "session_date") {
      updates.session_date = value;
    } else if (diveIndex !== undefined) {
      const dive = { ...updatedData.Dives[diveIndex] };

      if (repIndex !== undefined && field === "Reps") {
        dive.Reps = [...dive.Reps];
        dive.Reps[repIndex] = value;
        const successCount = dive.Reps.filter((rep) => rep === "O").length;
        dive.Success = `${successCount}/${dive.Reps.length}`;
      } else if (field === "DiveCode") {
        dive.DiveCode = value;
      } else if (field === "DrillType") {
        dive.DrillType = value;
      } else if (field === "Board") {
        dive.Board = value;
      } else if (field === "DegreeOfDifficulty") {
        dive.DegreeOfDifficulty = value;
      } else if (field === "Success") {
        // Allow free-form success/scores editing (used by competition mode)
        dive.Success = value;
      }

      updatedData.Dives = [...updatedData.Dives];
      updatedData.Dives[diveIndex] = dive;
    }

    updateImageData(currentImage.id, {
      ...updates,
      extractedData: updatedData,
    });
  };

  // Handle table data changes
  const handleTableDataChange = (newData: DiveEntry[]) => {
    const currentImage = reviewImages[currentImageIndex];
    if (!currentImage) return;

    updateImageData(currentImage.id, {
      extractedData: {
        ...currentImage.extractedData,
        Dives: newData,
      },
    });
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    const currentImage = reviewImages[currentImageIndex];
    if (!currentImage) return;

    updateImageData(currentImage.id, { isEditing: !currentImage.isEditing });
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    const currentImage = reviewImages[currentImageIndex];
    if (!currentImage?.extractedData) {
      alert("Error: No image or extracted data to save.");
      return;
    }

    try {
      await saveImageData(currentImage.id);
      alert("Saved successfully!");
      toggleEditMode();
    } catch (error: any) {
      console.error("Save error:", error);
      alert("Failed to save data. Please try again.");
    }
  };

  // Handle delete
  const handleDeleteLog = async () => {
    const currentImage = reviewImages[currentImageIndex];
    if (!currentImage) return;

    if (
      !window.confirm(
        "Are you sure you want to delete this log? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteImage(currentImage.id);
      setModalOpen(false);
      alert("Log deleted successfully.");
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("Failed to delete log. Please try again.");
    }
  };

  // Handle accept (confirm) entry
  const handleAcceptEntry = async () => {
    const currentImage = reviewImages[currentImageIndex];
    if (!currentImage?.extractedData) {
      alert("Error: No current image or extracted data to confirm.");
      return;
    }

    try {
      await confirmImage(currentImage.id);
      setModalOpen(false);
      alert("Entry confirmed successfully!");
    } catch (error: any) {
      console.error("Confirm error:", error);
      alert("Failed to confirm entry. Please try again.");
    }
  };

  // Handle manual entry save
  const handleManualEntrySave = async (data: DiveData) => {
    try {
      await addManualEntry(data);
      alert("Manual training log saved successfully!");
    } catch (error: any) {
      console.error("Manual entry error:", error);

      let errorMessage =
        "Failed to save manual training log. Please try again.";
      if (error.message?.includes("Could not find diver ID")) {
        errorMessage = "Error: Could not find diver ID for the selected diver.";
      } else if (error.message?.includes("At least one valid dive")) {
        errorMessage = "Error: At least one valid dive is required.";
      }

      alert(errorMessage);
    }
  };

  // Handle modal open
  const handleOpenModal = (idx: number) => {
    setCurrentImageIndex(idx);
    setModalOpen(true);
  };

  const headerTitle = useMemo(
    () => (mode === "competition" ? "Competition Log" : "Training Log"),
    [mode]
  );
  const headerSubtitle = useMemo(
    () =>
      mode === "competition"
        ? "Upload up to 10 images to extract competition sheet data"
        : "Upload up to 10 images to extract training sheet data",
    [mode]
  );

  // Loading state
  if (isLoading) {
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <div className="text-center text-gray-500 text-lg">
            Loading {mode} log...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">
            Error loading {mode} data
          </div>
          <div className="text-gray-500">
            {error.message || "An unexpected error occurred"}
          </div>
        </div>
      </div>
    );
  }

  const currentImage = reviewImages[currentImageIndex];
  let isNameValid = false;
  let nameError = "";

  if (currentImage?.extractedData) {
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
        title={headerTitle}
        subtitle={headerSubtitle}
        onOpenSidebar={onOpenSidebar}
      />
      <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        {/* Upload Interface */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          {/* Mode Tabs (match DiverProfile) */}
          <div className="mb-6 border-b border-gray-200 px-3 sm:px-4">
            <nav
              className="-mb-px flex justify-center sm:justify-start space-x-8"
              aria-label="Tabs"
            >
              <button
                onClick={() => setMode("training")}
                className={`${
                  mode === "training"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <BeakerIcon className="h-5 w-5" />
                Training
              </button>
              <button
                onClick={() => setMode("competition")}
                className={`${
                  mode === "competition"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <TrophyIcon className="h-5 w-5" />
                Competition
              </button>
            </nav>
          </div>
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
            <Upload className="mx-auto h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {mode === "competition"
                ? "Upload Competition Sheets"
                : "Upload Training Sheets"}
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium w-full sm:w-auto"
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Choose Images"}
              </button>
              {mode === "training" && (
                <button
                  onClick={() => setManualEntryModalOpen(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium w-full sm:w-auto"
                >
                  Add Manually
                </button>
              )}
              {mode === "competition" && (
                <button
                  onClick={() => setManualEntryModalOpen(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium w-full sm:w-auto"
                >
                  Add Manually
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Sections */}
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

        {/* Review Modal */}
        <DiveLogModal
          isOpen={modalOpen && reviewImages.length > 0 && !!currentImage}
          image={currentImage}
          currentImageIndex={currentImageIndex}
          totalImages={reviewImages.length}
          onClose={() => setModalOpen(false)}
          onEditToggle={toggleEditMode}
          onSave={handleSaveEdit}
          onAccept={handleAcceptEntry}
          onDelete={handleDeleteLog}
          onDataEdit={handleDataEdit}
          onTableDataChange={handleTableDataChange}
          isNameValid={isNameValid}
          nameError={nameError}
          strictValidation={mode === "training"}
          mode={mode}
          onPrevImage={() => {
            setCurrentImageIndex(Math.max(0, currentImageIndex - 1));
          }}
          onNextImage={() => {
            setCurrentImageIndex(
              Math.min(reviewImages.length - 1, currentImageIndex + 1)
            );
          }}
        />

        {/* Confirmed Logs Modal */}
        {confirmedModalOpen && confirmedLogsWithData.length > 0 && (
          <ConfirmedLogModal
            isOpen={confirmedModalOpen}
            log={confirmedLogsWithData[currentConfirmedIndex]}
            currentLogIndex={currentConfirmedIndex}
            totalLogs={confirmedLogsWithData.length}
            onClose={() => setConfirmedModalOpen(false)}
            mode={mode}
            onPrev={() =>
              setCurrentConfirmedIndex((prev) => Math.max(0, prev - 1))
            }
            onNext={() =>
              setCurrentConfirmedIndex((prev) =>
                Math.min(
                  Math.min(confirmedLogsWithData.length, 10) - 1,
                  prev + 1
                )
              )
            }
            canPrev={currentConfirmedIndex > 0}
            canNext={
              currentConfirmedIndex <
              Math.min(confirmedLogsWithData.length, 10) - 1
            }
            capAtTen={confirmedLogsWithData.length > 10}
          />
        )}

        {/* Manual Entry Modal */}
        <ManualEntryModal
          isOpen={manualEntryModalOpen}
          onClose={() => setManualEntryModalOpen(false)}
          onSave={handleManualEntrySave}
          mode={mode}
        />
      </div>
    </>
  );
};

export default DiveLog;
