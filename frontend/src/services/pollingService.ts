import getTrainingDataByStatus from "./getTrainingDataByStatus";
import { mapApiToImageDataWithSignedUrl } from "./dataFormatters";

export interface PollingState {
  isPolling: boolean;
  pollingError: string | null;
  consecutiveEmptyPolls: number;
  pollInterval: number;
}

export interface PollingCallbacks {
  onPendingImagesUpdate: (images: any[]) => void;
  onReviewImagesUpdate: (images: any[]) => void;
  onPollingStateChange: (state: PollingState) => void;
}

export class PollingService {
  private intervalRef: NodeJS.Timeout | null = null;
  private pendingImagesRef: any[] = [];
  private reviewImagesRef: any[] = [];
  private callbacks: PollingCallbacks;
  private state: PollingState = {
    isPolling: false,
    pollingError: null,
    consecutiveEmptyPolls: 0,
    pollInterval: 1000,
  };

  constructor(callbacks: PollingCallbacks) {
    this.callbacks = callbacks;
  }

  updateRefs(pendingImages: any[], reviewImages: any[]) {
    this.pendingImagesRef = pendingImages;
    this.reviewImagesRef = reviewImages;
  }

  startPolling(pendingImages: any[]) {
    if (pendingImages.length === 0) {
      this.stopPolling();
      return;
    }

    this.stopPolling();
    this.updateRefs(pendingImages, this.reviewImagesRef);

    const startPolling = async () => {
      this.setState({ isPolling: true, pollingError: null });

      try {
        const review = await getTrainingDataByStatus("PENDING_REVIEW");
        const localPendingIds = this.pendingImagesRef.map((img: any) =>
          String(img.id)
        );
        const backendReviewIds = (review.data || []).map((item: any) =>
          String(item.id)
        );

        console.log("[Polling] Local pending IDs:", localPendingIds);
        console.log("[Polling] Backend review IDs:", backendReviewIds);
        console.log(
          "[Polling] Current review count:",
          this.reviewImagesRef.length
        );

        const reviewIds = new Set(backendReviewIds);
        const toMove = this.pendingImagesRef.filter((img: any) =>
          reviewIds.has(String(img.id))
        );

        console.log(
          "[Polling] Images to move from pending to review:",
          toMove.map((img: any) => img.id)
        );

        // Adaptive polling based on activity
        if (toMove.length === 0) {
          this.setState({
            consecutiveEmptyPolls: this.state.consecutiveEmptyPolls + 1,
          });

          // Increase interval if no changes detected for multiple polls
          if (this.state.consecutiveEmptyPolls >= 3) {
            const newInterval = Math.min(this.state.pollInterval * 1.5, 10000); // Max 10 seconds
            if (newInterval !== this.state.pollInterval) {
              this.setState({ pollInterval: newInterval });
              console.log(
                `[Polling] No activity detected, increasing interval to ${newInterval}ms`
              );
            }
          }
        } else {
          // Reset to fast polling when activity is detected
          this.setState({ consecutiveEmptyPolls: 0 });
          if (this.state.pollInterval !== 1000) {
            this.setState({ pollInterval: 1000 });
            console.log(
              "[Polling] Activity detected, resetting to fast polling (1000ms)"
            );
          }
        }

        // Add new review images FIRST - only add those that were previously in pending
        const newReviewImages = (review.data || []).filter((item: any) => {
          // Check if this item was in our pending list
          const wasInPending = this.pendingImagesRef.some(
            (img: any) => String(img.id) === String(item.id)
          );
          // Also check if it's not already in our review list
          const notInReview = !this.reviewImagesRef.some(
            (img: any) => String(img.id) === String(item.id)
          );

          console.log(`[Polling] Checking item ${item.id}:`, {
            wasInPending,
            notInReview,
            pendingIds: this.pendingImagesRef.map((img: any) => img.id),
            reviewIds: this.reviewImagesRef.map((img: any) => img.id),
          });

          return wasInPending && notInReview;
        });

        if (newReviewImages.length > 0) {
          console.log(
            "[Polling] Adding to review:",
            newReviewImages.map((item: any) => item.id)
          );
          const mapped = await Promise.all(
            newReviewImages.map(mapApiToImageDataWithSignedUrl)
          );

          // Final check to avoid duplicates
          const uniqueMapped = mapped.filter(
            (newImg: any) =>
              !this.reviewImagesRef.some(
                (existingImg: any) =>
                  String(existingImg.id) === String(newImg.id)
              )
          );

          if (uniqueMapped.length > 0) {
            console.log(
              "[Polling] Adding unique images to review:",
              uniqueMapped.map((img: any) => img.id)
            );
            this.callbacks.onReviewImagesUpdate([
              ...this.reviewImagesRef,
              ...uniqueMapped,
            ]);
          } else {
            console.log(
              "[Polling] All images were duplicates, not adding to review"
            );
          }
        }

        // Update pending images AFTER adding to review - remove those that are now in review
        const updatedPending = this.pendingImagesRef.filter(
          (img: any) => !reviewIds.has(String(img.id))
        );
        this.callbacks.onPendingImagesUpdate(updatedPending);
      } catch (error: any) {
        console.error("[Polling] Error fetching review data:", error);
        this.setState({
          pollingError: error.message || "Failed to fetch review data",
        });
      } finally {
        this.setState({ isPolling: false });
      }
    };

    // Start the polling interval
    this.intervalRef = setInterval(startPolling, this.state.pollInterval);

    console.log(
      `[Polling] Started polling with ${this.state.pollInterval}ms interval, ${pendingImages.length} pending images`
    );
  }

  stopPolling() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
      console.log("[Polling] Stopped polling");
    }
  }

  private setState(newState: Partial<PollingState>) {
    this.state = { ...this.state, ...newState };
    this.callbacks.onPollingStateChange(this.state);
  }

  getState(): PollingState {
    return this.state;
  }

  destroy() {
    this.stopPolling();
  }
}
