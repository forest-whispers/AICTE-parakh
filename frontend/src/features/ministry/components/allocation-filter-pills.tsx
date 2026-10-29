import React from "react";

interface AllocationFilterPillsProps {
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  disabled?: boolean;
}

interface FilterOption {
  label: string;
  value: string;
  badge?: string;
}

export const AllocationFilterPills: React.FC<AllocationFilterPillsProps> = ({
  selectedStatus,
  onSelectStatus,
  disabled = false,
}) => {
  const filterOptions: FilterOption[] = [
    { label: "All unassigned", value: "" },
    { label: "Submitted", value: "SUBMITTED" },
    { label: "Processing extraction", value: "PROCESSING_EXTRACTION" },
    { label: "Extraction completed", value: "EXTRACTION_COMPLETED" },
    { label: "Deficiencies detected", value: "DEFICIENCIES_DETECTED" },
    { label: "Manual review required", value: "MANUAL_REVIEW_REQUIRED" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1">
      {filterOptions.map((opt) => {
        const isActive = selectedStatus === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelectStatus(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-[2px] border transition-all cursor-pointer font-medium select-none ${
              isActive
                ? "bg-[#165A60] text-white border-[#165A60] font-semibold shadow-xs"
                : "bg-white text-[#5C6F73] border-[#D7DEDA] hover:bg-[#FAFAF8] hover:text-[#172E33]"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
