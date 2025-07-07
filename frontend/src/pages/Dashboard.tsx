import React, { useState, useEffect } from "react";
// import divingData from "../data/pitt_diving_data.json";
import { Diver } from "../types";
import { TeamOverview } from "../components/divers/TeamOverview";
import { config } from "../config";
import { Auth as Amplify } from "aws-amplify";

// If divingData is used, replace with an empty array or placeholder for now
// const [divers, setDivers] = useState<Diver[]>([]);

const Dashboard: React.FC = () => {
  const [divers, setDivers] = useState<Diver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const fetchDivers = async () => {
      try {
        const session = await Amplify.currentSession();
        const token = session.getIdToken().getJwtToken();
        // First fetch the basic diver list
        const res = await fetch(`${config.apiEndpoint}/api/divers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch divers");
        const basicDivers = await res.json();
        // Then fetch detailed profiles for each diver
        const detailedDiversPromises = basicDivers.map(async (diver: Diver) => {
          try {
            const res = await fetch(
              `${config.apiEndpoint}/api/divers/${diver.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!res.ok) throw new Error(`Failed to fetch diver ${diver.id}`);
            return await res.json();
          } catch (err) {
            console.warn(
              `Failed to fetch detailed profile for diver ${diver.id}:`,
              err
            );
            // Return basic diver data if detailed fetch fails
            return diver;
          }
        });
        const detailedDivers = await Promise.all(detailedDiversPromises);
        // Filter out divers with missing or empty results
        const validDivers = detailedDivers.filter(
          (diver) => Array.isArray(diver.results) && diver.results.length > 0
        );
        setDivers(validDivers);
        setLoading(false);
      } catch (err) {
        setError("Failed to load divers");
        setLoading(false);
      }
    };
    fetchDivers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-500 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <div className="text-center text-gray-500 text-lg">
            Loading divers...
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 p-6 bg-gray-50 min-h-screen">
      <TeamOverview divers={divers} />
    </div>
  );
};

export default Dashboard;
