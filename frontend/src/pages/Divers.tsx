import React, { useState, useEffect } from "react";
import divingData from "../data/pitt_diving_data.json";
import { Diver } from "../types";
import { SideNav } from "../components/divers/SideNav";
import { DiverProfile } from "../components/divers/DiverProfile";
import { useParams } from "react-router-dom";

// Mock training data generator
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

  const generateReps = (count: number) => {
    return Array.from({ length: count }, () =>
      Math.random() > 0.4 ? "O" : "X"
    );
  };

  // Generate sessions for the last 30 days
  const sessions = Array.from({ length: 15 }, (_, sessionIndex) => {
    const date = new Date();
    date.setDate(date.getDate() - sessionIndex * 2); // Sessions every 2 days

    const dives = Array.from(
      { length: Math.floor(Math.random() * 4) + 3 },
      () => {
        const repCount = Math.floor(Math.random() * 12) + 3;
        const reps = generateReps(repCount);
        const successCount = reps.filter((rep) => rep === "O").length;

        return {
          code: diveCodes[Math.floor(Math.random() * diveCodes.length)],
          drillType: drillTypes[Math.floor(Math.random() * drillTypes.length)],
          reps,
          success: successCount,
        };
      }
    );

    return {
      date: date.toISOString().split("T")[0],
      dives,
      balks: Math.floor(Math.random() * 3),
    };
  });

  // Calculate dive code statistics
  const diveCodeStats = sessions.reduce((stats, session) => {
    session.dives.forEach((dive) => {
      if (!stats[dive.code]) {
        stats[dive.code] = {
          totalReps: 0,
          successfulReps: 0,
          sessions: 0,
        };
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
      sum + session.dives.reduce((diveSum, dive) => diveSum + dive.success, 0),
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

const Divers: React.FC = () => {
  useEffect(() => {
    document.title = "Divers | DiveTracker";
  }, []);

  const [divers] = useState<Diver[]>(
    [...(divingData as Diver[])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((diver) => ({
        ...diver,
        training: generateMockTrainingData(),
      }))
  );

  const { diverId } = useParams<{ diverId?: string }>();

  const [sideNavOpen, setSideNavOpen] = useState<boolean>(true);

  const selectedDiver =
    divers.find((d) => d.name.toLowerCase().replace(/\s+/g, "-") === diverId) ||
    divers[0];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <SideNav
        divers={divers}
        selectedDiver={selectedDiver.id}
        isOpen={sideNavOpen}
        onToggle={() => setSideNavOpen(!sideNavOpen)}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {selectedDiver ? (
            <DiverProfile diver={selectedDiver} />
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
