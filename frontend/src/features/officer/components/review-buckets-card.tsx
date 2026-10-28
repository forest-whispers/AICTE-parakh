import React from "react";
import type { ReviewWorkBucket } from "../types/workbench.types";

interface ReviewBucketsCardProps {
  buckets: ReviewWorkBucket[];
  onBucketClick: (bucket: ReviewWorkBucket) => void;
}

export const ReviewBucketsCard: React.FC<ReviewBucketsCardProps> = ({
  buckets,
  onBucketClick,
}) => {
  return (
    <div className="bg-white border border-[#D7DEDA] rounded-[2px] p-6">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-[#172E33] tracking-tight m-0">Review buckets</h3>
      </div>

      <div className="space-y-4">
        {buckets.map((b) => (
          <button
            key={b.category}
            type="button"
            onClick={() => onBucketClick(b)}
            className="w-full flex items-center justify-between text-xs group text-left bg-transparent border-0 cursor-pointer p-0"
          >
            <span className="text-[#2B686D] group-hover:underline transition-colors font-normal">
              {b.label}
            </span>
            <div className="font-mono font-bold text-xs text-[#172E33] flex items-center gap-1.5">
              <span>{b.count}</span>
              <span>→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
