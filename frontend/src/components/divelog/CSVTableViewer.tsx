import React, { useState, useMemo } from "react";
import { Download, ChevronUp, ChevronDown } from "lucide-react";

interface DiveEntry {
  DiveCode: string;
  DrillType: string;
  Success: string;
}

interface DiveData {
  Name: string;
  Balks: number;
  Dives: DiveEntry[];
}

interface CSVTableViewerProps {
  diveData: DiveData;
}

interface TableRow {
  diverName: string;
  balks: number;
  diveCode: string;
  drillType: string;
  successRate: string;
}

export const CSVTableViewer: React.FC<CSVTableViewerProps> = ({ diveData }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TableRow;
    direction: "asc" | "desc";
  } | null>(null);

  // Convert dive data to table rows
  const tableRows: TableRow[] = useMemo(() => {
    const rows: TableRow[] = [];

    diveData.Dives.forEach((dive) => {
      rows.push({
        diverName: diveData.Name,
        balks: diveData.Balks,
        diveCode: dive.DiveCode,
        drillType: dive.DrillType,
        successRate: dive.Success,
      });
    });

    return rows;
  }, [diveData]);

  // Sort table rows
  const sortedRows = useMemo(() => {
    if (!sortConfig) return tableRows;

    return [...tableRows].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      return 0;
    });
  }, [tableRows, sortConfig]);

  // Handle column sorting
  const handleSort = (key: keyof TableRow) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  // Get sort icon for column
  const getSortIcon = (key: keyof TableRow) => {
    if (sortConfig?.key !== key) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-blue-600" />
    );
  };

  // Convert to CSV and download
  const downloadCSV = () => {
    const headers = [
      "Diver Name",
      "Balks",
      "Dive Code",
      "Drill Type",
      "Success Rate",
    ];
    const csvContent = [
      headers.join(","),
      ...sortedRows.map((row) =>
        [
          `"${row.diverName}"`,
          row.balks,
          `"${row.diveCode}"`,
          `"${row.drillType}"`,
          `"${row.successRate}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${diveData.Name}_training_data.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Training Data Table</h4>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: "diverName" as keyof TableRow, label: "Diver Name" },
                { key: "balks" as keyof TableRow, label: "Balks" },
                { key: "diveCode" as keyof TableRow, label: "Dive Code" },
                { key: "drillType" as keyof TableRow, label: "Drill Type" },
                { key: "successRate" as keyof TableRow, label: "Success Rate" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort(key)}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {getSortIcon(key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedRows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {row.diverName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.balks}</td>
                <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                  {row.diveCode}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {row.drillType}
                </td>
                <td className="px-4 py-3 text-sm text-green-600 font-semibold">
                  {row.successRate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedRows.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No dive data available
        </div>
      )}
    </div>
  );
};
