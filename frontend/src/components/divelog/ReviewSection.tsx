import React from "react";
import { MinimalLogCard } from "../common/ConfirmedLogCard";

interface ImageData {
  id: string;
  file: File | undefined;
  url: string;
  extractedData?: any;
}

interface ReviewSectionProps {
  reviewImages: ImageData[];
  currentImageIndex: number;
  onOpenModal: (idx: number) => void;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  reviewImages,
  currentImageIndex,
  onOpenModal,
}) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h3 className="text-lg font-semibold text-gray-800 mb-2">
      Awaiting Review
    </h3>
    {reviewImages.length > 0 ? (
      <div className="flex gap-4 flex-nowrap overflow-x-auto pb-2">
        {reviewImages.map((img, idx) => (
          <div key={img.id} className="w-40 min-w-[10rem] flex-shrink-0">
            <MinimalLogCard
              log={{ url: img.url }}
              onClick={() => onOpenModal(idx)}
            />
          </div>
        ))}
      </div>
    ) : (
      <div className="text-gray-400 text-sm">No images awaiting review</div>
    )}
  </div>
);
