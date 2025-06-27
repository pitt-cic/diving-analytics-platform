import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DivePerformanceChartProps {
  title: string;
  diveCode: string;
  practiceData: number[];
  competitionData: number[];
  labels: string[];
  className?: string;
}

const DivePerformanceChart: React.FC<DivePerformanceChartProps> = ({
  title,
  diveCode,
  practiceData,
  competitionData,
  labels,
  className = '',
}) => {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${title} - ${diveCode}`,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 10,
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'Practice',
        data: practiceData,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Competition',
        data: competitionData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  return (
    <div className={`dashboard-card ${className}`}>
      <Line options={options} data={data} />
    </div>
  );
};

export default DivePerformanceChart;