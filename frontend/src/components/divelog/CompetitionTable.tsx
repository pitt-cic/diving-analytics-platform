import React, { useEffect, useState, memo } from "react";
import type { DiveEntry } from "../../types/index";
import { Plus, X, Trash2 } from "lucide-react";

interface CompetitionTableProps {
  data: DiveEntry[];
  isEditing: boolean;
  onDataEdit: (
    field: string,
    value: any,
    diveIndex?: number,
    repIndex?: number
  ) => void;
  onDataChange?: (newData: DiveEntry[]) => void;
}

// Utilities hoisted to avoid re-creation every render
const parseScores = (successValue: string): string[] => {
  if (!successValue) return [];
  return successValue.split(",").map((s) => s.trim());
};

const toSuccessString = (scores: string[]): string => scores.join(", ");

interface RowProps {
  dive: DiveEntry;
  idx: number;
  isEditing: boolean;
  onDataEdit: (
    field: string,
    value: any,
    diveIndex?: number,
    repIndex?: number
  ) => void;
  onDeleteRow?: (rowIndex: number) => void;
}

const CompetitionTableRow: React.FC<RowProps> = memo(
  ({ dive, idx, isEditing, onDataEdit, onDeleteRow }) => {
    const [scores, setScores] = useState<string[]>(() =>
      parseScores(dive.Success)
    );

    // Keep local scores in sync with parent dive.Success without remounting
    useEffect(() => {
      const parsed = parseScores(dive.Success);
      const current = toSuccessString(scores);
      const incoming = toSuccessString(parsed);
      if (current !== incoming) {
        setScores(parsed);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dive.Success, idx]);

    const updateScores = (next: string[]) => {
      setScores(next);
      onDataEdit("Success", toSuccessString(next), idx);
    };

    const isDrillTypeInvalid =
      isEditing && String(dive.DrillType || "").trim() === "";
    const isDiveCodeInvalid =
      isEditing && String(dive.DiveCode || "").trim() === "";
    const isBoardInvalid = isEditing && String(dive.Board || "").trim() === "";
    const isDoDInvalid =
      isEditing && String(dive.DegreeOfDifficulty || "").trim() === "";
    const areScoresInvalid =
      isEditing &&
      (scores.length === 0 || scores.every((s) => String(s).trim() === ""));

    return (
      <tr className="hover:bg-gray-50 align-top">
        <td className="border border-gray-300 px-3 py-2 text-sm">
          {isEditing ? (
            <input
              value={dive.DrillType || ""}
              onChange={(e) => onDataEdit("DrillType", e.target.value, idx)}
              className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDrillTypeInvalid ? "border-red-500" : ""
              }`}
              placeholder="e.g., Inward, Forward"
            />
          ) : (
            <span className="font-semibold">{dive.DrillType}</span>
          )}
        </td>
        <td className="border border-gray-300 px-3 py-2 text-sm">
          {isEditing ? (
            <input
              value={dive.DiveCode || ""}
              onChange={(e) => onDataEdit("DiveCode", e.target.value, idx)}
              className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDiveCodeInvalid ? "border-red-500" : ""
              }`}
              placeholder="e.g., 405C"
            />
          ) : (
            <span className="font-semibold">{dive.DiveCode}</span>
          )}
        </td>
        <td className="border border-gray-300 px-3 py-2 text-sm">
          {isEditing ? (
            <input
              value={dive.Board || ""}
              onChange={(e) => onDataEdit("Board", e.target.value, idx)}
              className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isBoardInvalid ? "border-red-500" : ""
              }`}
              placeholder="e.g., 3m"
            />
          ) : (
            <span className="font-semibold">{dive.Board}</span>
          )}
        </td>
        <td className="border border-gray-300 px-3 py-2 text-sm">
          {isEditing ? (
            <input
              value={dive.DegreeOfDifficulty || ""}
              onChange={(e) =>
                onDataEdit("DegreeOfDifficulty", e.target.value, idx)
              }
              className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDoDInvalid ? "border-red-500" : ""
              }`}
              placeholder="e.g., 2.6"
            />
          ) : (
            <span className="font-semibold">{dive.DegreeOfDifficulty}</span>
          )}
        </td>
        <td className="border border-gray-300 px-3 py-2 text-sm">
          {isEditing ? (
            <div className="flex flex-wrap items-center gap-2">
              {(scores.length === 0 ? [""] : scores).map((score, sIdx) => (
                <div key={sIdx} className="relative">
                  <input
                    value={score}
                    onChange={(e) => {
                      const base = scores.length === 0 ? [""] : scores;
                      const next = [...base];
                      next[sIdx] = e.target.value;
                      updateScores(next);
                    }}
                    className={`w-16 pr-6 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-center ${
                      areScoresInvalid || String(score).trim() === ""
                        ? "border-red-500"
                        : ""
                    }`}
                    placeholder="5"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const base = scores.length === 0 ? [""] : scores;
                      const next = base.filter((_, i) => i !== sIdx);
                      updateScores(next);
                    }}
                    className="absolute right-1 top-1 inline-flex items-center justify-center h-5 w-5 rounded text-red-600 hover:text-red-800"
                    title="Remove score"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const base = scores.length === 0 ? [""] : scores;
                  updateScores([...base, ""]);
                }}
                className="inline-flex items-center gap-2 px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs"
              >
                <Plus className="h-4 w-4" /> Add score
              </button>
            </div>
          ) : (
            <span className="font-semibold text-green-600">
              {scores.join(", ")}
            </span>
          )}
        </td>
        {isEditing && onDeleteRow && (
          <td className="border border-gray-300 px-2 py-2 text-sm w-12">
            <button
              onClick={() => onDeleteRow(idx)}
              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
              title="Remove dive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </td>
        )}
      </tr>
    );
  }
);

const CompetitionTable: React.FC<CompetitionTableProps> = ({
  data,
  isEditing,
  onDataEdit,
  onDataChange,
}) => {
  return (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
            Type
          </th>
          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
            Dive Code
          </th>
          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
            Board
          </th>
          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
            Degree of Difficulty
          </th>
          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
            Scores
          </th>
          {isEditing && onDataChange && (
            <th className="border border-gray-300 px-2 py-2 text-sm w-12">
              Action
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {data.map((dive, idx) => (
          <CompetitionTableRow
            key={idx}
            dive={dive}
            idx={idx}
            isEditing={isEditing}
            onDataEdit={onDataEdit}
            onDeleteRow={
              isEditing && onDataChange
                ? (rowIndex: number) => {
                    const newData = data.filter((_, i) => i !== rowIndex);
                    onDataChange(newData);
                  }
                : undefined
            }
          />
        ))}
        {isEditing && onDataChange ? (
          <tr>
            <td colSpan={6} className="px-3 py-2">
              <button
                onClick={() => {
                  const newRow: DiveEntry = {
                    DiveCode: "",
                    DrillType: "",
                    Board: "",
                    DegreeOfDifficulty: "",
                    Success: "0",
                    Reps: [],
                  };
                  onDataChange([...data, newRow]);
                }}
                className="w-full bg-blue-100 text-blue-700 px-3 py-2 rounded border border-blue-300 hover:bg-blue-200 transition-colors text-sm font-medium"
              >
                + Add New Dive
              </button>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
};

export default CompetitionTable;
