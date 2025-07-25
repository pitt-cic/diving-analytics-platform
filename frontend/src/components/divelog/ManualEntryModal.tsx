import React, {useState, useCallback} from "react";
import {X, Plus, Trash2, Check} from "lucide-react";
import {PITT_DIVERS} from "../../constants/pittDivers";
import type {DiveEntry, DiveData} from "../../types/index";

interface ManualEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: DiveData) => void;
}

const drillTypeOptions = ["A", "TO", "CON", "S", "CO", "ADJ", "RIP", "UW"];
const boardOptions = ["1M", "3M", "5M", "7.5M", "10M"];

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
                                                               isOpen,
                                                               onClose,
                                                               onSave,
                                                           }) => {
    const [formData, setFormData] = useState<DiveData>({
        Name: "",
        Dives: [
            {
                DiveCode: "",
                DrillType: "",
                Board: "",
                Reps: [], // Will be empty for manual entries
                Success: "0/0",
            },
        ],
        comment: "",
        rating: undefined,
        balks: 0,
    });

    const [errors, setErrors] = useState<{
        name?: string;
        dives?: string;
    }>({});

    // Reset form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                Name: "",
                Dives: [
                    {
                        DiveCode: "",
                        DrillType: "",
                        Board: "",
                        Reps: [], // Will be empty for manual entries
                        Success: "0/0",
                    },
                ],
                comment: "",
                rating: undefined,
                balks: 0,
            });
            setErrors({});
        }
    }, [isOpen]);

    const updateDive = useCallback((index: number, field: keyof DiveEntry, value: any) => {
        setFormData((prev) => {
            const newDives = [...prev.Dives];
            newDives[index] = {...newDives[index], [field]: value};
            return {...prev, Dives: newDives};
        });
    }, []);

    const addDive = useCallback(() => {
        setFormData((prev) => ({
            ...prev,
            Dives: [
                ...prev.Dives,
                {
                    DiveCode: "",
                    DrillType: "",
                    Board: "",
                    Reps: [], // Will be empty for manual entries
                    Success: "0/0",
                },
            ],
        }));
    }, []);

    const removeDive = useCallback((index: number) => {
        setFormData((prev) => ({
            ...prev,
            Dives: prev.Dives.filter((_, i) => i !== index),
        }));
    }, []);

    const validateForm = (): boolean => {
        const newErrors: { name?: string; dives?: string } = {};

        // Validate diver name
        if (!formData.Name.trim()) {
            newErrors.name = "Diver name is required";
        } else if (!PITT_DIVERS.some((d) => d.name === formData.Name)) {
            newErrors.name = "Diver name must match a valid Pitt diver";
        }

        // Validate at least one dive
        if (formData.Dives.length === 0) {
            newErrors.dives = "At least one dive is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validateForm()) {
            onSave(formData);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Add Manual Training Log
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6"/>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="space-y-6 pb-4">
                        {/* Diver Selection */}
                        <div className="space-y-2">
                            <label className="block font-medium text-gray-700">
                                Diver Name *
                            </label>
                            <select
                                value={formData.Name}
                                onChange={(e) =>
                                    setFormData((prev) => ({...prev, Name: e.target.value}))
                                }
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.name ? "border-red-500" : "border-gray-300"
                                }`}
                            >
                                <option value="">Select a diver...</option>
                                {PITT_DIVERS.map((diver) => (
                                    <option key={diver.id} value={diver.name}>
                                        {diver.name}
                                    </option>
                                ))}
                            </select>
                            {errors.name && (
                                <p className="text-red-500 text-sm">{errors.name}</p>
                            )}
                        </div>

                        {/* Rating */}
                        <div className="space-y-2">
                            <label className="block font-medium text-gray-700">
                                Log Rating
                            </label>
                            <div className="flex gap-4">
                                {[
                                    {value: "green", label: "Green", color: "bg-green-500"},
                                    {value: "yellow", label: "Yellow", color: "bg-yellow-400"},
                                    {value: "red", label: "Red", color: "bg-red-500"},
                                ].map((option) => (
                                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="rating"
                                            value={option.value}
                                            checked={formData.rating === option.value}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    rating: e.target.value as "green" | "yellow" | "red",
                                                }))
                                            }
                                            className="sr-only"
                                        />
                                        <div
                                            className={`w-4 h-4 rounded-full border-2 ${
                                                formData.rating === option.value
                                                    ? `${option.color} border-gray-400`
                                                    : "border-gray-300"
                                            }`}
                                        />
                                        <span className="text-sm text-gray-700">{option.label}</span>
                                    </label>
                                ))}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="rating"
                                        value=""
                                        checked={!formData.rating}
                                        onChange={() =>
                                            setFormData((prev) => ({...prev, rating: undefined}))
                                        }
                                        className="sr-only"
                                    />
                                    <div
                                        className={`w-4 h-4 rounded-full border-2 ${
                                            !formData.rating ? "border-gray-400" : "border-gray-300"
                                        }`}
                                    />
                                    <span className="text-sm text-gray-700">None</span>
                                </label>
                            </div>
                        </div>

                        {/* Balks */}
                        <div className="space-y-2">
                            <label className="block font-medium text-gray-700">Balks</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.balks || 0}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        balks: parseInt(e.target.value) || 0,
                                    }))
                                }
                                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Dives Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">
                                    Dives ({formData.Dives.length})
                                </h3>
                                <button
                                    onClick={addDive}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="h-4 w-4"/>
                                    Add Dive
                                </button>
                            </div>

                            {errors.dives && (
                                <p className="text-red-500 text-sm">{errors.dives}</p>
                            )}

                            <div className="space-y-4">
                                {formData.Dives.map((dive, diveIndex) => (
                                    <div
                                        key={diveIndex}
                                        className="border border-gray-200 rounded-lg p-4 space-y-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-gray-700">
                                                Dive {diveIndex + 1}
                                            </h4>
                                            {formData.Dives.length > 1 && (
                                                <button
                                                    onClick={() => removeDive(diveIndex)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Dive Code */}
                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Dive Code
                                                </label>
                                                <input
                                                    type="text"
                                                    value={dive.DiveCode}
                                                    onChange={(e) =>
                                                        updateDive(diveIndex, "DiveCode", e.target.value)
                                                    }
                                                    placeholder="e.g., 100B"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>

                                            {/* Board */}
                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Board
                                                </label>
                                                <select
                                                    value={dive.Board}
                                                    onChange={(e) =>
                                                        updateDive(diveIndex, "Board", e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Select board...</option>
                                                    {boardOptions.map((board) => (
                                                        <option key={board} value={board}>
                                                            {board}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Drill Type */}
                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Drill Type
                                                </label>
                                                <select
                                                    value={dive.DrillType}
                                                    onChange={(e) =>
                                                        updateDive(diveIndex, "DrillType", e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Select drill type...</option>
                                                    {drillTypeOptions.map((drill) => (
                                                        <option key={drill} value={drill}>
                                                            {drill}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Success Rate */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Success Rate
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={dive.Success.split('/')[0] || ''}
                                                    onChange={(e) => {
                                                        const successful = e.target.value || '0';
                                                        const total = dive.Success.split('/')[1] || '0';
                                                        updateDive(diveIndex, "Success", `${successful}/${total}`);
                                                    }}
                                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <span className="text-gray-500">/</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={dive.Success.split('/')[1] || ''}
                                                    onChange={(e) => {
                                                        const successful = dive.Success.split('/')[0] || '0';
                                                        const total = e.target.value || '0';
                                                        updateDive(diveIndex, "Success", `${successful}/${total}`);
                                                    }}
                                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <span className="text-sm text-gray-600 ml-2">
                          (successful / total attempts)
                        </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comment */}
                        <div className="space-y-2">
                            <label className="block font-medium text-gray-700">Comment</label>
                            <textarea
                                value={formData.comment || ""}
                                onChange={(e) =>
                                    setFormData((prev) => ({...prev, comment: e.target.value}))
                                }
                                rows={3}
                                placeholder="Add any notes or comments about this training session..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Check className="h-4 w-4"/>
                        Save Training Log
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualEntryModal;
