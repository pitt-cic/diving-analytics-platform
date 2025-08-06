import React, { useMemo, useCallback, useState } from "react";
import { X, Edit2, Check, AlertTriangle, Download, Trash2 } from "lucide-react";
import { PITT_DIVERS } from "../../constants/pittDivers";
import Papa from "papaparse";
import { useTable, Column, Row } from "react-table";
import type { DiveEntry, DiveData } from "../../types/index";
import { UserIcon } from "@heroicons/react/24/outline";

interface ImageData {
  id: string;
  file: File | undefined;
  url: string;
  extractedData: DiveData;
  isEditing: boolean;
  s3Key?: string;
  s3Url?: string;
  uploadStatus?: "pending" | "uploading" | "success" | "error";
  uploadError?: string;
  session_date?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DiveLogModalProps {
  isOpen: boolean;
  image: ImageData | undefined;
  currentImageIndex: number;
  totalImages: number;
  onClose: () => void;
  onEditToggle: () => void;
  onSave: () => void;
  onAccept: () => void;
  onDelete: () => void;
  onDataEdit: (
    field: string,
    value: any,
    diveIndex?: number,
    repIndex?: number
  ) => void;
  onTableDataChange: (newData: DiveEntry[]) => void;
  isNameValid: boolean;
  nameError: string;
}

const drillTypeMap: Record<string, string> = {
  A: "Approach",
  TO: "Takeoff",
  CON: "Connection",
  S: "Shape",
  CO: "Comeout",
  ADJ: "Adjustment",
  RIP: "Entry",
  UW: "Underwater",
};

// CSV Table Component
interface CSVTableProps {
  data: DiveEntry[];
  isEditing: boolean;
  onDataChange: (newData: DiveEntry[]) => void;
}

const CSVTable: React.FC<CSVTableProps> = React.memo(
  ({ data, isEditing, onDataChange }) => {
    // Function to add a new dive row
    const addNewDive = () => {
      const newDive: DiveEntry = {
        DiveCode: "",
        DrillType: "A", // Default to Approach
        Board: "",
        Reps: [],
        Success: "",
      };
      onDataChange([...data, newDive]);
    };
    const columns = useMemo<Column<DiveEntry>[]>(
      () => [
        {
          Header: "Dive Code",
          accessor: "DiveCode",
          Cell: ({ value, row }: { value: any; row: Row<DiveEntry> }) => {
            const [localDiveCode, setLocalDiveCode] = useState(value);
            React.useEffect(() => {
              setLocalDiveCode(value);
            }, [value]);
            const isInvalid = isEditing && localDiveCode.trim() === "";
            if (isEditing) {
              return (
                <input
                  value={localDiveCode}
                  onChange={(e) => setLocalDiveCode(e.target.value)}
                  onBlur={() => {
                    const newData = [...data];
                    newData[row.index] = {
                      ...newData[row.index],
                      DiveCode: localDiveCode,
                    };
                    onDataChange(newData);
                  }}
                  className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isInvalid ? "border-red-500" : ""
                  }`}
                />
              );
            }
            return <span className="font-semibold">{value}</span>;
          },
        },
        {
          Header: "Board",
          accessor: "Board",
          Cell: ({ value, row }: { value: any; row: Row<DiveEntry> }) => {
            const [localBoard, setLocalBoard] = useState(value);
            React.useEffect(() => {
              setLocalBoard(value);
            }, [value]);
            if (isEditing) {
              return (
                <input
                  value={localBoard}
                  onChange={(e) => setLocalBoard(e.target.value)}
                  onBlur={() => {
                    const newData = [...data];
                    newData[row.index] = {
                      ...newData[row.index],
                      Board: localBoard,
                    };
                    onDataChange(newData);
                  }}
                  className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              );
            }
            return <span className="font-semibold">{value}</span>;
          },
        },
        {
          Header: "Drill Type",
          accessor: "DrillType",
          Cell: ({ value, row }: { value: any; row: Row<DiveEntry> }) => {
            if (isEditing) {
              return (
                <select
                  key={`drilltype-${row.index}`}
                  value={value}
                  onChange={(e) => {
                    const newData = [...data];
                    newData[row.index] = {
                      ...newData[row.index],
                      DrillType: e.target.value,
                    };
                    onDataChange(newData);
                  }}
                  className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Object.keys(drillTypeMap).map((key) => (
                    <option key={key} value={key}>
                      {key} - {drillTypeMap[key]}
                    </option>
                  ))}
                </select>
              );
            }
            return (
              <span className="font-semibold" title={drillTypeMap[value]}>
                {value}
              </span>
            );
          },
        },
        {
          Header: "Success Rate",
          accessor: "Success",
          Cell: ({ value, row }: { value: any; row: Row<DiveEntry> }) => {
            const [localNum, setLocalNum] = useState(
              () => value.split("/")[0] || ""
            );
            const [localDen, setLocalDen] = useState(
              () => value.split("/")[1] || ""
            );
            React.useEffect(() => {
              setLocalNum(value.split("/")[0] || "");
              setLocalDen(value.split("/")[1] || "");
            }, [value]);
            const numInvalid = isEditing && localNum.trim() === "";
            const denInvalid = isEditing && localDen.trim() === "";
            if (isEditing) {
              return (
                <div className="flex items-center gap-1">
                  <input
                    value={localNum}
                    onChange={(e) => setLocalNum(e.target.value)}
                    onBlur={() => {
                      const newData = [...data];
                      const newValue = `${localNum}/${localDen}`;
                      newData[row.index] = {
                        ...newData[row.index],
                        Success: newValue,
                      };
                      onDataChange(newData);
                    }}
                    className={`w-12 px-1 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-center ${
                      numInvalid ? "border-red-500" : ""
                    }`}
                    placeholder="0"
                  />
                  <span className="text-gray-500">/</span>
                  <input
                    value={localDen}
                    onChange={(e) => setLocalDen(e.target.value)}
                    onBlur={() => {
                      const newData = [...data];
                      const newValue = `${localNum}/${localDen}`;
                      newData[row.index] = {
                        ...newData[row.index],
                        Success: newValue,
                      };
                      onDataChange(newData);
                    }}
                    className={`w-12 px-1 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-center ${
                      denInvalid ? "border-red-500" : ""
                    }`}
                    placeholder="0"
                  />
                </div>
              );
            }
            return (
              <span className="font-semibold text-green-600">{value}</span>
            );
          },
        },
      ],
      [data, isEditing, onDataChange]
    );

    const tableInstance = useTable({ columns, data });

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
      tableInstance;

    return (
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table
            {...getTableProps()}
            className="w-full border-collapse border border-gray-300"
          >
            <thead>
              {headerGroups.map((headerGroup: any) => (
                <tr
                  {...headerGroup.getHeaderGroupProps()}
                  className="bg-gray-100"
                >
                  {headerGroup.headers.map((column: any) => (
                    <th
                      {...column.getHeaderProps()}
                      className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700"
                    >
                      {column.render("Header")}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {rows.map((row: any) => {
                prepareRow(row);
                return (
                  <tr
                    {...row.getRowProps()}
                    className="hover:bg-gray-50 relative"
                  >
                    {row.cells.map((cell: any) => (
                      <td
                        {...cell.getCellProps()}
                        className="border border-gray-300 px-3 py-2 text-sm"
                      >
                        {cell.render("Cell")}
                      </td>
                    ))}
                    {isEditing && (
                      <td className="border border-gray-300 px-2 py-2 text-sm w-12">
                        <button
                          onClick={() => {
                            const newData = data.filter(
                              (_, index) => index !== row.index
                            );
                            onDataChange(newData);
                          }}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Remove dive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isEditing && (
          <button
            onClick={addNewDive}
            className="w-full bg-blue-100 text-blue-700 px-3 py-2 rounded border border-blue-300 hover:bg-blue-200 transition-colors text-sm font-medium"
          >
            + Add New Dive
          </button>
        )}
      </div>
    );
  }
);

// Add validation for required fields in each row
const validateDives = (dives: DiveEntry[]) => {
  return dives.every(
    (dive) =>
      dive.DiveCode.trim() !== "" &&
      dive.DrillType.trim() !== "" &&
      dive.Board.trim() !== "" &&
      /^\d+\s*\/\s*\d+$/.test(dive.Success.trim()) &&
      dive.Success.split("/")[0].trim() !== "" &&
      dive.Success.split("/")[1].trim() !== ""
  );
};

function BalksInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [localBalks, setLocalBalks] = React.useState(String(value ?? 0));
  React.useEffect(() => {
    setLocalBalks(String(value ?? 0));
  }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={localBalks}
      onChange={(e) => {
        const val = e.target.value;
        if (/^\d*$/.test(val)) {
          setLocalBalks(val);
          if (val !== "") {
            onChange(Number(val));
          }
        }
      }}
      onBlur={(e) => {
        if (e.target.value === "") {
          setLocalBalks("0");
          onChange(0);
        }
      }}
      className="w-24 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

const DiveLogModal: React.FC<DiveLogModalProps> = ({
  isOpen,
  image,
  currentImageIndex,
  totalImages,
  onClose,
  onEditToggle,
  onSave,
  onAccept,
  onDelete,
  onDataEdit,
  onTableDataChange,
  isNameValid,
  nameError,
}) => {
  // Memoize the table data change handler (must be before any return)
  const stableTableDataChange = useCallback(
    (newData: DiveEntry[]) => {
      onTableDataChange(newData);
    },
    [onTableDataChange]
  );

  if (!isOpen || !image) return null;
  const currentImage = image;

  const divesValid = validateDives(currentImage.extractedData.Dives);

  // Download CSV function
  const downloadCSV = () => {
    const name = currentImage.extractedData.Name || "";
    const comment = currentImage.extractedData.comment || "";
    const rating = currentImage.extractedData.rating || "";
    const sessionDate = getUploadedDate();
    const csvData = currentImage.extractedData.Dives.map((dive) => {
      let successRate = dive.Success;
      if (typeof successRate === "string" && successRate.includes("/")) {
        const [num, den] = successRate
          .split("/")
          .map((s) => parseFloat(s.trim()));
        if (!isNaN(num) && !isNaN(den) && den > 0) {
          successRate = Math.round((num / den) * 100) + "%";
        }
      }
      return {
        "Diver Name": name,
        "Session Date": sessionDate,
        "Log Rating": rating,
        Balks: currentImage.extractedData.balks ?? 0,
        Comment: comment,
        "Dive Code": dive.DiveCode,
        "Drill Type": dive.DrillType,
        "Success Rate": successRate,
      };
    });
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${currentImage.extractedData.Name}_dives_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isRatingValid = !!currentImage?.extractedData?.rating;

  // Helper to get today's date in yyyy-mm-dd
  const getToday = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };
  // Helper to get the uploaded date in yyyy-mm-dd
  const getUploadedDate = () => {
    // 1. Use session_date if set
    if (currentImage.session_date) {
      // Parse YYYY-MM-DD format explicitly to avoid timezone issues
      const [year, month, day] = currentImage.session_date
        .split("-")
        .map(Number);
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
      return currentImage.session_date;
    }
    // 2. Use createdAt if available
    if (currentImage.createdAt) {
      const d = new Date(currentImage.createdAt);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    }
    // 3. Use updatedAt if available
    if (currentImage.updatedAt) {
      const d = new Date(currentImage.updatedAt);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    }
    // 4. Try to extract from image.id if it looks like a timestamp
    if (currentImage.id && /^\d{13}/.test(currentImage.id)) {
      const ts = parseInt(currentImage.id.split("-")[0], 10);
      if (!isNaN(ts)) {
        const d = new Date(ts);
        return d.toLocaleDateString();
      }
    }
    // 5. Fallback to today
    return getToday();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full mx-4 p-8 relative overflow-y-auto max-h-[95vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
          aria-label="Close"
        >
          &times;
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Image {currentImageIndex + 1} of {totalImages}
              </h3>
            </div>
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <img
                src={currentImage.url}
                alt="Training sheet"
                className="w-full h-96 object-contain"
              />
            </div>
          </div>

          {/* Extracted Data */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between">
              <h3 className="text-xl font-semibold md:mb-0 mb-3 text-gray-900">
                Extracted Data
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={onEditToggle}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentImage.isEditing
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  {currentImage.isEditing ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Edit2 className="h-4 w-4" />
                  )}
                  {currentImage.isEditing ? "Cancel" : "Edit Data"}
                </button>
                {/* Show Save when editing, Accept when not editing */}
                {currentImage.isEditing ? (
                  <button
                    onClick={onSave}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    disabled={!isNameValid || !divesValid || !isRatingValid}
                  >
                    <Check className="h-4 w-4" />
                    Save
                  </button>
                ) : (
                  <button
                    onClick={onAccept}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    disabled={!isNameValid || !divesValid || !isRatingValid}
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                )}
              </div>
            </div>
            {/* Diver Name */}
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">
                  Diver Name
                </label>
                {currentImage.isEditing ? (
                  <select
                    value={currentImage.extractedData.Name}
                    onChange={(e) => onDataEdit("Name", e.target.value)}
                    className={`w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !isNameValid ? "border-red-500" : ""
                    }`}
                    required
                  >
                    <option value="">Select Diver</option>
                    {PITT_DIVERS.map((diver) => (
                      <option key={diver.id} value={diver.name}>
                        {diver.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-1 font-semibold text-base text-gray-900">
                    {isNameValid ? (
                      <>
                        <UserIcon className="h-5 w-5 text-gray-500" />
                        {currentImage.extractedData.Name}
                      </>
                    ) : (
                      <span className="text-red-500 text-sm flex font-semibold items-center gap-1">
                        <AlertTriangle className="inline h-4 w-4" /> Needs edit
                      </span>
                    )}
                  </div>
                )}
                {!isNameValid && currentImage.isEditing && (
                  <span className="text-red-500 text-xs mt-1">{nameError}</span>
                )}
              </div>
              {/* Session Date - moved below name */}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">
                  Session Date
                </label>
                {currentImage.isEditing ? (
                  <input
                    type="date"
                    value={getUploadedDate()}
                    onChange={(e) => onDataEdit("session_date", e.target.value)}
                    className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="font-semibold text-base text-gray-900">
                    {getUploadedDate()}
                  </div>
                )}
              </div>
              {/* Log Rating */}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">
                  Log Rating
                </label>
                {currentImage.isEditing ? (
                  <div className="flex gap-3">
                    {["green", "yellow", "red"].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onDataEdit("rating", color)}
                        className={`px-4 py-2 rounded font-semibold border-2 focus:outline-none transition-colors
                          ${
                            currentImage.extractedData.rating === color
                              ? color === "green"
                                ? "bg-green-500 text-white border-green-600"
                                : color === "yellow"
                                ? "bg-yellow-400 text-white border-yellow-500"
                                : "bg-red-500 text-white border-red-600"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                          }
                        `}
                      >
                        {color.charAt(0).toUpperCase() + color.slice(1)}
                      </button>
                    ))}
                  </div>
                ) : currentImage.extractedData.rating ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-4 h-4 rounded-full
                          ${
                            currentImage.extractedData.rating === "green"
                              ? "bg-green-500"
                              : ""
                          }
                          ${
                            currentImage.extractedData.rating === "yellow"
                              ? "bg-yellow-400"
                              : ""
                          }
                          ${
                            currentImage.extractedData.rating === "red"
                              ? "bg-red-500"
                              : ""
                          }
                        `}
                    ></span>
                    <span className="font-semibold">
                      {currentImage.extractedData.rating
                        .charAt(0)
                        .toUpperCase() +
                        currentImage.extractedData.rating.slice(1)}
                    </span>
                  </div>
                ) : (
                  <span className="text-red-500 text-sm flex font-semibold items-center gap-1">
                    <AlertTriangle className="inline h-4 w-4" /> Needs edit
                  </span>
                )}
              </div>
              {/* Baulk (Balks) Field */}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">Balks</label>
                {currentImage.isEditing ? (
                  <BalksInput
                    value={currentImage.extractedData.balks ?? 0}
                    onChange={(val) => onDataEdit("balks", val)}
                  />
                ) : (
                  <div className="font-semibold text-base text-gray-900">
                    {currentImage.extractedData.balks ?? 0}
                  </div>
                )}
              </div>
            </div>
            <hr className="my-4 border-gray-200" />
            {/* Dives Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">
                  Dives ({currentImage.extractedData.Dives.length})
                </h4>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
              </div>
              <div className="md:max-h-96 overflow-y-auto">
                <CSVTable
                  data={currentImage.extractedData.Dives}
                  isEditing={currentImage.isEditing}
                  onDataChange={stableTableDataChange}
                />
              </div>
            </div>
            {/* Comment Box */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-700">Comment</label>
              {currentImage.isEditing ? (
                <textarea
                  value={currentImage.extractedData.comment || ""}
                  onChange={(e) => onDataEdit("comment", e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                  placeholder="Add a comment about this training log..."
                />
              ) : (
                <div className="bg-gray-50 rounded p-3 min-h-[60px] text-gray-700 whitespace-pre-line">
                  {currentImage.extractedData.comment || (
                    <span className="text-gray-400">No comment</span>
                  )}
                </div>
              )}
            </div>
            {/* Delete button at the very bottom */}
            {currentImage.isEditing && (
              <div className="pt-4">
                <button
                  onClick={onDelete}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Log
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ConfirmedLogModalProps {
  isOpen: boolean;
  log:
    | {
        url?: string;
        diverName: string;
        date: string;
        totalDives: number;
        balks: number;
        extractedData?: DiveData;
        session_date?: string;
        createdAt?: string;
        updatedAt?: string;
      }
    | undefined;
  currentLogIndex: number;
  totalLogs: number;
  onClose: () => void;
}

const ConfirmedLogModal: React.FC<ConfirmedLogModalProps> = ({
  isOpen,
  log,
  currentLogIndex,
  totalLogs,
  onClose,
}) => {
  if (!isOpen || !log) return null;
  const extracted = log.extractedData || {
    Name: log.diverName,
    Balks: log.balks,
    Dives: [],
    comment: "",
    rating: undefined,
  };

  // Helper to get session date for display and CSV
  const getSessionDate = () => {
    let sessionDate = "";
    // Only use session_date, don't fall back to other date fields
    if (log && (log as any).session_date) {
      sessionDate = (log as any).session_date;
    }
    if (sessionDate) {
      // Parse YYYY-MM-DD format explicitly to avoid timezone issues
      const [year, month, day] = sessionDate.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        sessionDate = d.toLocaleDateString();
      }
    }
    return sessionDate;
  };
  const sessionDate = getSessionDate();
  // Helper to get balks value
  const getBalks = () => {
    if (typeof log.balks === "number") return log.balks;
    if (extracted && typeof (extracted as any).balks === "number")
      return (extracted as any).balks;
    if (extracted && typeof (extracted as any).Balks === "number")
      return (extracted as any).Balks;
    return 0;
  };
  const balks = getBalks();

  // Download CSV function (same as DiveLogModal)
  const downloadCSV = () => {
    const name = extracted.Name || "";
    const comment = extracted.comment || "";
    const rating = extracted.rating || "";
    // Try to get session date from log, fallback to empty string
    let sessionDate = "";
    if (log && (log as any).session_date)
      sessionDate = (log as any).session_date;
    else if (log && (log as any).createdAt)
      sessionDate = (log as any).createdAt;
    else if (log && (log as any).updatedAt)
      sessionDate = (log as any).updatedAt;
    else if (log && (log as any).date) sessionDate = (log as any).date;
    else sessionDate = "";
    if (!sessionDate) {
      // Debug: log the log object if session date is missing
      // eslint-disable-next-line no-console
      console.warn("No session date found on log (CSV):", log);
    }
    if (sessionDate) {
      const d = new Date(sessionDate);
      if (!isNaN(d.getTime())) sessionDate = d.toISOString().slice(0, 10);
    }
    const csvData = (extracted.Dives || []).map((dive) => {
      let successRate = dive.Success;
      if (typeof successRate === "string" && successRate.includes("/")) {
        const [num, den] = successRate
          .split("/")
          .map((s) => parseFloat(s.trim()));
        if (!isNaN(num) && !isNaN(den) && den > 0) {
          successRate = Math.round((num / den) * 100) + "%";
        }
      }
      // Type guard for balks
      let balksValue = 0;
      if (
        "balks" in extracted &&
        typeof (extracted as any).balks === "number"
      ) {
        balksValue = (extracted as any).balks;
      } else if (
        "Balks" in extracted &&
        typeof (extracted as any).Balks === "number"
      ) {
        balksValue = (extracted as any).Balks;
      }
      return {
        "Diver Name": name,
        "Session Date": sessionDate,
        "Log Rating": rating,
        Balks: balksValue,
        Comment: comment,
        "Dive Code": dive.DiveCode,
        "Drill Type": dive.DrillType,
        Board: dive.Board,
        "Success Rate": successRate,
      };
    });
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${extracted.Name}_dives_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date (fallback to empty string if not present)
  // const formattedDate = log.date || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full mx-4 p-8 relative overflow-y-auto max-h-[95vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
          aria-label="Close"
        >
          &times;
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {sessionDate ? (
                  <span>{new Date(sessionDate).toLocaleDateString()}</span>
                ) : (
                  `Image ${currentLogIndex + 1} of ${totalLogs}`
                )}
              </h3>
            </div>
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              {log.url ? (
                <img
                  src={log.url}
                  alt="Training sheet"
                  className="w-full h-96 object-contain"
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center bg-gray-100">
                  <div className="text-center text-gray-400">
                    <svg
                      className="w-16 h-16 mx-auto mb-4"
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
                    <p className="text-sm font-medium">No Image Available</p>
                    {/* <p className="text-xs text-gray-500 mt-1">
                      Manual entry or processed log
                    </p> */}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Data (now shows date, balks) */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between">
              <h3 className="text-xl font-semibold md:mb-0 mb-3 text-gray-900">
                {sessionDate ? (
                  <span>{new Date(sessionDate).toLocaleDateString()}</span>
                ) : (
                  ""
                )}
              </h3>
              {/* REMOVE TOP DOWNLOAD CSV BUTTON */}
            </div>
            {/* Diver Info */}
            <div className="space-y-4 mb-6">
              {/* Diver Name */}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">
                  Diver Name
                </label>
                <div className="flex items-center gap-1 font-semibold text-base text-gray-900">
                  {extracted.Name || ""}
                </div>
              </div>
              {/* Log Rating */}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">
                  Log Rating
                </label>
                {extracted.rating ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block w-4 h-4 rounded-full
                        ${extracted.rating === "green" ? "bg-green-500" : ""}
                        ${extracted.rating === "yellow" ? "bg-yellow-400" : ""}
                        ${extracted.rating === "red" ? "bg-red-500" : ""}
                      `}
                    ></span>
                    <span className="font-semibold">
                      {extracted.rating.charAt(0).toUpperCase() +
                        extracted.rating.slice(1)}
                    </span>
                  </div>
                ) : (
                  <span className="font-semibold text-base text-gray-900"></span>
                )}
              </div>
              {/* Balks */}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">Balks</label>
                <div className="font-semibold text-base text-gray-900">
                  {balks}
                </div>
              </div>
              {/* Session Date (explicit) */}
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">
                  Session Date
                </label>
                <div className="font-semibold text-base text-gray-900">
                  {sessionDate || ""}
                </div>
              </div>
            </div>
            <hr className="my-4 border-gray-200" />
            {/* Dives Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">
                  Dives ({extracted.Dives.length})
                </h4>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
              </div>
              <div className="md:max-h-96 overflow-y-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Dive Code
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Board
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Drill Type
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                        Success Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {extracted.Dives.map((dive, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 relative">
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                          {dive.DiveCode}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                          {dive.Board}
                        </td>
                        <td
                          className="border border-gray-300 px-3 py-2 text-sm font-semibold"
                          title={drillTypeMap[dive.DrillType] || dive.DrillType}
                        >
                          {dive.DrillType}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-semibold text-green-600">
                          {dive.Success}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Comment Box */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-700">Comment</label>
              <div className="bg-gray-50 rounded p-3 min-h-[60px] text-gray-700 whitespace-pre-line">
                {extracted.comment || (
                  <span className="text-gray-400">No comment</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { DiveLogModal, ConfirmedLogModal };
