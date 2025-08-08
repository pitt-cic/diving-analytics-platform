import type { DiveEntry } from "../../types/index";

export const DRILL_TYPE_MAP: Record<string, string> = {
  A: "Approach",
  TO: "Takeoff",
  CON: "Connection",
  S: "Shape",
  CO: "Comeout",
  ADJ: "Adjustment",
  RIP: "Entry",
  UW: "Underwater",
};

export const validateDives = (dives: DiveEntry[]): boolean => {
  return dives.every((dive) => {
    const hasDiveCode = dive.DiveCode.trim() !== "";
    const hasDrillType = dive.DrillType.trim() !== "";
    const hasBoard = dive.Board.trim() !== "";
    const success = dive.Success.trim();
    const successFormatValid = /^\d+\s*\/\s*\d+$/.test(success);
    const numeratorValid = success.split("/")[0]?.trim() !== "";
    const denominatorValid = success.split("/")[1]?.trim() !== "";
    return (
      hasDiveCode &&
      hasDrillType &&
      hasBoard &&
      successFormatValid &&
      numeratorValid &&
      denominatorValid
    );
  });
};
