import getPresignedUrl from "./getPresignedUrl";
import getAllDivers from "./getAllDivers";
import type {DiveData} from "../types/index";

export interface ImageData {
    id: string;
    file: File;
    url: string;
    extractedData: DiveData;
    isEditing: boolean;
    s3Key?: string;
    s3Url?: string;
    uploadStatus?: "pending" | "uploading" | "success" | "error";
    uploadError?: string;
    session_date?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ConfirmedLog {
    id: string;
    diverName: string;
    date: string;
    totalDives: number;
    balks: number;
    fileName: string;
    s3Key?: string;
    s3Url?: string;
    session_date?: string;
    createdAt?: string;
    updatedAt?: string;
    extractedData?: DiveData;
}

/**
 * Enhanced S3 key extraction with better error handling
 */
export function extractS3KeyFromUrl(s3Url: string): string | null {
    if (!s3Url || typeof s3Url !== 'string') {
        return null;
    }

    try {
        const url = new URL(s3Url);
        const pathname = url.pathname;
        return pathname.startsWith("/") ? pathname.slice(1) : pathname;
    } catch (error) {
        console.warn(`Failed to extract S3 key from URL: ${s3Url}`, error);
        return null;
    }
}

/**
 * Mock data generator with improved randomization
 */
export const generateMockData = async (): Promise<DiveData> => {
    let divers;
    try {
        divers = await getAllDivers();
    } catch (error) {
        console.error("Error fetching divers for mock data:", error);
        // Fallback to a default diver if API fails
        divers = [{id: "1", name: "Test Diver"}];
    }

    const randomDiver = divers[Math.floor(Math.random() * divers.length)];
    const diveCodes = ["10B", "100B", "200B", "300B", "400B", "500B", "600", "300S"];
    const drillTypes = ["A", "TO", "CON", "S", "CO", "ADJ", "RIP", "UW"];
    const boards = ["1M", "3M", "5M", "7.5M", "10M"];

    const generateReps = (count: number): string[] => {
        return Array.from({length: count}, () => Math.random() > 0.4 ? "O" : "X");
    };

    const diveCount = Math.floor(Math.random() * 4) + 3;
    const dives = Array.from({length: diveCount}, () => {
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
    });

    return {
        Name: randomDiver.name,
        Dives: dives,
        comment: "",
        rating: undefined,
        balks: 0,
    };
};

/**
 * Parse JSON output with better error handling
 */
export function parseJsonOutput(jsonOutput: any, fallbackData: Partial<DiveData> = {}): DiveData {
    const defaultData: DiveData = {
        Name: fallbackData.Name || "",
        Dives: [],
        comment: "",
        rating: undefined,
        balks: 0,
    };

    if (!jsonOutput) {
        return {...defaultData, ...fallbackData};
    }

    try {
        const parsed = typeof jsonOutput === "string" ? JSON.parse(jsonOutput) : jsonOutput;

        // Handle different API response formats
        const extractedData: DiveData = {
            Name: parsed.Name || parsed.diver_info?.name || fallbackData.Name || "",
            Dives: (parsed.Dives || parsed.dives || []).map((d: any) => ({
                DiveCode: d.dive_skill || d.code || d.DiveCode || "",
                DrillType: d.area_of_dive || d.drillType || d.DrillType || "",
                Board: d.board || d.Board || "",
                Reps: d.attempts || d.reps || d.Reps || [],
                Success: d.success_rate || d.success || d.Success || "",
            })),
            comment: parsed.comment || fallbackData.comment || "",
            rating: parsed.rating || fallbackData.rating || undefined,
            balks: parsed.balks ?? fallbackData.balks ?? 0,
        };

        return extractedData;
    } catch (error) {
        console.warn("Failed to parse JSON output:", error, jsonOutput);
        return {...defaultData, ...fallbackData};
    }
}

/**
 * Enhanced API to ImageData mapper
 */
export async function mapApiToImageDataWithSignedUrl(item: any): Promise<ImageData> {
    const s3Key = item.s3_url ? extractS3KeyFromUrl(item.s3_url) : null;
    let imageUrl = "";

    if (s3Key) {
        imageUrl = (await getPresignedUrl(s3Key)) || "";
    }

    const fallbackData = {
        Name: item.diver_name || "",
        balks: item.balks ?? 0,
        comment: item.comment || "",
        rating: item.rating || undefined,
    };

    const extractedData = parseJsonOutput(item.json_output, fallbackData);

    return {
        id: item.id,
        file: new File([], 'api-data'), // Create empty file for API data
        url: imageUrl,
        extractedData,
        isEditing: false,
        s3Key: s3Key || undefined,
        s3Url: item.s3_url,
        uploadStatus: "success",
        session_date: item.session_date || undefined,
        createdAt: item.created_at || undefined,
        updatedAt: item.updated_at || undefined,
    };
}

/**
 * Enhanced API to ConfirmedLog mapper
 */
export function mapApiToConfirmedLog(item: any): ConfirmedLog {
    const fallbackData = {
        Name: item.diver_name || "",
        balks: item.balks ?? 0,
        comment: item.comment || "",
        rating: item.rating || undefined,
    };

    const extractedData = parseJsonOutput(item.json_output, fallbackData);

    // Parse date with better handling
    let displayDate = "";
    if (item.session_date) {
        try {
            const [year, month, day] = item.session_date.split("-").map(Number);
            displayDate = new Date(year, month - 1, day).toLocaleDateString();
        } catch (error) {
            console.warn("Failed to parse session_date:", item.session_date);
            displayDate = item.session_date;
        }
    } else if (item.updated_at) {
        try {
            displayDate = new Date(item.updated_at).toLocaleDateString();
        } catch (error) {
            console.warn("Failed to parse updated_at:", item.updated_at);
        }
    }

    return {
        id: item.id,
        diverName: extractedData.Name,
        date: displayDate,
        totalDives: extractedData.Dives?.length || 0,
        balks: 0, // Removed from ConfirmedLog interface
        fileName: item.s3_key || item.s3_url || item.id,
        s3Key: item.s3_key,
        s3Url: item.s3_url,
        session_date: item.session_date || undefined,
        createdAt: item.created_at || undefined,
        updatedAt: item.updated_at || undefined,
        extractedData,
    };
}

/**
 * Enhanced confirmed logs mapper with better URL handling
 */
export async function mapConfirmedLogsWithData(
    confirmedLogs: ConfirmedLog[],
    reviewImages: ImageData[],
    pendingImages: ImageData[]
): Promise<(ConfirmedLog & { url?: string; extractedData?: DiveData })[]> {
    const allImages = [...reviewImages, ...pendingImages];

    const mapped = await Promise.all(
        confirmedLogs.map(async (log) => {
            let url: string | undefined;
            let extractedData: DiveData | undefined;

            // First, check if we have this image in our current data
            const foundImage = allImages.find((img) => img.id === log.id);

            if (foundImage?.url) {
                url = foundImage.url;
                extractedData = foundImage.extractedData;
            } else {
                // Try to get URL from S3 key or URL
                if (log.s3Key) {
                    const fetchedUrl = await getPresignedUrl(log.s3Key);
                    if (fetchedUrl) url = fetchedUrl;
                } else if (log.s3Url) {
                    const key = extractS3KeyFromUrl(log.s3Url);
                    if (key) {
                        const fetchedUrl = await getPresignedUrl(key);
                        if (fetchedUrl) url = fetchedUrl;
                    }
                }
            }

            // Use extractedData from log if not found in images
            if (!extractedData) {
                extractedData = log.extractedData;
            }

            return {
                ...log,
                url,
                extractedData,
            };
        })
    );

    // Sort by date (newest first)
    return mapped.sort((a, b) => {
        const dateA = a.session_date || a.createdAt || "";
        const dateB = b.session_date || b.createdAt || "";

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
}

/**
 * Batch process multiple items with error handling
 */
export async function batchMapApiToImageData(items: any[]): Promise<ImageData[]> {
    const results = await Promise.allSettled(
        items.map(mapApiToImageDataWithSignedUrl)
    );

    const successful: ImageData[] = [];
    const failed: any[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            successful.push(result.value);
        } else {
            failed.push({item: items[index], error: result.reason});
            console.error(`Failed to map item at index ${index}:`, result.reason);
        }
    });

    if (failed.length > 0) {
        console.warn(`Failed to map ${failed.length} out of ${items.length} items`);
    }

    return successful;
}
