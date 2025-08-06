import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import getTrainingDataByStatus from '../services/getTrainingDataByStatus';
import updateTrainingData from '../services/updateTrainingData';
import deleteTrainingData from '../services/deleteTrainingData';
import { s3UploadService } from '../services/s3Upload';
import { PITT_DIVERS } from '../constants/pittDivers';
import {
  ImageData,
  ConfirmedLog,
  mapApiToConfirmedLog,
  mapConfirmedLogsWithData,
  batchMapApiToImageData,
  generateMockData,
} from '../services/dataFormatters';
import type { DiveData } from '../types/index';

interface UseDiveLogDataReturn {
  // Data
  pendingImages: ImageData[];
  reviewImages: ImageData[];
  confirmedLogs: ConfirmedLog[];
  confirmedLogsWithData: (ConfirmedLog & { url?: string; extractedData?: DiveData })[];
  
  // Loading states
  isLoading: boolean;
  isRefetching: boolean;
  
  // Actions
  uploadFiles: (files: File[]) => Promise<void>;
  updateImageData: (imageId: string, updates: Partial<ImageData>) => void;
  saveImageData: (imageId: string) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  confirmImage: (imageId: string) => Promise<void>;
  addManualEntry: (data: DiveData) => Promise<void>;
  
  // UI state
  currentImageIndex: number;
  setCurrentImageIndex: (index: number) => void;
  
  // Error handling
  error: Error | null;
}

const QUERY_KEYS = {
  pending: ['training-data', 'PROCESSING'] as const,
  review: ['training-data', 'PENDING_REVIEW'] as const,
  confirmed: ['training-data', 'CONFIRMED'] as const,
};

export function useDiveLogData(): UseDiveLogDataReturn {
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [pendingImages, setPendingImages] = useState<ImageData[]>([]);
  const [confirmedLogsWithData, setConfirmedLogsWithData] = useState<
    (ConfirmedLog & { url?: string; extractedData?: DiveData })[]
  >([]);

  // Process pending data
  const [reviewImages, setReviewImages] = useState<ImageData[]>([]);
  const [confirmedLogs, setConfirmedLogs] = useState<ConfirmedLog[]>([]);

  // Track if we should be polling (only when we have pending items)
  const shouldPollPending = pendingImages.length > 0;
  const shouldPollReview = pendingImages.length > 0; // Only poll review when we have pending items

  // Query for pending images - VERY conservative polling
  const {
    data: pendingData,
    isLoading: pendingLoading,
    error: pendingError,
  } = useQuery({
    queryKey: QUERY_KEYS.pending,
    queryFn: () => getTrainingDataByStatus('PROCESSING'),
    staleTime: 2 * 60 * 1000, // 2 minutes - very conservative
    refetchInterval: shouldPollPending ? 10000 : false, // 10 seconds only if we have pending items
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  // Query for review images - even more conservative
  const {
    data: reviewData,
    isLoading: reviewLoading,
    error: reviewError,
  } = useQuery({
    queryKey: QUERY_KEYS.review,
    queryFn: () => getTrainingDataByStatus('PENDING_REVIEW'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: shouldPollReview ? 15000 : 60000, // 15s if pending items, otherwise 1 minute
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Query for confirmed logs - faster polling for better UX
  const {
    data: confirmedData,
    isLoading: confirmedLoading,
    error: confirmedError,
  } = useQuery({
    queryKey: QUERY_KEYS.confirmed,
    queryFn: () => getTrainingDataByStatus('CONFIRMED'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // 30 seconds - much more responsive
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update pending images when data changes - fetch URLs properly
  useEffect(() => {
    if (pendingData?.data) {
      console.log(`[Data] Processing ${pendingData.data.length} pending items`);
      batchMapApiToImageData(pendingData.data).then(setPendingImages);
    }
  }, [pendingData]);

  // Update review images when data changes - fetch URLs properly
  useEffect(() => {
    if (reviewData?.data) {
      console.log(`[Data] Processing ${reviewData.data.length} review items`);
      batchMapApiToImageData(reviewData.data).then((mapped) => {
        setReviewImages(mapped);
        // Reset current index if it's out of bounds
        if (currentImageIndex >= mapped.length) {
          setCurrentImageIndex(0);
        }
      });
    }
  }, [reviewData, currentImageIndex]);

  // Update confirmed logs when data changes
  useEffect(() => {
    if (confirmedData?.data) {
      console.log(`[Data] Processing ${confirmedData.data.length} confirmed items`);
      const mapped = confirmedData.data.map(mapApiToConfirmedLog);
      setConfirmedLogs(mapped);
    }
  }, [confirmedData]);

  // Update confirmed logs with data when dependencies change - but minimize this
  useEffect(() => {
    // Only update if we actually have data changes
    const updateConfirmedLogsWithData = async () => {
      const mapped = await mapConfirmedLogsWithData(confirmedLogs, reviewImages, pendingImages);
      setConfirmedLogsWithData(mapped);
    };

    if (confirmedLogs.length > 0) {
      updateConfirmedLogsWithData();
    }
  }, [confirmedLogs, reviewImages, pendingImages]); // Include all dependencies

  // Handle file uploads
  const uploadFiles = useCallback(async (files: File[]) => {
    const newImages: ImageData[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      url: URL.createObjectURL(file),
      extractedData: generateMockData(),
      isEditing: false,
      uploadStatus: 'pending' as const,
    }));

    // Add to pending immediately for optimistic UI
    setPendingImages((prev) => [...prev, ...newImages]);

    // Upload each file
    for (const image of newImages) {
      try {
        // Update status to uploading
        setPendingImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, uploadStatus: 'uploading' } : img
          )
        );

        const uploadResult = await s3UploadService.uploadFile(image.file!);

        if (uploadResult.success) {
          // Update with S3 information
          setPendingImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? {
                    ...img,
                    s3Key: uploadResult.key,
                    s3Url: uploadResult.url,
                    uploadStatus: 'success',
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
                    uploadStatus: 'error',
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
                  uploadStatus: 'error',
                  uploadError:
                    error instanceof Error ? error.message : 'Upload failed',
                }
              : img
          )
        );
      }
    }

    // Refetch pending data after a delay to sync with backend
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pending });
    }, 2000);
  }, [queryClient]);

  // Update image data
  const updateImageData = useCallback((imageId: string, updates: Partial<ImageData>) => {
    setReviewImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, ...updates } : img))
    );
  }, []);

  // Save image data
  const saveImageData = useCallback(async (imageId: string) => {
    const image = reviewImages.find((img) => img.id === imageId);
    if (!image?.extractedData) {
      throw new Error('No image or extracted data to save');
    }

    const diverObj = PITT_DIVERS.find((d) => d.name === image.extractedData.Name);
    const diverId = diverObj?.id || '';

    const payload: any = {
      name: image.extractedData.Name,
      training_data_id: image.id,
      diver_id: diverId,
      updated_json: image.extractedData,
    };

    if (image.session_date) {
      payload.session_date = image.session_date;
    }

    await updateTrainingData(payload);
    
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.review });
  }, [reviewImages, queryClient]);

  // Delete image
  const deleteImage = useCallback(async (imageId: string) => {
    await deleteTrainingData(imageId);
    
    // Remove from local state immediately
    setReviewImages((prev) => prev.filter((img) => img.id !== imageId));
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.review });
  }, [queryClient]);

  // Confirm image (move to confirmed)
  const confirmImage = useCallback(async (imageId: string) => {
    const image = reviewImages.find((img) => img.id === imageId);
    if (!image?.extractedData) {
      throw new Error('No image or extracted data to confirm');
    }

    // First save the data
    await saveImageData(imageId);

    // Create confirmed log entry
    const newLog: ConfirmedLog = {
      id: image.id,
      diverName: image.extractedData.Name,
      date: new Date().toLocaleDateString(),
      totalDives: image.extractedData.Dives?.length || 0,
      balks: 0,
      fileName: image.file?.name || image.s3Key || image.s3Url || image.id,
      s3Key: image.s3Key,
      s3Url: image.s3Url,
      extractedData: image.extractedData,
    };

    // Add to confirmed logs
    setConfirmedLogs((prev) => [newLog, ...prev]);
    
    // Remove from review
    setReviewImages((prev) => prev.filter((img) => img.id !== imageId));
    
    // Adjust current index if needed
    if (currentImageIndex >= reviewImages.length - 1) {
      setCurrentImageIndex(0);
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.confirmed });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.review });
  }, [reviewImages, currentImageIndex, saveImageData, queryClient]);

  // Add manual entry
  const addManualEntry = useCallback(async (data: DiveData) => {
    const diverObj = PITT_DIVERS.find((d) => d.name === data.Name);
    const diverId = diverObj?.id;

    if (!diverId) {
      throw new Error('Could not find diver ID for the selected diver');
    }

    // Clean the data for manual entries
    const cleanedData = {
      Name: data.Name,
      Dives: data.Dives.map((dive) => ({
        DiveCode: dive.DiveCode.trim(),
        DrillType: dive.DrillType,
        Board: dive.Board,
        Success: dive.Success,
        Reps: [], // Empty array for manual entries
      })).filter((dive) => dive.DiveCode && dive.Board && dive.DrillType),
      comment: data.comment || '',
      rating: data.rating,
      balks: data.balks || 0,
    };

    if (cleanedData.Dives.length === 0) {
      throw new Error('At least one valid dive is required');
    }

    const payload: any = {
      name: data.Name,
      diver_id: diverId,
      updated_json: cleanedData,
    };

    if (data.session_date) {
      payload.session_date = data.session_date;
    }

    const response = await updateTrainingData(payload);
    const createdItem = response.data || response;
    const newLogId = createdItem.id || `manual-${Date.now()}`;

    // Create new confirmed log entry
    const newLog: ConfirmedLog = {
      id: newLogId,
      diverName: data.Name,
      date: data.session_date
        ? (() => {
            const [year, month, day] = data.session_date.split('-').map(Number);
            return new Date(year, month - 1, day).toLocaleDateString();
          })()
        : new Date().toLocaleDateString(),
      totalDives: data.Dives?.length || 0,
      balks: data.balks || 0,
      fileName: `Manual Entry - ${data.Name}`,
      session_date: data.session_date,
      createdAt: createdItem.created_at,
      updatedAt: createdItem.updated_at,
      extractedData: cleanedData,
    };

    // Add to confirmed logs
    setConfirmedLogs((prev) => [newLog, ...prev]);

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.confirmed });
  }, [queryClient]);

  // Compute loading and error states
  const isLoading = pendingLoading || reviewLoading || confirmedLoading;
  const isRefetching = queryClient.isFetching({ queryKey: QUERY_KEYS.pending }) > 0 ||
                      queryClient.isFetching({ queryKey: QUERY_KEYS.review }) > 0 ||
                      queryClient.isFetching({ queryKey: QUERY_KEYS.confirmed }) > 0;
  
  const error = pendingError || reviewError || confirmedError;

  return {
    // Data
    pendingImages,
    reviewImages,
    confirmedLogs,
    confirmedLogsWithData,
    
    // Loading states
    isLoading,
    isRefetching,
    
    // Actions
    uploadFiles,
    updateImageData,
    saveImageData,
    deleteImage,
    confirmImage,
    addManualEntry,
    
    // UI state
    currentImageIndex,
    setCurrentImageIndex,
    
    // Error handling
    error: error as Error | null,
  };
}
