import React from "react";

const ConfirmedLogCard: React.FC<{
  log: any;
  onClick: () => void;
  subtitleMode?: "diver" | "dives";
}> = ({ log, onClick, subtitleMode = "diver" }) => {
  const dateStr = log.date || "Unknown date";
  const dives = log.totalDives || 0;
  return (
    <button
      className="relative w-full h-40 rounded-lg overflow-hidden shadow border border-blue-100 group focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
      onClick={onClick}
      style={{ minHeight: 160 }}
    >
      {log.url ? (
        <img
          src={log.url}
          alt="Training sheet preview"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl">
          <span>No Image</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition" />
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-start">
        <span className="text-white text-lg font-bold drop-shadow">
          {dateStr}
        </span>
        {subtitleMode === "diver" && log.diverName && (
          <span className="text-white text-xs font-medium drop-shadow">
            {log.diverName}
          </span>
        )}
        {subtitleMode === "dives" && (
          <span className="text-white text-xs font-medium drop-shadow">
            {dives} {dives === 1 ? "dive" : "dives"}
          </span>
        )}
      </div>
    </button>
  );
};

// Minimal card: just image background, no overlays
export const MinimalLogCard: React.FC<{
  log: any;
  onClick: () => void;
}> = ({ log, onClick }) => (
  <button
    className="relative w-full h-40 rounded-lg overflow-hidden shadow border border-blue-100 group focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
    onClick={onClick}
    style={{ minHeight: 160 }}
  >
    {log.url ? (
      <img
        src={log.url}
        alt="Training sheet preview"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
      />
    ) : (
      <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl">
        <span>No Image</span>
      </div>
    )}
    <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition" />
  </button>
);

export default ConfirmedLogCard;
