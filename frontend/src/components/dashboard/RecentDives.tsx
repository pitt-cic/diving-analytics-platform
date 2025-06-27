import React from 'react';

interface Dive {
  id: string;
  dive_code: string;
  name: string;
  score: number;
  date: string;
  diver_name: string;
  is_competition: boolean;
}

interface RecentDivesProps {
  dives: Dive[];
  className?: string;
}

const RecentDives: React.FC<RecentDivesProps> = ({
  dives,
  className = '',
}) => {
  return (
    <div className={`dashboard-card ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Dives</h3>
      
      <div className="space-y-4">
        {dives.length === 0 ? (
          <p className="text-gray-500">No recent dives found.</p>
        ) : (
          dives.map((dive) => (
            <div key={dive.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="font-medium">{dive.dive_code}</span>
                  <span className="ml-2 text-sm text-gray-500">{dive.name}</span>
                  {dive.is_competition && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Competition
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  <span>{dive.diver_name}</span>
                  <span className="mx-1">•</span>
                  <span>{new Date(dive.date).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-50 text-primary-700 font-medium">
                {dive.score.toFixed(1)}
              </div>
            </div>
          ))
        )}
      </div>
      
      {dives.length > 0 && (
        <div className="mt-4">
          <button className="btn-secondary w-full">View All Dives</button>
        </div>
      )}
    </div>
  );
};

export default RecentDives;