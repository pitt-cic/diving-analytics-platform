import React, { useState, useEffect } from "react";
// import divingData from "../data/pitt_diving_data.json";
import { Diver } from "../types";
import { TeamOverview } from "../components/divers/TeamOverview";
import { config } from "../config";

// If divingData is used, replace with an empty array or placeholder for now
// const [divers, setDivers] = useState<Diver[]>([]);

const Dashboard: React.FC = () => {
  const [divers, setDivers] = useState<Diver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // First fetch the basic diver list
    fetch(`${config.apiEndpoint}/api/divers`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch divers");
        return res.json();
      })
      .then((basicDivers) => {
        // Then fetch detailed profiles for each diver
        const detailedDiversPromises = basicDivers.map((diver: Diver) =>
          fetch(`${config.apiEndpoint}/api/divers/${diver.id}`)
            .then((res) => {
              if (!res.ok) throw new Error(`Failed to fetch diver ${diver.id}`);
              return res.json();
            })
            .catch((err) => {
              console.warn(
                `Failed to fetch detailed profile for diver ${diver.id}:`,
                err
              );
              // Return basic diver data if detailed fetch fails
              return diver;
            })
        );

        Promise.all(detailedDiversPromises)
          .then((detailedDivers) => {
            // Filter out divers with missing or empty results
            const validDivers = detailedDivers.filter(
              (diver) =>
                Array.isArray(diver.results) && diver.results.length > 0
            );
            setDivers(validDivers);
            setLoading(false);
          })
          .catch((err) => {
            setError("Failed to load detailed diver data");
            setLoading(false);
          });
      })
      .catch((err) => {
        setError("Failed to load divers");
        setLoading(false);
      });
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
