import React, { useMemo, useState } from "react";
import { useTable, Column, Row } from "react-table";
import type { DiveEntry } from "../../types/index";
import { Trash2 } from "lucide-react";
import { DRILL_TYPE_MAP } from "./utils";

interface CSVTableProps {
  data: DiveEntry[];
  isEditing: boolean;
  onDataChange: (newData: DiveEntry[]) => void;
}

const CSVTable: React.FC<CSVTableProps> = ({
  data,
  isEditing,
  onDataChange,
}) => {
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
          const isInvalid = isEditing && String(localDiveCode).trim() === "";
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
                placeholder="e.g., 405C"
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
            const isInvalid = String(localBoard).trim() === "";
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
                className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isInvalid ? "border-red-500" : ""
                }`}
                placeholder="e.g., 3m"
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
                {Object.keys(DRILL_TYPE_MAP).map((key) => (
                  <option key={key} value={key}>
                    {key} - {DRILL_TYPE_MAP[key]}
                  </option>
                ))}
              </select>
            );
          }
          return (
            <span className="font-semibold" title={DRILL_TYPE_MAP[value]}>
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
            () => String(value).split("/")[0] || ""
          );
          const [localDen, setLocalDen] = useState(
            () => String(value).split("/")[1] || ""
          );
          React.useEffect(() => {
            setLocalNum(String(value).split("/")[0] || "");
            setLocalDen(String(value).split("/")[1] || "");
          }, [value]);
          const numInvalid = isEditing && String(localNum).trim() === "";
          const denInvalid = isEditing && String(localDen).trim() === "";
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
                  placeholder="5"
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
                  placeholder="5"
                />
              </div>
            );
          }
          return <span className="font-semibold text-green-600">{value}</span>;
        },
      },
    ],
    [data, isEditing, onDataChange]
  );

  const tableInstance = useTable({ columns, data });
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    tableInstance;

  const addNewDive = () => {
    const newDive: DiveEntry = {
      DiveCode: "",
      DrillType: "A",
      Board: "",
      Reps: [],
      Success: "",
    };
    onDataChange([...data, newDive]);
  };

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
                {isEditing && (
                  <th className="border border-gray-300 px-2 py-2 text-sm w-12">
                    Action
                  </th>
                )}
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
};

export default CSVTable;
