import React, { useState, useCallback, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import getAllDivers from "../../services/getAllDivers";
import type { DiveEntry, DiveData, DiverFromAPI } from "../../types/index";
import CompetitionTable from "./CompetitionTable";
import CSVTable from "./CSVTable";

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DiveData) => void;
  mode?: "training" | "competition";
}

// Removed local drillTypeMap in favor of shared table components used in edit UI

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode = "training",
}) => {
  const getLocalYMD = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const [divers, setDivers] = useState<DiverFromAPI[]>([]);
  const [loadingDivers, setLoadingDivers] = useState(false);
  const [diversError, setDiversError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DiveData>({
    Name: "",
    Dives: [
      {
        DiveCode: "",
        DrillType: mode === "competition" ? "" : "A", // no default for competition
        Board: "",
        DegreeOfDifficulty: "",
        Reps: [], // Will be empty for manual entries
        Success: "",
      },
    ],
    comment: "",
    rating: mode === "training" ? undefined : undefined,
    balks: mode === "training" ? 0 : undefined,
    session_date: getLocalYMD(),
  });

  const [errors, setErrors] = useState<{
    name?: string;
    dives?: string;
    diveFields?: {
      [key: number]: {
        diveCode?: string;
        board?: string;
        drillType?: string;
        degreeOfDifficulty?: string;
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
        } else if (field === "degreeOfDifficulty" && diveIndex !== undefined) {
          if (!String(value).trim()) {
            if (!newErrors.diveFields) newErrors.diveFields = {};
            if (!newErrors.diveFields[diveIndex])
              newErrors.diveFields[diveIndex] = {};
            newErrors.diveFields[diveIndex].degreeOfDifficulty =
              "Degree of difficulty is required";
          } else {
            if (newErrors.diveFields?.[diveIndex]?.degreeOfDifficulty) {
              delete newErrors.diveFields[diveIndex].degreeOfDifficulty;
              if (Object.keys(newErrors.diveFields[diveIndex]).length === 0) {
                delete newErrors.diveFields[diveIndex];
              }
              if (Object.keys(newErrors.diveFields || {}).length === 0) {
                delete newErrors.diveFields;
              }
            }
          }
        } else if (field === "success" && diveIndex !== undefined) {
          const hasScore = String(value)
            .split(",")
            .map((s: string) => s.trim())
            .some((s: string) => s.length > 0);
          if (!hasScore) {
            if (!newErrors.diveFields) newErrors.diveFields = {};
            if (!newErrors.diveFields[diveIndex])
              newErrors.diveFields[diveIndex] = {};
            newErrors.diveFields[diveIndex].success =
              "At least one score is required";
          } else {
            if (newErrors.diveFields?.[diveIndex]?.success) {
              delete newErrors.diveFields[diveIndex].success;
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
            DrillType: mode === "competition" ? "" : "A",
            Board: "",
            DegreeOfDifficulty: "",
            Reps: [], // Will be empty for manual entries
            Success: "",
          },
        ],
        comment: "",
        rating: mode === "training" ? undefined : undefined,
        balks: mode === "training" ? 0 : undefined,
        session_date: getLocalYMD(),
      });
      setErrors({});
    }
  }, [isOpen, mode]);

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
      } else if (field === "DegreeOfDifficulty") {
        validateField("degreeOfDifficulty", value, index);
      } else if (field === "Success") {
        validateField("success", value, index);
      }
    },
    [validateField]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addDive = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      Dives: [
        ...prev.Dives,
        {
          DiveCode: "",
          DrillType: mode === "competition" ? "" : "A",
          Board: "",
          DegreeOfDifficulty: "",
          Reps: [], // Will be empty for manual entries
          Success: "",
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
  }, [mode]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removeDive = useCallback(
    (index: number) => {
      setFormData((prev) => {
        const updated = prev.Dives.filter((_, i) => i !== index);
        return {
          ...prev,
          Dives:
            updated.length === 0
              ? [
                  {
                    DiveCode: "",
                    DrillType: mode === "competition" ? "" : "A",
                    Board: "",
                    DegreeOfDifficulty: "",
                    Reps: [],
                    Success: "",
                  },
                ]
              : updated,
        };
      });
      // Clear errors for the removed dive and reindex remaining errors
      setErrors((prev) => {
        const newErrors = { ...prev } as any;
        if (newErrors.diveFields) {
          delete newErrors.diveFields[index];
          const reindexedErrors: { [key: number]: any } = {};
          Object.keys(newErrors.diveFields).forEach((key) => {
            const oldIndex = parseInt(key);
            if (oldIndex > index)
              reindexedErrors[oldIndex - 1] = newErrors.diveFields[oldIndex];
            else if (oldIndex < index)
              reindexedErrors[oldIndex] = newErrors.diveFields[oldIndex];
          });
          newErrors.diveFields = reindexedErrors;
          if (Object.keys(newErrors.diveFields).length === 0)
            delete newErrors.diveFields;
        }
        return newErrors;
      });
    },
    [mode]
  );

  const validateForm = (): boolean => {
    const nameOk =
      !!formData.Name?.trim() && divers.some((d) => d.name === formData.Name);
    const dives = Array.isArray(formData.Dives) ? formData.Dives : [];
    const hasDiveErrors = dives.some((dive) => {
      const code = (dive?.DiveCode ?? "").trim();
      const board = (dive?.Board ?? "").trim();
      const type = (dive?.DrillType ?? "").trim();
      return !code || !board || !type;
    });
    return nameOk && !hasDiveErrors && dives.length > 0;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden max-h-[94vh]">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 md:border-b bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                mode === "competition"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {mode === "competition" ? "Competition" : "Training"}
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {mode === "competition"
                ? "Add Manual Competition Log"
                : "Add Manual Training Log"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white shadow hover:bg-green-700 text-sm font-medium"
              disabled={!isFormValid}
            >
              <Check className="h-4 w-4" />
              {mode === "competition" ? "Add Log" : "Add Log"}
            </button>
            <button
              aria-label="Close"
              onClick={onClose}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-gray-600"
            >
              <span className="sr-only">Close</span>×
            </button>
          </div>
        </div>

        {/* Scrollable content below sticky header */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(94vh-64px)] pb-24 md:pb-6">
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
                  className={`w-full appearance-none px-3 pr-9 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
                {loadingDivers && (
                  <div className="absolute right-9 top-1/2 transform -translate-y-1/2">
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
                value={formData.session_date || getLocalYMD()}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    session_date: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Log Rating (training only) */}
            {mode === "training" && (
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
                      className={`px-3 py-1.5 rounded-lg font-semibold border focus:outline-none transition-colors ${
                        formData.rating === color
                          ? color === "green"
                            ? "bg-green-600 text-white border-green-700"
                            : color === "yellow"
                            ? "bg-yellow-500 text-white border-yellow-600"
                            : "bg-red-600 text-white border-red-700"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Balks (training only) */}
            {mode === "training" && (
              <div className="space-y-2">
                <label className="block font-medium text-gray-700">Balks</label>
                <input
                  type="number"
                  min="0"
                  value={
                    formData.balks === 0 ? "" : (formData.balks as number) || ""
                  }
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
            )}
          </div>

          <hr className="my-4 border-gray-200" />

          {/* Dives Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">
                Dives ({formData.Dives.length})
              </h4>
            </div>
            {errors.dives && (
              <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">
                {errors.dives}
              </div>
            )}

            <div className="overflow-x-auto md:max-h-96 overflow-y-auto">
              {mode === "competition" ? (
                <CompetitionTable
                  data={formData.Dives}
                  isEditing={true}
                  onDataEdit={(field, value, diveIndex) => {
                    if (typeof diveIndex === "number") {
                      updateDive(diveIndex, field as keyof DiveEntry, value);
                    }
                  }}
                  onDataChange={(newData) =>
                    setFormData((prev) => ({ ...prev, Dives: newData }))
                  }
                />
              ) : (
                <CSVTable
                  data={formData.Dives}
                  isEditing={true}
                  onDataChange={(newData) =>
                    setFormData((prev) => ({ ...prev, Dives: newData }))
                  }
                />
              )}
            </div>
          </div>

          {/* Comment Box (training only) */}
          {mode === "training" && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualEntryModal;
