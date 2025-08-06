import React from "react";

const ConfirmedLogCard: React.FC<{
  log: any;
  onClick: () => void;
  subtitleMode?: "diver" | "dives";
}> = ({ log, onClick, subtitleMode = "diver" }) => {
  // Get date from various possible sources
  const getDateStr = () => {
    console.log("[DEBUG] ConfirmedLogCard processing log:", {
      id: log.id,
      date: log.date,
      session_date: log.session_date,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    });

    if (log.date) {
      console.log("[DEBUG] Using log.date:", log.date);
      return log.date;
    }
    if (log.session_date) {
      try {
        const parsed = new Date(log.session_date);
        const result = parsed.toLocaleDateString();
        console.log("[DEBUG] Using session_date:", {
          original: log.session_date,
          parsed: parsed,
          result: result,
        });
        return result;
      } catch (e) {
        console.log("[DEBUG] Error parsing session_date:", e);
        return log.session_date;
      }
    }
    if (log.createdAt) {
      try {
        const result = new Date(log.createdAt).toLocaleDateString();
        console.log("[DEBUG] Using createdAt:", result);
        return result;
      } catch (e) {
        return log.createdAt;
      }
    }
    if (log.updatedAt) {
      try {
        const result = new Date(log.updatedAt).toLocaleDateString();
        console.log("[DEBUG] Using updatedAt:", result);
        return result;
      } catch (e) {
        return log.updatedAt;
      }
    }
    console.log("[DEBUG] No date found, using Unknown date");
    return "Unknown date";
  };

  const dateStr = getDateStr();
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
        <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
          <svg
            className="w-12 h-12"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
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
      <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
        <svg
          className="w-12 h-12"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    )}
    <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-40 transition" />
  </button>
);

export default ConfirmedLogCard;
