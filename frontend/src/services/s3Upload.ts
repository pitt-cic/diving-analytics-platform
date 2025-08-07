import { Storage } from "aws-amplify";
import { config } from "../config";

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export class S3UploadService {
  private bucketName: string;

  constructor() {
    this.bucketName = config.aws.mediaBucket;
  }

  /**
   * Upload a file to S3
   * @param file - The file to upload
   * @param key - Optional custom key for the file (if not provided, will generate one)
   * @returns Promise<UploadResult>
   */
  async uploadFile(
    file: File,
    key?: string,
    isCompetition?: boolean
  ): Promise<UploadResult> {
    try {
      const fileKey = key || this.generateFileKey(file, isCompetition === true);

      await Storage.put(fileKey, file, {
        contentType: file.type,
        level: "public",
        progressCallback: (progress: { loaded: number; total: number }) => {
          console.log(
            `Upload progress: ${progress.loaded}/${
              progress.total
            } (${Math.round((progress.loaded / progress.total) * 100)}%)`
          );
        },
      });

      const url = await Storage.get(fileKey, {
        level: "public",
      });

      return {
        success: true,
        key: fileKey,
        url: url as string,
      };
    } catch (error) {
      console.error("S3 upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown upload error",
      };
    }
  }

  /**
   * Upload multiple files to S3
   * @param files - Array of files to upload
   * @returns Promise<UploadResult[]>
   */
  async uploadFiles(files: File[]): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }

  /**
   * Generate a unique file key for S3
   * @param file - The file to generate a key for
   * @returns string - The generated key
   */
  private generateFileKey(
    file: File,
    competitionSuffix: boolean = false
  ): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop() || "";
    const base = `${timestamp}-${randomId}`;
    const suffix = competitionSuffix ? "_competition" : "";
    return `${base}${suffix}.${fileExtension}`;
  }

  /**
   * Delete a file from S3
   * @param key - The S3 key of the file to delete
   * @returns Promise<boolean>
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      await Storage.remove(key, {
        level: "public",
      });
      return true;
    } catch (error) {
      console.error("S3 delete error:", error);
      return false;
    }
  }

  /**
   * Get the public URL of a file (if it's publicly accessible)
   * @param key - The S3 key of the file
   * @returns Promise<string | null>
   */
  async getFileUrl(key: string): Promise<string | null> {
    try {
      const url = await Storage.get(key, {
        level: "public",
      });
      return url as string;
    } catch (error) {
      console.error("Error getting file URL:", error);
      return null;
    }
  }
}

export const s3UploadService = new S3UploadService();
