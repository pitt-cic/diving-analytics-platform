import { config } from "../config";
import { Auth as Amplify } from "aws-amplify";

export default async function updateTrainingData(payload: {
  name: string;
  training_data_id: string;
  diver_id: string;
  updated_json: any;
}) {
  const session = await Amplify.currentSession();
  const token = session.getIdToken().getJwtToken();
  const res = await fetch(`${config.apiEndpoint}/api/training-data`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update training data");
  return res.json();
}
