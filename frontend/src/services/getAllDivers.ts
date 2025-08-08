import {config} from "../config";
import {Auth as Amplify} from "aws-amplify";
import {DiverFromAPI} from "../types";

export default async function getAllDivers(): Promise<DiverFromAPI[]> {
  const session = await Amplify.currentSession();
  const token = session.getIdToken().getJwtToken();
  
  const res = await fetch(`${config.apiEndpoint}/api/divers`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch divers: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}
