import { config } from "../config";
import { Auth as Amplify } from "aws-amplify";

export default async function getTrainingDataByStatus(status: string) {
  const session = await Amplify.currentSession();
  const token = session.getIdToken().getJwtToken();
  const res = await fetch(
    `${config.apiEndpoint}/api/training-data?status=${status}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch training data");
  return res.json();
}

/**
 * Fetch confirmed training logs and filter for a specific diver (by name or id)
 * @param diverName string (case-insensitive match)
 * @param diverId string (optional, if available)
 * @returns Promise<any[]>
 */
export async function getConfirmedLogsForDiver(
  diverName: string,
  diverId?: string
) {
  const result = await getTrainingDataByStatus("CONFIRMED");
  const logs = result.data || [];
  // Prefer diverId if available, else match by diverName (case-insensitive)
  return logs.filter((log: any) => {
    if (diverId && log.diver_id) {
      return String(log.diver_id) === String(diverId);
    }
    // fallback to name match
    return (
      log.diver_name &&
      log.diver_name.trim().toLowerCase() === diverName.trim().toLowerCase()
    );
  });
}
