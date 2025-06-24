import React, { useState } from "react";
import divingData from "../data/pitt_diving_data.json";
import { Diver } from "../types";
import { TeamOverview } from "../components/divers/TeamOverview";

const Dashboard: React.FC = () => {
  const [divers] = useState<Diver[]>(divingData as Diver[]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 p-6 bg-gray-50 min-h-screen">
      <TeamOverview divers={divers} />
    </div>
  );
};

export default Dashboard;
