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
