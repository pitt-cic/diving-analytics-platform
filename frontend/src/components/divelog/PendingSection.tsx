import React from "react";
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
            className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-blue-200 relative flex-shrink-0"
          >
            {img.url && (
              <img
                src={img.url}
                alt="pending"
                className="w-28 h-28 object-contain opacity-60"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
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
);
