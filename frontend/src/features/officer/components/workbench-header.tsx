import React from "react";
import { Button } from "../../../shared/ui/button";
import { Plus } from "lucide-react";

interface WorkbenchHeaderProps {
  officerName: string;
  onGuidedSubmissionClick: () => void;
}

export const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({
  officerName,
  onGuidedSubmissionClick,
}) => {
  const todayFormatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <div className="text-[11px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1">
          OFFICER / ASSIGNED WORKSPACE
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#172E33] tracking-tight m-0">
          Your attention, in order.
        </h1>
        <p className="text-xs sm:text-[13px] text-[#5C6F73] mt-1 m-0">
          {officerName} · {todayFormatted} · Only applications assigned to you are shown.
        </p>
      </div>

      <div>
        <Button
          variant="primary"
          onClick={onGuidedSubmissionClick}
          className="text-xs px-3.5 py-2 flex items-center gap-1.5"
        >
          <span>Guided submission</span>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
