import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Setup global fetch & sessionStorage mocks for testing API client logic
const storage: Record<string, string> = {};
(globalThis as any).sessionStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => {
    storage[key] = val;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
};

import { ministryApi } from "../src/features/ministry/services/ministry-api";
import { tokenManager } from "../src/shared/api/token-manager";

describe("Ministry Dashboard API Client & Data Models", () => {
  it("fetches consolidated ministry dashboard payload in a single request", async () => {
    tokenManager.setToken("mock_ministry_token");

    const mockDashboardData = {
      overview: {
        totalApplications: 248,
        stages: {
          intake: 24,
          extractionProcessing: 0,
          extractionFailed: 7,
          scrutinyPending: 38,
          scrutinyEvaluated: 186,
          authorityVerificationExecuted: 84,
        },
        metrics: {
          totalApplications: 248,
          awaitingAttention: 86,
          extractionFailures: 7,
          incompleteSubmissions: 16,
          scrutinyDeficiencies: 42,
          manualReviewRequired: 23,
          pendingAuthorityConfirmations: 19,
          unresolvedAuthorityMismatches: 12,
          unresolvedForensicAnomalies: 8,
          unassignedExceptions: 18,
          agingApplications: 15,
        },
        pipeline: [
          {
            stageKey: "STAGE_1_INTAKE",
            stageName: "Received / registered",
            applicationCount: 24,
            description: "Registered technical applications",
          },
          {
            stageKey: "STAGE_2_EXTRACTION",
            stageName: "Document extraction",
            applicationCount: 38,
            description: "Document ingestion & extraction",
          },
          {
            stageKey: "STAGE_3_SCRUTINY",
            stageName: "Regulatory scrutiny",
            applicationCount: 76,
            description: "Deterministic scrutiny evaluation",
          },
          {
            stageKey: "STAGE_4_AUTHORITY_VERIFICATION",
            stageName: "Verification / further review",
            applicationCount: 84,
            description: "Issuing authority verification & reviews",
          },
          {
            stageKey: "STAGE_5_DECISION_SUPPORT",
            stageName: "Ready for next administrative action",
            applicationCount: 26,
            description: "Compliant applications ready for committee",
          },
        ],
        bottlenecks: [
          {
            applicationId: "app-411",
            applicationNumber: "PAR/2026/00411",
            institutionName: "Vindhya Technical Institute",
            assignedOfficerName: "V. Nair",
            assignedOfficerId: "usr-off-1",
            stage: "EXTRACTION",
            bottleneckType: "EXTRACTION_FAILURE",
            severity: "CRITICAL" as const,
            explanation: "Architect certificate unreadable",
            daysInStage: 3,
            recommendedAction: "Request document re-upload",
          },
        ],
      },
      workload: {
        officers: [
          {
            officer: {
              id: "usr-1",
              name: "Ananya Rao",
              email: "ananya@aicte.gov.in",
              designation: "Scrutiny Officer",
              department: "Western",
            },
            totalAssigned: 38,
            activeCount: 32,
            compliantCount: 6,
            deficienciesCount: 9,
            manualReviewCount: 6,
            pendingConfirmationsCount: 2,
            agingCount: 2,
          },
        ],
        unassignedQueue: {
          count: 18,
          applications: [
            {
              id: "app-423",
              applicationNumber: "PAR/2026/00423",
              institutionName: "Kaveri College of Engineering",
              programCategory: "ENGINEERING_TECHNOLOGY",
              status: "SUBMITTED",
              createdAt: "2026-10-26T14:10:00.000Z",
            },
          ],
        },
        distributionSummary: {
          totalOfficers: 4,
          totalAssignedApplications: 140,
          avgApplicationsPerOfficer: 35,
          maxApplicationsPerOfficer: 41,
        },
      },
      issues: {
        issues: [
          {
            id: "iss-1",
            applicationId: "app-418",
            applicationNumber: "PAR/2026/00418",
            institutionName: "Sahyadri Institute of Technology, Pune",
            assignedOfficerName: "Ananya Rao",
            issueCategory: "COMPLIANCE_DEFICIENCY" as const,
            severity: "HIGH" as const,
            ruleIdOrSource: "RULE_BUILDING_AREA",
            clause: "Clause 6.1",
            title: "Statutory deficiency",
            details: "Building area below configured threshold",
            evidenceExcerpt: "1,840 m²",
            timestamp: "2026-10-27T08:00:00.000Z",
          },
        ],
        categoryCounts: {
          COMPLIANCE_DEFICIENCY: 42,
          AUTHORITY_MISMATCH: 12,
        },
        severityCounts: {
          CRITICAL: 1,
          HIGH: 8,
          MEDIUM: 12,
        },
        total: 86,
      },
      recentActivity: [
        {
          id: "log-1",
          timestamp: "2026-10-28T09:44:00.000Z",
          action: "AUTHORITY_VERIFICATION_EXECUTED",
          actor: {
            isSystem: true,
          },
          application: {
            id: "app-418",
            applicationNumber: "PAR/2026/00418",
            institutionName: "Sahyadri Institute of Technology, Pune",
          },
          resourceType: "AUTHORITY_VERIFICATION",
          status: "SUCCESS",
          details: "Verification completed for 00418; unresolved mismatch retained.",
        },
      ],
    };

    (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
      assert.equal(url, "/api/ministry/dashboard");
      assert.equal(init?.method || "GET", "GET");
      assert.equal(
        (init?.headers as Headers).get("Authorization"),
        "Bearer mock_ministry_token"
      );

      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: true,
          data: mockDashboardData,
        }),
      };
    };

    const data = await ministryApi.getDashboard();

    assert.equal(data.overview.totalApplications, 248);
    assert.equal(data.overview.metrics.awaitingAttention, 86);
    assert.equal(data.overview.metrics.unassignedExceptions, 18);
    assert.equal(data.overview.pipeline.length, 5);
    assert.equal(data.workload.officers[0].officer.name, "Ananya Rao");
    assert.equal(data.issues.total, 86);
    assert.equal(data.issues.issues[0].applicationNumber, "PAR/2026/00418");
    assert.equal(data.recentActivity[0].actor.isSystem, true);
  });

  it("handles network failure or 500 error cleanly", async () => {
    (globalThis as any).fetch = async () => {
      return {
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: false,
          error: "Internal database service unavailable.",
        }),
      };
    };

    await assert.rejects(
      async () => {
        await ministryApi.getDashboard();
      },
      (err: any) => {
        assert.match(err.message, /Internal database service unavailable/);
        return true;
      }
    );
  });
});

