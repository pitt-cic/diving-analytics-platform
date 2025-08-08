/**
 * Get a presigned URL for an S3 object using the authenticated user's token
 * @param s3Url - The S3 URL or key to generate a presigned URL for
 * @returns Promise<string | null> - The presigned URL or null if error
 */
import { Storage } from "aws-amplify";

export default async function getPresignedUrl(
  s3Key: string // This should be the full key, e.g., 'private/abc123/myfile.jpg'
): Promise<string | null> {
  try {
    // Optionally, you can check if the key starts with 'private/{identityId}/'
    // const credentials = await Auth.currentCredentials();
    // const identityId = credentials.identityId;
    // if (!s3Key.startsWith(`private/${identityId}/`)) {
    //   console.warn("S3 key does not match current user identityId.");
    //   return null;
    // }

    const url = await Storage.get(s3Key, {
      level: "public",
      expires: 3600,
    });

    return url as string;
  } catch (error) {
    console.error("Error getting presigned URL:", error);
    return null;
  }
}
