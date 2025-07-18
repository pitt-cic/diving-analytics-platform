import React from "react";
import { MinimalLogCard } from "../common/ConfirmedLogCard";
import { Check, Cloud, AlertTriangle } from "lucide-react";

interface ImageData {
  id: string;
  file: File | undefined;
  url: string;
  uploadStatus?: "pending" | "uploading" | "success" | "error";
  uploadError?: string;
}

interface PendingSectionProps {
  pendingImages: ImageData[];
}

export const PendingSection: React.FC<PendingSectionProps> = ({
  pendingImages,
}) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-2">Pending</h3>
    {pendingImages.length > 0 ? (
      <div className="flex gap-4 flex-nowrap overflow-x-auto pb-2">
        {pendingImages.map((img) => (
          <div
            key={img.id}
            className="w-40 min-w-[10rem] flex-shrink-0 relative"
          >
            <MinimalLogCard log={{ url: img.url }} onClick={() => {}} />
            {/* Overlay upload status animation */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {img.uploadStatus === "pending" && (
                <div className="text-blue-400 text-xs font-semibold animate-pulse bg-white bg-opacity-70 rounded px-2 py-1">
                  Queued...
                </div>
              )}
              {img.uploadStatus === "uploading" && (
                <div className="text-blue-600 text-xs font-semibold animate-pulse bg-white bg-opacity-70 rounded px-2 py-1 flex flex-col items-center">
                  <Cloud className="h-4 w-4 mx-auto mb-1" />
                  Uploading...
                </div>
              )}
              {img.uploadStatus === "success" && (
                <div className="text-green-600 text-xs font-semibold bg-white bg-opacity-70 rounded px-2 py-1 flex flex-col items-center">
                  <Check className="h-4 w-4 mx-auto mb-1" />
                  Uploaded
                </div>
              )}
              {img.uploadStatus === "error" && (
                <div className="text-red-600 text-xs font-semibold bg-white bg-opacity-70 rounded px-2 py-1 flex flex-col items-center">
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
);
