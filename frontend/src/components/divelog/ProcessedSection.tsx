import React from "react";

interface ImageData {
  id: string;
  file: File | undefined;
  url: string;
}

interface ProcessedSectionProps {
  processedImages: ImageData[];
  currentImageIndex: number;
  onOpenModal: (idx: number) => void;
}

export const ProcessedSection: React.FC<ProcessedSectionProps> = ({
  processedImages,
  currentImageIndex,
  onOpenModal,
}) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-2">
      Processed Training Sheets
    </h3>
    {processedImages.length > 0 ? (
      <div className="flex gap-4 flex-nowrap overflow-x-auto pb-2">
        {processedImages.map((img, idx) => (
          <button
            key={img.id}
            className={`w-32 h-32 bg-gray-100 rounded-lg border-2 ${
              idx === currentImageIndex ? "border-blue-500" : "border-gray-200"
            } flex flex-col items-center justify-center focus:outline-none flex-shrink-0`}
            onClick={() => onOpenModal(idx)}
          >
            {img.url && (
              <img
                src={img.url}
                alt="processed"
                className="w-28 h-28 object-contain"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </button>
        ))}
      </div>
    ) : (
      <div className="text-gray-400 text-sm">No processed training sheets</div>
    )}
  </div>
);
