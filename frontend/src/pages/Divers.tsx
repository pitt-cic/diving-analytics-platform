import React, { useState, useEffect, useContext } from "react";
import { Diver } from "../types";
import { SideNav } from "../components/divers/SideNav";
import { DiverProfile } from "../components/divers/DiverProfile";
import { useParams, Link } from "react-router-dom";
import { config } from "../config";
import { Auth as Amplify } from "aws-amplify";
import Header from "../components/layout/Header";
import { SidebarContext } from "../components/layout/AppLayout";
import { PlusIcon } from "@heroicons/react/24/outline";

const Divers: React.FC = () => {
  useEffect(() => {
    document.title = "Divers | DiveTracker";
  }, []);

  const { onOpenSidebar } = useContext(SidebarContext)!;
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
    const fetchDivers = async () => {
      try {
        const session = await Amplify.currentSession();
        const token = session.getIdToken().getJwtToken();
        const res = await fetch(`${config.apiEndpoint}/api/divers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch divers");
        const data = await res.json();
        setDivers(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load divers");
        setLoading(false);
      }
    };
    fetchDivers();
  }, []);

  const { diverId } = useParams<{ diverId?: string }>();
  const [sideNavOpen, setSideNavOpen] = useState<boolean>(true);

  // Find the diver object by diverId (for SideNav selection)
  const selectedDiver =
    divers.find((d) => d.name.toLowerCase().replace(/\s+/g, "-") === diverId) ||
    divers[0];

  // Fetch diver profile when diverId or selectedDiver changes
  useEffect(() => {
    if (!selectedDiver) return;
    setProfileLoading(true);
    setProfileError(null);
    const fetchProfile = async () => {
      try {
        const session = await Amplify.currentSession();
        const token = session.getIdToken().getJwtToken();
        const res = await fetch(
          `${config.apiEndpoint}/api/divers/${selectedDiver.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch diver profile");
        const data = await res.json();
        setSelectedDiverProfile(data);
        setProfileLoading(false);
      } catch (err) {
        setProfileError("Failed to load diver profile");
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [selectedDiver]);

  return (
    <>
      <Header
        title="Divers"
        subtitle="View your divers competition and training data"
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
        <div className="p-8 flex h-[calc(100vh-4rem)] bg-gray-50">
          <SideNav
            divers={divers}
            selectedDiver={selectedDiver?.id}
            isOpen={sideNavOpen}
            onToggle={() => setSideNavOpen(!sideNavOpen)}
          />
          <div className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto md:px-8">
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
      )}
    </>
  );
};

export default Divers;
