import { config } from "../config";
import { Auth as Amplify } from "aws-amplify";

export default async function deleteTrainingData(trainingDataId: string) {
  const session = await Amplify.currentSession();
  const token = session.getIdToken().getJwtToken();
  const res = await fetch(
    `${config.apiEndpoint}/api/training-data/${trainingDataId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to delete training data");
  return res.json();
}
