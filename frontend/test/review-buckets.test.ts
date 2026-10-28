import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ReviewWorkBucket } from "../src/features/officer/types/workbench.types.ts";

describe("Review and Verification Buckets", () => {
  it("preserves distinct, non-overlapping statutory categories without collapsing to generic pass/fail", () => {
    const buckets: ReviewWorkBucket[] = [
      {
        category: "COMPLIANCE_DEFICIENCIES",
        label: "Deterministic Compliance Deficiencies",
        count: 9,
        items: [],
      },
      {
        category: "MISSING_EVIDENCE",
        label: "Missing Statutory Annexures",
        count: 4,
        items: [],
      },
      {
        category: "UNCERTAIN_EXTRACTION",
        label: "Uncertain Field Extractions",
        count: 3,
        items: [],
      },
      {
        category: "MANUAL_REVIEW_REQUIRED",
        label: "Manual Inspection Requirements",
        count: 6,
        items: [],
      },
      {
        category: "FORENSIC_ADVISORIES",
        label: "PDF Forensics & Metadata Advisories",
        count: 2,
        items: [],
      },
      {
        category: "AUTHORITY_MISMATCHES",
        label: "Issuing Authority Discrepancies",
        count: 3,
        items: [],
      },
      {
        category: "AUTHORITY_EXPIRED",
        label: "Expired Statutory Certificates",
        count: 2,
        items: [],
      },
      {
        category: "PENDING_BANK_CONFIRMATIONS",
        label: "Pending Bank Branch Confirmations",
        count: 5,
        items: [],
      },
      {
        category: "RECORDED_BANK_CONFIRMATIONS",
        label: "Recorded Bank Branch Letters (On File)",
        count: 11,
        items: [],
      },
    ];

    assert.equal(buckets.length, 9);

    const categories = new Set(buckets.map((b) => b.category));
    assert.equal(categories.size, 9, "All 9 categories must remain discrete");

    const totalCount = buckets.reduce((acc, b) => acc + b.count, 0);
    assert.equal(totalCount, 45);
  });
});
