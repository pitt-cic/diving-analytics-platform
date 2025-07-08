import React, { useState, useEffect, useContext } from "react";
import { Diver } from "../types";
import { TeamOverview } from "../components/divers/TeamOverview";
import { config } from "../config";
import { Auth as Amplify } from "aws-amplify";
import Header from "../components/layout/Header";
import { Link } from "react-router-dom";
import { SidebarContext } from "../components/layout/AppLayout";
import { PlusIcon } from "@heroicons/react/24/outline";

// If divingData is used, replace with an empty array or placeholder for now
// const [divers, setDivers] = useState<Diver[]>([]);

const Dashboard: React.FC = () => {
  const { onOpenSidebar } = useContext(SidebarContext)!;
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

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Complete diving team overview and performance analytics"
        right={
          <Link
            to="/dive-log"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            Add Log
            <PlusIcon className="h-5 w-5 ml-1" />
          </Link>
        }
        onOpenSidebar={onOpenSidebar}
      />
      {loading ? (
        <div className="p-8 flex items-center justify-center min-h-screen">
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
      ) : error ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : (
        <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
          <TeamOverview divers={divers} />
        </div>
      )}
    </>
  );
};

export default Dashboard;
