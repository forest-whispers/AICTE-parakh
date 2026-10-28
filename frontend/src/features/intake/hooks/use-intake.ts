import { useContext } from "react";
import { IntakeContext, type IntakeContextValue } from "../context/intake-context-def";

export function useIntake(): IntakeContextValue {
  const context = useContext(IntakeContext);
  if (!context) {
    throw new Error("useIntake must be used within an IntakeProvider");
  }
  return context;
}
