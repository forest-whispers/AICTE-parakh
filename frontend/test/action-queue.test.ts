import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PrioritizedQueueItem } from "../src/features/officer/types/workbench.types.ts";

describe("Action Queue Prioritization & Hierarchy", () => {
  it("orders action queue items strictly by priority rank 1 to 8", () => {
    const items: PrioritizedQueueItem[] = [
      {
        id: "q-8",
        applicationId: "app-8",
        applicationNumber: "PAR/2026/00421",
        institutionName: "Narmada College",
        priorityRank: 8,
        urgency: "INFO",
        issueType: "SCRUTINY_PENDING",
        title: "Awaiting Initial Deterministic Scrutiny",
        explanation: "Documents extracted; initial scrutiny evaluation has not yet been executed.",
        recommendedAction: "Trigger deterministic scrutiny evaluation.",
        relatedDocumentType: null,
        ruleIdOrSource: "SCRUTINY_ENGINE",
      },
      {
        id: "q-1",
        applicationId: "app-1",
        applicationNumber: "PAR/2026/00419",
        institutionName: "Pravara Technical Institute",
        priorityRank: 1,
        urgency: "CRITICAL",
        issueType: "EXTRACTION_FAILURE",
        title: "Multimodal Document Ingestion Failure",
        explanation: "Architect certificate is unreadable.",
        recommendedAction: "Examine raw PDF upload format and re-trigger multimodal extraction.",
        relatedDocumentType: null,
        ruleIdOrSource: "VLM_INGESTION",
      },
      {
        id: "q-2",
        applicationId: "app-2",
        applicationNumber: "PAR/2026/00418",
        institutionName: "Sahyadri Institute",
        priorityRank: 2,
        urgency: "CRITICAL",
        issueType: "REGULATORY_DEFICIENCY",
        title: "Statutory Building Area Deficiency",
        explanation: "Building area below configured threshold.",
        recommendedAction: "Issue documentary deficiency memo under APH clause.",
        relatedDocumentType: "CERTIFIED_BUILDING_PLAN",
        ruleIdOrSource: "RULE_MIN_BUILDING_AREA",
      },
    ];

    const sorted = [...items].sort((a, b) => a.priorityRank - b.priorityRank);

    assert.equal(sorted[0].priorityRank, 1);
    assert.equal(sorted[0].urgency, "CRITICAL");
    assert.equal(sorted[0].issueType, "EXTRACTION_FAILURE");

    assert.equal(sorted[1].priorityRank, 2);
    assert.equal(sorted[1].urgency, "CRITICAL");
    assert.equal(sorted[1].issueType, "REGULATORY_DEFICIENCY");

    assert.equal(sorted[2].priorityRank, 8);
    assert.equal(sorted[2].urgency, "INFO");
    assert.equal(sorted[2].issueType, "SCRUTINY_PENDING");
  });
});
