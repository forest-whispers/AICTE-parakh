import React from "react";
import { Button } from "../../../shared/ui/button";

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
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
      <div>
        <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1">
          OFFICER &nbsp;/&nbsp; ASSIGNED WORKSPACE
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#172E33] tracking-tight m-0">
          Your attention, in order.
        </h1>
        <p className="text-xs text-[#5C6F73] mt-1 m-0">
          {officerName} · {todayFormatted} · Only applications assigned to you are shown.
        </p>
      </div>

      <div>
        <Button
          variant="primary"
          onClick={onGuidedSubmissionClick}
          className="text-xs font-medium px-4 py-2 bg-[#165A60] hover:bg-[#122B30] text-white rounded-[2px]"
        >
          Guided submission +
        </Button>
      </div>
    </div>
  );
};
