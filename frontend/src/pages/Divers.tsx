import React, { useState, useEffect } from "react";
import { Diver } from "../types";
import { SideNav } from "../components/divers/SideNav";
import { DiverProfile } from "../components/divers/DiverProfile";
import { useParams } from "react-router-dom";
import { config } from "../config";

const Divers: React.FC = () => {
  useEffect(() => {
    document.title = "Divers | DiveTracker";
  }, []);

  const [divers, setDivers] = useState<Diver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New state for selected diver profile
  const [selectedDiverProfile, setSelectedDiverProfile] =
    useState<Diver | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${config.apiEndpoint}/api/divers`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch divers");
        return res.json();
      })
      .then((data) => {
        setDivers(data); // Adjust if the API response is wrapped in a property
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load divers");
        setLoading(false);
      });
  }, []);

  const { diverId } = useParams<{ diverId?: string }>();
  const [sideNavOpen, setSideNavOpen] = useState<boolean>(true);

  // Find the diver object by diverId (for SideNav selection)
  const selectedDiver =
    divers.find((d) => d.name.toLowerCase().replace(/\s+/g, "-") === diverId) ||
    divers[0];

  // --- MOCK TRAINING DATA GENERATOR ---
  const generateMockTrainingData = () => {
    const diveCodes = [
      "10B",
      "100B",
      "200B",
      "300B",
      "400B",
      "500B",
      "600",
      "300S",
    ];
    const drillTypes = ["A", "TO", "CON", "S", "CO", "ADJ", "RIP", "UW"];
    const generateReps = (count: number) =>
      Array.from({ length: count }, () => (Math.random() > 0.4 ? "O" : "X"));
    const sessions = Array.from({ length: 15 }, (_, sessionIndex) => {
      const date = new Date();
      date.setDate(date.getDate() - sessionIndex * 2);
      const dives = Array.from(
        { length: Math.floor(Math.random() * 4) + 3 },
        () => {
          const repCount = Math.floor(Math.random() * 12) + 3;
          const reps = generateReps(repCount);
          const successCount = reps.filter((rep) => rep === "O").length;
          return {
            code: diveCodes[Math.floor(Math.random() * diveCodes.length)],
            drillType:
              drillTypes[Math.floor(Math.random() * drillTypes.length)],
            reps,
            success: successCount,
            confidence: Math.random() * 0.7 + 0.3,
          };
        }
      );
      return {
        date: date.toISOString().split("T")[0],
        dives,
        balks: Math.floor(Math.random() * 3),
      };
    });
    const diveCodeStats = sessions.reduce((stats, session) => {
      session.dives.forEach((dive) => {
        if (!stats[dive.code]) {
          stats[dive.code] = { totalReps: 0, successfulReps: 0, sessions: 0 };
        }
        stats[dive.code].totalReps += dive.reps.length;
        stats[dive.code].successfulReps += dive.success;
        stats[dive.code].sessions += 1;
      });
      return stats;
    }, {} as Record<string, { totalReps: number; successfulReps: number; sessions: number }>);
    const totalDives = sessions.reduce(
      (sum, session) => sum + session.dives.length,
      0
    );
    const totalSuccess = sessions.reduce(
      (sum, session) =>
        sum +
        session.dives.reduce((diveSum, dive) => diveSum + dive.success, 0),
      0
    );
    const totalReps = sessions.reduce(
      (sum, session) =>
        sum +
        session.dives.reduce((diveSum, dive) => diveSum + dive.reps.length, 0),
      0
    );
    return {
      sessions,
      totalDives,
      successRate: Math.round((totalSuccess / totalReps) * 100),
      diveCodeStats,
    };
  };
  // --- END MOCK TRAINING DATA GENERATOR ---

  // Fetch diver profile when diverId or selectedDiver changes
  useEffect(() => {
    if (!selectedDiver) return;
    setProfileLoading(true);
    setProfileError(null);
    fetch(`${config.apiEndpoint}/api/divers/${selectedDiver.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch diver profile");
        return res.json();
      })
      .then((data) => {
        // Add mock training data if missing
        if (!data.training) {
          data.training = generateMockTrainingData();
        }
        setSelectedDiverProfile(data);
        setProfileLoading(false);
      })
      .catch((err) => {
        setProfileError("Failed to load diver profile");
        setProfileLoading(false);
      });
  }, [selectedDiver]);

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
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <SideNav
        divers={divers}
        selectedDiver={selectedDiver?.id}
        isOpen={sideNavOpen}
        onToggle={() => setSideNavOpen(!sideNavOpen)}
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {profileLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
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
                  Loading diver profile...
                </div>
              </div>
            </div>
          ) : profileError ? (
            <div className="text-center text-red-500">{profileError}</div>
          ) : selectedDiverProfile ? (
            <DiverProfile diver={selectedDiverProfile} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Diver not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Divers;
