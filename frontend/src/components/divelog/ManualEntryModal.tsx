import React, { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Check, Loader2 } from "lucide-react";
import getAllDivers from "../../services/getAllDivers";
import type { DiveEntry, DiveData, DiverFromAPI } from "../../types/index";

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DiveData) => void;
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

// const drillTypeOptions = ["A", "TO", "CON", "S", "CO", "ADJ", "RIP", "UW"];
const boardOptions = ["1M", "3M", "5M", "7.5M", "10M"];

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [divers, setDivers] = useState<DiverFromAPI[]>([]);
  const [loadingDivers, setLoadingDivers] = useState(false);
  const [diversError, setDiversError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DiveData>({
    Name: "",
    Dives: [
      {
        DiveCode: "",
        DrillType: "A", // Default to Approach
        Board: "",
        Reps: [], // Will be empty for manual entries
        Success: "0/0",
      },
    ],
    comment: "",
    rating: undefined,
    balks: 0,
    session_date: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD format in local timezone
  });

  const [errors, setErrors] = useState<{
    name?: string;
    dives?: string;
    diveFields?: {
      [key: number]: {
        diveCode?: string;
        board?: string;
        drillType?: string;
        success?: string;
      };
    };
  }>({});

  // Fetch divers when modal opens
  useEffect(() => {
    if (isOpen && divers.length === 0) {
      fetchDivers();
    }
  }, [isOpen, divers.length]);

  const fetchDivers = async () => {
    setLoadingDivers(true);
    setDiversError(null);
    try {
      const diversData = await getAllDivers();
      setDivers(diversData);
    } catch (error) {
      console.error("Error fetching divers:", error);
      setDiversError("Failed to load divers. Please try again.");
    } finally {
      setLoadingDivers(false);
    }
  };

  // Validate a single field and update errors
  const validateField = useCallback(
    (field: string, value: any, diveIndex?: number) => {
      setErrors((prev) => {
        const newErrors = { ...prev };

        if (field === "name") {
          if (!value.trim()) {
            newErrors.name = "Diver name is required";
          } else if (!divers.some((d) => d.name === value)) {
            newErrors.name = "Diver name must match a valid diver";
          } else {
            delete newErrors.name;
          }
        } else if (field === "diveCode" && diveIndex !== undefined) {
          if (!value.trim()) {
            if (!newErrors.diveFields) newErrors.diveFields = {};
            if (!newErrors.diveFields[diveIndex])
              newErrors.diveFields[diveIndex] = {};
            newErrors.diveFields[diveIndex].diveCode = "Dive code is required";
          } else {
            if (newErrors.diveFields?.[diveIndex]?.diveCode) {
              delete newErrors.diveFields[diveIndex].diveCode;
              if (Object.keys(newErrors.diveFields[diveIndex]).length === 0) {
                delete newErrors.diveFields[diveIndex];
              }
              if (Object.keys(newErrors.diveFields || {}).length === 0) {
                delete newErrors.diveFields;
              }
            }
          }
        } else if (field === "board" && diveIndex !== undefined) {
          if (!value.trim()) {
            if (!newErrors.diveFields) newErrors.diveFields = {};
            if (!newErrors.diveFields[diveIndex])
              newErrors.diveFields[diveIndex] = {};
            newErrors.diveFields[diveIndex].board = "Board is required";
          } else {
            if (newErrors.diveFields?.[diveIndex]?.board) {
              delete newErrors.diveFields[diveIndex].board;
              if (Object.keys(newErrors.diveFields[diveIndex]).length === 0) {
                delete newErrors.diveFields[diveIndex];
              }
              if (Object.keys(newErrors.diveFields || {}).length === 0) {
                delete newErrors.diveFields;
              }
            }
          }
        } else if (field === "drillType" && diveIndex !== undefined) {
          if (!value.trim()) {
            if (!newErrors.diveFields) newErrors.diveFields = {};
            if (!newErrors.diveFields[diveIndex])
              newErrors.diveFields[diveIndex] = {};
            newErrors.diveFields[diveIndex].drillType =
              "Drill type is required";
          } else {
            if (newErrors.diveFields?.[diveIndex]?.drillType) {
              delete newErrors.diveFields[diveIndex].drillType;
              if (Object.keys(newErrors.diveFields[diveIndex]).length === 0) {
                delete newErrors.diveFields[diveIndex];
              }
              if (Object.keys(newErrors.diveFields || {}).length === 0) {
                delete newErrors.diveFields;
              }
            }
          }
        }

        return newErrors;
      });
    },
    [divers]
  );

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        Name: "",
        Dives: [
          {
            DiveCode: "",
            DrillType: "A", // Default to Approach
            Board: "",
            Reps: [], // Will be empty for manual entries
            Success: "0/0",
          },
        ],
        comment: "",
        rating: undefined,
        balks: 0,
        session_date: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD format in local timezone
      });
      setErrors({});
    }
  }, [isOpen]);

  // Trigger validation when form data changes
  React.useEffect(() => {
    if (isOpen) {
      // Validate diver name whenever it changes
      if (formData.Name === "") {
        setErrors((prev) => ({ ...prev, name: "Diver name is required" }));
      } else if (
        formData.Name &&
        !divers.some((d) => d.name === formData.Name)
      ) {
        setErrors((prev) => ({
          ...prev,
          name: "Diver name must match a valid diver",
        }));
      } else if (formData.Name) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.name;
          return newErrors;
        });
      }
    }
  }, [isOpen, formData.Name, divers]);

  const updateDive = useCallback(
    (index: number, field: keyof DiveEntry, value: any) => {
      setFormData((prev) => {
        const newDives = [...prev.Dives];
        newDives[index] = { ...newDives[index], [field]: value };
        return { ...prev, Dives: newDives };
      });

      // Validate the field that was just updated
      if (field === "DiveCode") {
        validateField("diveCode", value, index);
      } else if (field === "Board") {
        validateField("board", value, index);
      } else if (field === "DrillType") {
        validateField("drillType", value, index);
      }
    },
    [validateField]
  );

  const addDive = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      Dives: [
        ...prev.Dives,
        {
          DiveCode: "",
          DrillType: "A", // Default to Approach
          Board: "",
          Reps: [], // Will be empty for manual entries
          Success: "0/0",
        },
      ],
    }));
    // Clear any existing dive field errors when adding a new dive
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors.diveFields) {
        delete newErrors.diveFields;
      }
      return newErrors;
    });
  }, []);

  const removeDive = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      Dives: prev.Dives.filter((_, i) => i !== index),
    }));
    // Clear errors for the removed dive and reindex remaining errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors.diveFields) {
        delete newErrors.diveFields[index];
        // Reindex the remaining errors
        const reindexedErrors: { [key: number]: any } = {};
        Object.keys(newErrors.diveFields).forEach((key) => {
          const oldIndex = parseInt(key);
          if (oldIndex > index) {
            reindexedErrors[oldIndex - 1] = newErrors.diveFields![oldIndex];
          } else if (oldIndex < index) {
            reindexedErrors[oldIndex] = newErrors.diveFields![oldIndex];
          }
        });
        newErrors.diveFields = reindexedErrors;
        if (Object.keys(newErrors.diveFields).length === 0) {
          delete newErrors.diveFields;
        }
      }
      return newErrors;
    });
  }, []);

  const validateForm = (): boolean => {
    // Check all required fields
    const hasNameError =
      !formData.Name.trim() || !divers.some((d) => d.name === formData.Name);
    const hasDiveErrors = formData.Dives.some(
      (dive) =>
        !dive.DiveCode.trim() || !dive.Board.trim() || !dive.DrillType.trim()
    );

    return !hasNameError && !hasDiveErrors && formData.Dives.length > 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Check if form is valid for save button
  const isFormValid = validateForm();

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

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-center md:justify-between">
            <h3 className="text-xl font-semibold md:mb-0 mb-3 text-gray-900">
              Add Manual Training Log
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-green-600  text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                disabled={!isFormValid}
              >
                <Check className="h-4 w-4" />
                Add Training Log
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="space-y-6">
            {/* Diver Name */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-700">
                Diver Name
              </label>
              <div className="relative">
                <select
                  value={formData.Name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, Name: e.target.value }));
                    validateField("name", e.target.value);
                  }}
                  disabled={loadingDivers}
                  className={`w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? "border-red-500" : ""
                  } ${loadingDivers ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  required
                >
                  <option value="">
                    {loadingDivers ? "Loading divers..." : "Select Diver"}
                  </option>
                  {divers.map((diver) => (
                    <option key={diver.id} value={diver.name}>
                      {diver.name}
                    </option>
                  ))}
                </select>
                {loadingDivers && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              {diversError && (
                <div className="flex items-center justify-between">
                  <p className="text-red-500 text-sm">{diversError}</p>
                  <button
                    onClick={fetchDivers}
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {errors.name && (
                <span className="text-red-500 text-xs mt-1">{errors.name}</span>
              )}
            </div>

            {/* Session Date */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-700">
                Session Date
              </label>
              <input
                type="date"
                value={
                  formData.session_date ||
                  new Date().toLocaleDateString("en-CA")
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    session_date: e.target.value,
                  }))
                }
                className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Log Rating */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-700">
                Log Rating
              </label>
              <div className="flex gap-3">
                {["green", "yellow", "red"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        rating: color as "green" | "yellow" | "red",
                      }))
                    }
                    className={`px-4 py-2 rounded font-semibold border-2 focus:outline-none transition-colors
                                            ${
                                              formData.rating === color
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
            </div>

            {/* Balks */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-700">Balks</label>
              <input
                type="number"
                min="0"
                value={formData.balks === 0 ? "" : formData.balks || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    balks: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-24 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <hr className="my-4 border-gray-200" />

          {/* Dives Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">
                Dives ({formData.Dives.length})
              </h4>
              <button
                onClick={addDive}
                className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add New Dive
              </button>
            </div>
            {errors.dives && (
              <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">
                {errors.dives}
              </div>
            )}

            <div className="overflow-x-auto">
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
                    <th className="border border-gray-300 px-2 py-2 text-sm w-12">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.Dives.map((dive, diveIndex) => (
                    <tr key={diveIndex} className="hover:bg-gray-50 relative">
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <input
                          value={dive.DiveCode}
                          onChange={(e) =>
                            updateDive(diveIndex, "DiveCode", e.target.value)
                          }
                          placeholder="e.g., 100B"
                          className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            errors.diveFields?.[diveIndex]?.diveCode
                              ? "border-red-500"
                              : ""
                          }`}
                        />
                        {errors.diveFields?.[diveIndex]?.diveCode && (
                          <div className="text-red-500 text-xs mt-1">
                            {errors.diveFields[diveIndex].diveCode}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <select
                          value={dive.Board}
                          onChange={(e) =>
                            updateDive(diveIndex, "Board", e.target.value)
                          }
                          className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            errors.diveFields?.[diveIndex]?.board
                              ? "border-red-500"
                              : ""
                          }`}
                        >
                          <option value="">Select board...</option>
                          {boardOptions.map((board) => (
                            <option key={board} value={board}>
                              {board}
                            </option>
                          ))}
                        </select>
                        {errors.diveFields?.[diveIndex]?.board && (
                          <div className="text-red-500 text-xs mt-1">
                            {errors.diveFields[diveIndex].board}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <select
                          value={dive.DrillType}
                          onChange={(e) =>
                            updateDive(diveIndex, "DrillType", e.target.value)
                          }
                          className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            errors.diveFields?.[diveIndex]?.drillType
                              ? "border-red-500"
                              : ""
                          }`}
                        >
                          {Object.keys(drillTypeMap).map((key) => (
                            <option key={key} value={key}>
                              {key} - {drillTypeMap[key]}
                            </option>
                          ))}
                        </select>
                        {errors.diveFields?.[diveIndex]?.drillType && (
                          <div className="text-red-500 text-xs mt-1">
                            {errors.diveFields[diveIndex].drillType}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={
                              dive.Success.split("/")[0] === "0"
                                ? ""
                                : dive.Success.split("/")[0] || ""
                            }
                            onChange={(e) => {
                              const successful = e.target.value || "0";
                              const total = dive.Success.split("/")[1] || "0";
                              updateDive(
                                diveIndex,
                                "Success",
                                `${successful}/${total}`
                              );
                            }}
                            className="w-12 px-1 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                            placeholder="0"
                          />
                          <span className="text-gray-500">/</span>
                          <input
                            type="number"
                            min="0"
                            value={
                              dive.Success.split("/")[1] === "0"
                                ? ""
                                : dive.Success.split("/")[1] || ""
                            }
                            onChange={(e) => {
                              const successful =
                                dive.Success.split("/")[0] || "0";
                              const total = e.target.value || "0";
                              updateDive(
                                diveIndex,
                                "Success",
                                `${successful}/${total}`
                              );
                            }}
                            className="w-12 px-1 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                            placeholder="0"
                          />
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-sm w-12">
                        {formData.Dives.length > 1 && (
                          <button
                            onClick={() => removeDive(diveIndex)}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Remove dive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
            <textarea
              value={formData.comment || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, comment: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
              placeholder="Add a comment about this training log..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualEntryModal;
