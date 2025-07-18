import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";
import { Diver } from "../../types";

interface SideNavProps {
  divers: Diver[];
  selectedDiver: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const SideNav: React.FC<SideNavProps> = ({
  divers,
  selectedDiver,
  isOpen,
  onToggle,
}) => {
  const navRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    const nav = navRef.current;
    if (!nav) return;
    setCanScrollUp(nav.scrollTop > 0);
    setCanScrollDown(nav.scrollTop + nav.clientHeight < nav.scrollHeight - 1);
  };

  useEffect(() => {
    checkScroll();
    const nav = navRef.current;
    if (!nav) return;
    nav.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      nav.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [divers.length, isOpen]);

  const handleSeeMoreDown = () => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollBy({ top: nav.clientHeight, behavior: "smooth" });
  };

  const handleSeeMoreUp = () => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollBy({ top: -nav.clientHeight, behavior: "smooth" });
  };

  return (
    <div
      className={`hidden mb-4 lg:flex lg:flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-300 ${
        isOpen ? "w-64" : "w-16"
      } flex-shrink-0 flex flex-col`}
    >
      <div className="px-4 pt-2">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
        >
          {isOpen ? (
            <ChevronLeftIcon className="h-5 w-5" />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {canScrollUp && (
        <div className="p-2">
          <button
            onClick={handleSeeMoreUp}
            className="w-full bg-blue-100 text-blue-700 rounded-lg py-2 text-sm font-medium hover:bg-blue-200 transition"
          >
            See more
          </button>
        </div>
      )}

      <nav
        ref={navRef}
        className="px-2 space-y-1 flex-1 flex flex-col overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 80px)" }}
      >
        {[...divers]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((diver) => (
            <Link
              key={diver.id}
              to={`/divers/${diver.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${!isOpen ? "justify-center" : "justify-start"}
              ${
                selectedDiver === diver.id
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  diver.gender === "M"
                    ? "bg-blue-500 text-white"
                    : "bg-pink-500 text-white"
                }`}
              >
                {(() => {
                  const parts = diver.name.trim().split(/\s+/);
                  if (parts.length === 1) return parts[0][0];
                  return parts[0][0] + parts[parts.length - 1][0];
                })()}
              </div>
              {isOpen && (
                <div className="ml-3 text-left">
                  <p className="font-medium">{diver.name}</p>
                  <p className="text-xs text-gray-500">{diver.city_state}</p>
                </div>
              )}
            </Link>
          ))}
      </nav>

      {canScrollDown && (
        <div className="p-2">
          <button
            onClick={handleSeeMoreDown}
            className="w-full bg-blue-100 text-blue-700 rounded-lg py-2 text-sm font-medium hover:bg-blue-200 transition"
          >
            See more
          </button>
        </div>
      )}
    </div>
  );
};
