import React from "react";
import type { ReviewWorkBucket } from "../types/workbench.types";
import { ArrowRight } from "lucide-react";

interface ReviewBucketsCardProps {
  buckets: ReviewWorkBucket[];
  onBucketClick: (bucket: ReviewWorkBucket) => void;
}

export const ReviewBucketsCard: React.FC<ReviewBucketsCardProps> = ({
  buckets,
  onBucketClick,
}) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[3px] shadow-subtle p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#D7DEDA] mb-3">
        <h3 className="text-sm font-bold text-[#172E33] tracking-tight m-0">Review buckets</h3>
        <span className="text-[10px] font-mono text-[#5C6F73] uppercase tracking-wider">
          UNRESOLVED WORK
        </span>
      </div>

      <div className="divide-y divide-[#D7DEDA]">
        {buckets.map((b) => {
          const isDeficiency = b.category === "COMPLIANCE_DEFICIENCIES";
          const isManual = b.category === "MANUAL_REVIEW_REQUIRED";
          const isRecorded = b.category === "RECORDED_BANK_CONFIRMATIONS";

          const countColor = isDeficiency
            ? "text-[#A14637] font-bold"
            : isManual
            ? "text-[#94631F] font-bold"
            : isRecorded
            ? "text-[#376850] font-semibold"
            : "text-[#172E33] font-semibold";

          return (
            <button
              key={b.category}
              type="button"
              onClick={() => onBucketClick(b)}
              className="w-full flex items-center justify-between py-2.5 px-1 text-xs hover:bg-[#F6F5F0] transition-colors rounded-[2px] group text-left"
            >
              <span className="text-[#172E33] group-hover:text-[#165A60] transition-colors">
                {b.label}
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className={countColor}>{b.count}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#5C6F73] group-hover:text-[#165A60] group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
