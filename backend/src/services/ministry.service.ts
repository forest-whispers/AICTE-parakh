import { prisma } from "../lib/prisma.js";

export interface PortfolioSummaryMetricDef {
  key: string;
  name: string;
  description: string;
  isMutuallyExclusive: boolean;
}

export interface ProcessingPipelineStage {
  stageKey: string;
  stageName: string;
  applicationCount: number;
  description: string;
}

export interface PipelineBottleneckItem {
  applicationId: string;
  applicationNumber: string;
  institutionName: string;
  assignedOfficerName: string | null;
  assignedOfficerId: string | null;
  stage: string;
  bottleneckType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  explanation: string;
  daysInStage: number;
  recommendedAction: string;
}

export interface OfficerWorkloadItem {
  officer: {
    id: string;
    name: string;
    email: string;
    designation: string;
    department: string | null;
  };
  totalAssigned: number;
  activeCount: number;
  compliantCount: number;
  deficienciesCount: number;
  manualReviewCount: number;
  pendingConfirmationsCount: number;
  agingCount: number;
}

export interface CrossApplicationIssueItem {
  id: string;
  applicationId: string;
  applicationNumber: string;
  institutionName: string;
  assignedOfficerName: string | null;
  issueCategory:
    | "COMPLIANCE_DEFICIENCY"
    | "MISSING_EVIDENCE"
    | "EXTRACTION_UNCERTAIN"
    | "MANUAL_REVIEW"
    | "FORENSIC_ADVISORY"
    | "AUTHORITY_MISMATCH"
    | "AUTHORITY_EXPIRED"
    | "CONFIRMATION_PENDING";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY";
  ruleIdOrSource: string;
  clause: string | null;
  title: string;
  details: string;
  evidenceExcerpt: string | null;
  timestamp: string;
}

export class MinistryService {
  /**
   * Explains each metric's precise calculation criteria to prevent ambiguous interpretations.
   */
  getMetricDefinitions(): Record<string, PortfolioSummaryMetricDef> {
    return {
      totalApplications: {
        key: "totalApplications",
        name: "Total Applications",
        description: "All new institution technical applications registered in the PARAKH repository.",
        isMutuallyExclusive: false,
      },
      awaitingAttention: {
        key: "awaitingAttention",
        name: "Applications Awaiting Attention",
        description: "Applications requiring administrative or officer action due to deficiencies, manual review, extraction failure, pending bank confirmation, or unassigned status.",
        isMutuallyExclusive: false,
      },
      extractionFailures: {
        key: "extractionFailures",
        name: "Multimodal Extraction Failures",
        description: "Applications where multimodal VLM ingestion failed or one or more uploaded statutory documents failed text/visual extraction.",
        isMutuallyExclusive: false,
      },
      incompleteSubmissions: {
        key: "incompleteSubmissions",
        name: "Incomplete Submissions",
        description: "Applications missing one or more mandatory statutory documents required under APH Annexure 3.1.",
        isMutuallyExclusive: false,
      },
      scrutinyDeficiencies: {
        key: "scrutinyDeficiencies",
        name: "Deterministic Scrutiny Deficiencies",
        description: "Applications where deterministic evaluation against APH 2024-2027 statutory clauses detected non-compliance (deficiencyCount > 0).",
        isMutuallyExclusive: false,
      },
      manualReviewRequired: {
        key: "manualReviewRequired",
        name: "Manual Review / Uncertain Evidence",
        description: "Applications where extraction ambiguity, conditional location rules, or low visual confidence require officer manual inspection.",
        isMutuallyExclusive: false,
      },
      pendingAuthorityConfirmations: {
        key: "pendingAuthorityConfirmations",
        name: "Pending Authority Confirmations",
        description: "Applications awaiting external statutory confirmation, such as unencumbered bank deposit confirmation from branch manager.",
        isMutuallyExclusive: false,
      },
      unresolvedAuthorityMismatches: {
        key: "unresolvedAuthorityMismatches",
        name: "Authority Verification Mismatches",
        description: "Applications where cross-checking against issuing authority records (Registrar, Revenue, Council of Architecture, Fire Services) produced a mismatch or expired record.",
        isMutuallyExclusive: false,
      },
      unresolvedForensicAnomalies: {
        key: "unresolvedForensicAnomalies",
        name: "Forensic Structural Advisories",
        description: "Applications containing PDF documents flagged with non-standard modifications, editing software metadata, or high revision counts.",
        isMutuallyExclusive: false,
      },
      unassignedExceptions: {
        key: "unassignedExceptions",
        name: "Unassigned Exception Queue",
        description: "Applications received without an assigned scrutiny officer, requiring ministry administrative allocation.",
        isMutuallyExclusive: false,
      },
      agingApplications: {
        key: "agingApplications",
        name: "Prolonged Inactivity / Aging",
        description: "Applications in non-compliant state that have not had operational updates or scrutiny re-evaluations for more than 7 days.",
        isMutuallyExclusive: false,
      },
    };
  }

  /**
   * Consolidated portfolio overview for Ministry Administration.
   */
  async getPortfolioOverview(): Promise<any> {
    const apps = await prisma.application.findMany({
      include: {
        assignedOfficer: {
          select: { id: true, name: true, email: true, designation: true },
        },
        documents: {
          select: { id: true, extractionStatus: true, documentType: true },
        },
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        authorityVerifications: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return this.computeOverview(apps);
  }

  /**
   * Computes portfolio overview metrics, stage distributions, and pipeline bottlenecks from applications.
   */
  computeOverview(apps: any[]): any {
    const now = Date.now();

    let intakeCount = 0;
    let extractionProcessingCount = 0;
    let extractionFailedCount = 0;
    let scrutinyPendingCount = 0;
    let scrutinyEvaluatedCount = 0;
    let authorityVerificationRunCount = 0;

    let awaitingAttentionCount = 0;
    let incompleteSubmissionsCount = 0;
    let scrutinyDeficienciesCount = 0;
    let manualReviewCount = 0;
    let pendingAuthorityConfirmationsCount = 0;
    let authorityMismatchesCount = 0;
    let forensicAnomaliesCount = 0;
    let unassignedCount = 0;
    let agingCount = 0;

    const bottlenecks: PipelineBottleneckItem[] = [];

    for (const app of apps) {
      const latestScrutiny = app.scrutinyReports[0] || null;
      const latestVerifications = app.authorityVerifications || [];

      // Check stage
      const hasFailedDoc = app.documents.some((d: any) => d.extractionStatus === "FAILED");
      const isExtractionFailed = app.status === "EXTRACTION_FAILED" || hasFailedDoc;
      const isExtractionProcessing = app.status === "PROCESSING_EXTRACTION";
      const isIntake = app.status === "SUBMITTED";

      if (isIntake) intakeCount++;
      if (isExtractionProcessing) extractionProcessingCount++;
      if (isExtractionFailed) extractionFailedCount++;

      const hasExtractedDocs = app.documents.some((d: any) => d.extractionStatus === "SUCCESS");
      if (hasExtractedDocs && !latestScrutiny) {
        scrutinyPendingCount++;
      }
      if (latestScrutiny) {
        scrutinyEvaluatedCount++;
      }
      if (latestVerifications.length > 0) {
        authorityVerificationRunCount++;
      }

      // Check attention metrics
      const isUnassigned = !app.assignedOfficerId;
      if (isUnassigned) unassignedCount++;

      const hasDeficiencies = Boolean(
        latestScrutiny &&
          (latestScrutiny.deficiencyCount > 0 || latestScrutiny.overallStatus === "DEFICIENCIES_DETECTED")
      );
      if (hasDeficiencies) scrutinyDeficienciesCount++;

      const hasManualReview = Boolean(
        latestScrutiny &&
          (latestScrutiny.reviewCount > 0 || latestScrutiny.overallStatus === "MANUAL_REVIEW_REQUIRED")
      );
      if (hasManualReview) manualReviewCount++;

      const hasMissingDocs = Boolean(latestScrutiny && latestScrutiny.missingCount > 0);
      if (hasMissingDocs) incompleteSubmissionsCount++;

      const hasPendingConfirmations = latestVerifications.some((v: any) => v.status === "CONFIRMATION_PENDING");
      if (hasPendingConfirmations) pendingAuthorityConfirmationsCount++;

      const hasAuthorityMismatches = latestVerifications.some(
        (v: any) => v.status === "MISMATCH_DETECTED" || v.status === "EXPIRED_AT_SOURCE"
      );
      if (hasAuthorityMismatches) authorityMismatchesCount++;

      // Check forensic anomalies from findings
      let hasForensicAnomaly = false;
      if (latestScrutiny && Array.isArray(latestScrutiny.findings)) {
        hasForensicAnomaly = (latestScrutiny.findings as any[]).some(
          (f) => f.ruleId === "RULE_DOC_ANOMALY_FORENSICS" && f.outcome !== "PASS"
        );
      }
      if (hasForensicAnomaly) forensicAnomaliesCount++;

      // Aging: non-compliant and unchanged for > 7 days
      const daysSinceUpdate = Math.floor((now - new Date(app.updatedAt || app.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      const isAging = daysSinceUpdate >= 7 && (!latestScrutiny || latestScrutiny.overallStatus !== "COMPLIANT");
      if (isAging) agingCount++;

      // Awaiting attention if any problem exists
      if (
        isUnassigned ||
        isExtractionFailed ||
        hasDeficiencies ||
        hasManualReview ||
        hasMissingDocs ||
        hasPendingConfirmations ||
        hasAuthorityMismatches ||
        hasForensicAnomaly ||
        isAging
      ) {
        awaitingAttentionCount++;
      }

      // Bottleneck detection
      if (isExtractionFailed) {
        bottlenecks.push({
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          institutionName: app.institutionName,
          assignedOfficerName: app.assignedOfficer?.name || null,
          assignedOfficerId: app.assignedOfficerId,
          stage: "EXTRACTION",
          bottleneckType: "EXTRACTION_FAILURE",
          severity: "CRITICAL",
          explanation: "Document extraction failed; scrutiny engine cannot evaluate unextracted files.",
          daysInStage: daysSinceUpdate,
          recommendedAction: "Request document re-upload or re-trigger extraction pipeline.",
        });
      } else if (isUnassigned) {
        bottlenecks.push({
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          institutionName: app.institutionName,
          assignedOfficerName: null,
          assignedOfficerId: null,
          stage: "INTAKE_ASSIGNMENT",
          bottleneckType: "UNASSIGNED_EXCEPTION",
          severity: "HIGH",
          explanation: "Application is sitting unassigned in exception queue without an assigned scrutiny officer.",
          daysInStage: daysSinceUpdate,
          recommendedAction: "Allocate application to a regional scrutiny officer.",
        });
      } else if (hasPendingConfirmations && daysSinceUpdate >= 3) {
        bottlenecks.push({
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          institutionName: app.institutionName,
          assignedOfficerName: app.assignedOfficer?.name || null,
          assignedOfficerId: app.assignedOfficerId,
          stage: "AUTHORITY_VERIFICATION",
          bottleneckType: "BANK_CONFIRMATION_PENDING",
          severity: "MEDIUM",
          explanation: "Awaiting bank branch manager confirmation letter on unencumbered deposit.",
          daysInStage: daysSinceUpdate,
          recommendedAction: "Follow up with bank branch or record official confirmation letter received.",
        });
      }
    }

    const pipelineStages: ProcessingPipelineStage[] = [
      {
        stageKey: "STAGE_1_INTAKE",
        stageName: "Application Intake",
        applicationCount: apps.length,
        description: "Registered technical applications in the repository.",
      },
      {
        stageKey: "STAGE_2_EXTRACTION",
        stageName: "Document Ingestion & Extraction",
        applicationCount: scrutinyPendingCount + scrutinyEvaluatedCount,
        description: "Multimodal field extraction completed across submitted annexures.",
      },
      {
        stageKey: "STAGE_3_SCRUTINY",
        stageName: "Deterministic Scrutiny",
        applicationCount: scrutinyEvaluatedCount,
        description: "Evaluated against 24 AICTE Approval Process Handbook (APH) clauses.",
      },
      {
        stageKey: "STAGE_4_AUTHORITY_VERIFICATION",
        stageName: "Issuing Authority Verification",
        applicationCount: authorityVerificationRunCount,
        description: "Statutory cross-checks verified across revenue, trust, fire, CoA, and banking adapters.",
      },
      {
        stageKey: "STAGE_5_DECISION_SUPPORT",
        stageName: "Committee Decision Support",
        applicationCount: apps.filter((a) => {
          const s = a.scrutinyReports[0];
          return s && s.overallStatus === "COMPLIANT";
        }).length,
        description: "Applications meeting statutory baselines ready for Scrutiny Committee approval.",
      },
    ];

    return {
      totalApplications: apps.length,
      stages: {
        intake: intakeCount,
        extractionProcessing: extractionProcessingCount,
        extractionFailed: extractionFailedCount,
        scrutinyPending: scrutinyPendingCount,
        scrutinyEvaluated: scrutinyEvaluatedCount,
        authorityVerificationExecuted: authorityVerificationRunCount,
      },
      metrics: {
        totalApplications: apps.length,
        awaitingAttention: awaitingAttentionCount,
        extractionFailures: extractionFailedCount,
        incompleteSubmissions: incompleteSubmissionsCount,
        scrutinyDeficiencies: scrutinyDeficienciesCount,
        manualReviewRequired: manualReviewCount,
        pendingAuthorityConfirmations: pendingAuthorityConfirmationsCount,
        unresolvedAuthorityMismatches: authorityMismatchesCount,
        unresolvedForensicAnomalies: forensicAnomaliesCount,
        unassignedExceptions: unassignedCount,
        agingApplications: agingCount,
      },
      metricDefinitions: this.getMetricDefinitions(),
      pipeline: pipelineStages,
      bottlenecks,
    };
  }

  /**
   * Query applications portfolio with support for 1-to-1 metric drill-down filtering, search, and pagination.
   */
  async getPortfolioApplications(params: {
    metric?: string | undefined;
    search?: string | undefined;
    status?: string | undefined;
    officerId?: string | undefined;
    programCategory?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
  }): Promise<{
    data: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    // Push indexable query filters directly into the database where clause
    const where: any = {};

    if (params.officerId) {
      if (params.officerId === "unassigned") {
        where.assignedOfficerId = null;
      } else {
        where.assignedOfficerId = params.officerId;
      }
    }

    if (params.programCategory) {
      where.programCategory = params.programCategory;
    }

    if (params.search) {
      const query = params.search.trim();
      where.OR = [
        { applicationNumber: { contains: query, mode: "insensitive" } },
        { institutionName: { contains: query, mode: "insensitive" } },
      ];
    }

    // Execute database query with pushdown conditions
    const allApps = await prisma.application.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        assignedOfficer: {
          select: { id: true, name: true, email: true, designation: true },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            documentType: true,
            mimeType: true,
            fileSize: true,
            extractionStatus: true,
          },
        },
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            overallStatus: true,
            passedCount: true,
            deficiencyCount: true,
            reviewCount: true,
            missingCount: true,
            findings: true,
            evaluationDate: true,
          },
        },
        authorityVerifications: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            authorityCategory: true,
            authorityName: true,
            verificationMode: true,
          },
        },
      },
      orderBy: { createdAt: params.sortOrder === "asc" ? "asc" : "desc" },
    });

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Filter in-memory to accurately honor drill-down metric logic
    let filtered = allApps.filter((app) => {
      // 1. Search text
      if (params.search) {
        const query = params.search.toLowerCase().trim();
        const matchesNum = app.applicationNumber.toLowerCase().includes(query);
        const matchesName = app.institutionName.toLowerCase().includes(query);
        if (!matchesNum && !matchesName) return false;
      }

      // 2. Assigned Officer Filter
      if (params.officerId) {
        if (params.officerId === "unassigned") {
          if (app.assignedOfficerId !== null) return false;
        } else if (app.assignedOfficerId !== params.officerId) {
          return false;
        }
      }

      // 3. Program Category
      if (params.programCategory && app.programCategory !== params.programCategory) {
        return false;
      }

      // 4. Status Filter
      if (params.status) {
        const s = params.status.toUpperCase();
        const latestScrutiny = app.scrutinyReports[0];
        const currentStatus = (latestScrutiny?.overallStatus || app.status).toUpperCase();
        if (currentStatus !== s) return false;
      }

      // 5. Metric Drill-Down Filters
      if (params.metric) {
        const latestScrutiny = app.scrutinyReports[0];
        const verifs = app.authorityVerifications || [];
        const hasFailedDoc = app.documents.some((d) => d.extractionStatus === "FAILED");
        const daysSinceUpdate = Math.floor((now - new Date(app.updatedAt || app.createdAt).getTime()) / (24 * 60 * 60 * 1000));

        switch (params.metric) {
          case "extraction_failures":
          case "extractionFailures":
            return app.status === "EXTRACTION_FAILED" || hasFailedDoc;

          case "incomplete_submissions":
          case "incompleteSubmissions":
            return Boolean(latestScrutiny && latestScrutiny.missingCount > 0);

          case "scrutiny_deficiencies":
          case "scrutinyDeficiencies":
            return Boolean(
              latestScrutiny &&
                (latestScrutiny.deficiencyCount > 0 || latestScrutiny.overallStatus === "DEFICIENCIES_DETECTED")
            );

          case "manual_review":
          case "manualReviewRequired":
            return Boolean(
              latestScrutiny &&
                (latestScrutiny.reviewCount > 0 || latestScrutiny.overallStatus === "MANUAL_REVIEW_REQUIRED")
            );

          case "pending_confirmations":
          case "pendingAuthorityConfirmations":
            return verifs.some((v) => v.status === "CONFIRMATION_PENDING");

          case "authority_mismatches":
          case "unresolvedAuthorityMismatches":
            return verifs.some((v) => v.status === "MISMATCH_DETECTED" || v.status === "EXPIRED_AT_SOURCE");

          case "forensic_anomalies":
          case "unresolvedForensicAnomalies":
            if (!latestScrutiny || !Array.isArray(latestScrutiny.findings)) return false;
            return (latestScrutiny.findings as any[]).some(
              (f) => f.ruleId === "RULE_DOC_ANOMALY_FORENSICS" && f.outcome !== "PASS"
            );

          case "unassigned":
          case "unassignedExceptions":
            return app.assignedOfficerId === null;

          case "aging":
          case "agingApplications":
            return daysSinceUpdate >= 7 && (!latestScrutiny || latestScrutiny.overallStatus !== "COMPLIANT");

          case "awaiting_attention":
          case "awaitingAttention": {
            const isUnassigned = app.assignedOfficerId === null;
            const isExFailed = app.status === "EXTRACTION_FAILED" || hasFailedDoc;
            const hasDef = Boolean(latestScrutiny && (latestScrutiny.deficiencyCount > 0 || latestScrutiny.overallStatus === "DEFICIENCIES_DETECTED"));
            const hasRev = Boolean(latestScrutiny && (latestScrutiny.reviewCount > 0 || latestScrutiny.overallStatus === "MANUAL_REVIEW_REQUIRED"));
            const hasMiss = Boolean(latestScrutiny && latestScrutiny.missingCount > 0);
            const hasPend = verifs.some((v) => v.status === "CONFIRMATION_PENDING");
            const hasMis = verifs.some((v) => v.status === "MISMATCH_DETECTED" || v.status === "EXPIRED_AT_SOURCE");
            const hasForensic = latestScrutiny && Array.isArray(latestScrutiny.findings) && (latestScrutiny.findings as any[]).some((f) => f.ruleId === "RULE_DOC_ANOMALY_FORENSICS" && f.outcome !== "PASS");
            const isOld = daysSinceUpdate >= 7 && (!latestScrutiny || latestScrutiny.overallStatus !== "COMPLIANT");
            return Boolean(isUnassigned || isExFailed || hasDef || hasRev || hasMiss || hasPend || hasMis || hasForensic || isOld);
          }

          default:
            return true;
        }
      }

      return true;
    });

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Officer workload distribution and unassigned allocations.
   */
  async getOfficerWorkload(): Promise<{
    officers: OfficerWorkloadItem[];
    unassignedQueue: {
      count: number;
      applications: any[];
    };
    distributionSummary: {
      totalOfficers: number;
      totalAssignedApplications: number;
      avgApplicationsPerOfficer: number;
      maxApplicationsPerOfficer: number;
    };
  }> {
    const [officers, unassignedApps] = await Promise.all([
      prisma.user.findMany({
        where: { role: "OFFICER", isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          department: true,
          assignedApplications: {
            include: {
              scrutinyReports: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { overallStatus: true, deficiencyCount: true, reviewCount: true },
              },
              authorityVerifications: {
                select: { status: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.application.findMany({
        where: { assignedOfficerId: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          applicationNumber: true,
          institutionName: true,
          programCategory: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return this.computeOfficerWorkload(officers, unassignedApps);
  }

  /**
   * Computes officer workloads and distribution statistics from officer user records and unassigned applications.
   */
  computeOfficerWorkload(
    officers: any[],
    unassignedApps: any[]
  ): {
    officers: OfficerWorkloadItem[];
    unassignedQueue: {
      count: number;
      applications: any[];
    };
    distributionSummary: {
      totalOfficers: number;
      totalAssignedApplications: number;
      avgApplicationsPerOfficer: number;
      maxApplicationsPerOfficer: number;
    };
  } {
    const now = Date.now();
    const officerWorkloads: OfficerWorkloadItem[] = officers.map((off) => {
      const assigned = off.assignedApplications || [];
      let compliantCount = 0;
      let deficienciesCount = 0;
      let manualReviewCount = 0;
      let pendingConfirmationsCount = 0;
      let agingCount = 0;

      for (const app of assigned) {
        const latest = app.scrutinyReports?.[0];
        if (latest) {
          if (latest.overallStatus === "COMPLIANT") compliantCount++;
          if (latest.deficiencyCount > 0 || latest.overallStatus === "DEFICIENCIES_DETECTED") deficienciesCount++;
          if (latest.reviewCount > 0 || latest.overallStatus === "MANUAL_REVIEW_REQUIRED") manualReviewCount++;
        }
        if (app.authorityVerifications?.some((v: any) => v.status === "CONFIRMATION_PENDING")) {
          pendingConfirmationsCount++;
        }
        const days = Math.floor((now - new Date(app.updatedAt || app.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        if (days >= 7 && (!latest || latest.overallStatus !== "COMPLIANT")) {
          agingCount++;
        }
      }

      return {
        officer: {
          id: off.id,
          name: off.name,
          email: off.email,
          designation: off.designation,
          department: off.department,
        },
        totalAssigned: assigned.length,
        activeCount: assigned.length - compliantCount,
        compliantCount,
        deficienciesCount,
        manualReviewCount,
        pendingConfirmationsCount,
        agingCount,
      };
    });

    const totalAssigned = officerWorkloads.reduce((acc, curr) => acc + curr.totalAssigned, 0);
    const maxAssigned = officerWorkloads.reduce((max, curr) => Math.max(max, curr.totalAssigned), 0);
    const avgAssigned = officers.length > 0 ? Number((totalAssigned / officers.length).toFixed(1)) : 0;

    return {
      officers: officerWorkloads,
      unassignedQueue: {
        count: unassignedApps.length,
        applications: unassignedApps,
      },
      distributionSummary: {
        totalOfficers: officers.length,
        totalAssignedApplications: totalAssigned,
        avgApplicationsPerOfficer: avgAssigned,
        maxApplicationsPerOfficer: maxAssigned,
      },
    };
  }

  /**
   * Aggregated cross-application issue oversight register.
   */
  async getCrossApplicationIssues(params: {
    category?: string | undefined;
    severity?: string | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }): Promise<{
    issues: CrossApplicationIssueItem[];
    categoryCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const apps = await prisma.application.findMany({
      include: {
        assignedOfficer: {
          select: { id: true, name: true, email: true },
        },
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        authorityVerifications: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return this.computeIssuesFromApps(apps, params);
  }

  /**
   * Computes cross-application issues, counts, and filtered pagination from a pre-fetched applications list.
   */
  computeIssuesFromApps(
    apps: any[],
    params: {
      category?: string | undefined;
      severity?: string | undefined;
      search?: string | undefined;
      page?: number | undefined;
      limit?: number | undefined;
    } = {}
  ): {
    issues: CrossApplicationIssueItem[];
    categoryCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  } {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 25));
    const skip = (page - 1) * limit;

    const issues: CrossApplicationIssueItem[] = [];

    for (const app of apps) {
      const scrutiny = app.scrutinyReports?.[0];
      const verifs = app.authorityVerifications || [];

      // 1. Collect Scrutiny Findings Issues
      if (scrutiny && Array.isArray(scrutiny.findings)) {
        for (const finding of scrutiny.findings as any[]) {
          if (finding.outcome === "PASS" || finding.outcome === "NOT_APPLICABLE") continue;

          let category: CrossApplicationIssueItem["issueCategory"] = "COMPLIANCE_DEFICIENCY";
          if (finding.ruleId === "RULE_DOC_ANOMALY_FORENSICS") {
            category = "FORENSIC_ADVISORY";
          } else if (finding.outcome === "EVIDENCE_MISSING" || finding.ruleId === "RULE_MANDATORY_DOCUMENTS") {
            category = "MISSING_EVIDENCE";
          } else if (finding.outcome === "EXTRACTION_UNCERTAIN") {
            category = "EXTRACTION_UNCERTAIN";
          } else if (finding.outcome === "MANUAL_REVIEW_REQUIRED") {
            category = "MANUAL_REVIEW";
          } else {
            category = "COMPLIANCE_DEFICIENCY";
          }

          const excerpt = finding.evidence && finding.evidence.length > 0 ? finding.evidence[0]?.excerpt || null : null;

          issues.push({
            id: `scrutiny-${scrutiny.id}-${finding.ruleId}`,
            applicationId: app.id,
            applicationNumber: app.applicationNumber,
            institutionName: app.institutionName,
            assignedOfficerName: app.assignedOfficer?.name || null,
            issueCategory: category,
            severity: finding.severity || "MEDIUM",
            ruleIdOrSource: finding.ruleId,
            clause: finding.aphClause || null,
            title: finding.ruleName || finding.ruleId,
            details: finding.details || finding.summary || "Deficiency observed",
            evidenceExcerpt: excerpt,
            timestamp: new Date(scrutiny.createdAt || Date.now()).toISOString(),
          });
        }
      }

      // 2. Collect Authority Verification Issues
      for (const v of verifs) {
        if (v.status === "VERIFIED_SIMULATED" || v.status === "CONFIRMATION_RECORDED" || v.status === "FORMAT_VALID_UNVERIFIED") {
          continue;
        }

        let cat: CrossApplicationIssueItem["issueCategory"] = "AUTHORITY_MISMATCH";
        let sev: CrossApplicationIssueItem["severity"] = "HIGH";

        if (v.status === "EXPIRED_AT_SOURCE") {
          cat = "AUTHORITY_EXPIRED";
          sev = "HIGH";
        } else if (v.status === "CONFIRMATION_PENDING") {
          cat = "CONFIRMATION_PENDING";
          sev = "MEDIUM";
        } else if (v.status === "MISMATCH_DETECTED") {
          cat = "AUTHORITY_MISMATCH";
          sev = "CRITICAL";
        } else {
          cat = "AUTHORITY_MISMATCH";
          sev = "MEDIUM";
        }

        issues.push({
          id: `auth-${v.id}`,
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          institutionName: app.institutionName,
          assignedOfficerName: app.assignedOfficer?.name || null,
          issueCategory: cat,
          severity: sev,
          ruleIdOrSource: `${v.authorityCategory} (${v.sourceName})`,
          clause: null,
          title: `${v.authorityName} Verification: ${v.status}`,
          details: v.summary || v.scrutinyActionPrompt,
          evidenceExcerpt: v.queryReference ? `Query Ref: ${v.queryReference}` : null,
          timestamp: new Date(v.createdAt || Date.now()).toISOString(),
        });
      }
    }

    // Compute category and severity counts across the entire dataset
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};

    for (const item of issues) {
      categoryCounts[item.issueCategory] = (categoryCounts[item.issueCategory] || 0) + 1;
      severityCounts[item.severity] = (severityCounts[item.severity] || 0) + 1;
    }

    // Apply filtering
    let filtered = issues;

    if (params.category && params.category !== "ALL") {
      filtered = filtered.filter((i) => i.issueCategory === params.category);
    }

    if (params.severity && params.severity !== "ALL") {
      filtered = filtered.filter((i) => i.severity === params.severity);
    }

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.applicationNumber.toLowerCase().includes(q) ||
          i.institutionName.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.ruleIdOrSource.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      issues: paginated,
      categoryCounts,
      severityCounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Consolidated Ministry Administration Dashboard.
   * Executes independent database queries concurrently via Promise.all
   * and derives overview, workload, issues preview, and recent activity in one trip.
   */
  async getMinistryDashboard(): Promise<{
    overview: any;
    workload: any;
    issues: {
      issues: CrossApplicationIssueItem[];
      categoryCounts: Record<string, number>;
      severityCounts: Record<string, number>;
      total: number;
    };
    recentActivity: any[];
  }> {
    const [allApps, officers, unassignedApps, recentLogs] = await Promise.all([
      prisma.application.findMany({
        include: {
          assignedOfficer: {
            select: { id: true, name: true, email: true, designation: true },
          },
          documents: {
            select: { id: true, extractionStatus: true, documentType: true },
          },
          scrutinyReports: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          authorityVerifications: {
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.user.findMany({
        where: { role: "OFFICER", isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
          department: true,
          assignedApplications: {
            include: {
              scrutinyReports: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { overallStatus: true, deficiencyCount: true, reviewCount: true },
              },
              authorityVerifications: {
                select: { status: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.application.findMany({
        where: { assignedOfficerId: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          applicationNumber: true,
          institutionName: true,
          programCategory: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          application: {
            select: {
              id: true,
              applicationNumber: true,
              institutionName: true,
            },
          },
        },
      }),
    ]);

    const overview = this.computeOverview(allApps);
    const workload = this.computeOfficerWorkload(officers, unassignedApps);
    const issuesResult = this.computeIssuesFromApps(allApps, { limit: 10 });

    const formattedActivity = recentLogs.map((log: any) => ({
      id: log.id,
      timestamp: log.createdAt,
      action: log.action,
      actor: {
        id: log.actorId,
        name: log.actorName,
        role: log.actorRole,
        isSystem: log.actorRole === "SYSTEM",
      },
      application: log.application || null,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      status: log.status,
      details: log.details,
      metadata: log.metadata,
    }));

    return {
      overview,
      workload,
      issues: {
        issues: issuesResult.issues,
        categoryCounts: issuesResult.categoryCounts,
        severityCounts: issuesResult.severityCounts,
        total: issuesResult.pagination.total,
      },
      recentActivity: formattedActivity,
    };
  }

  /**
   * Ministry-wide operational audit activity log.
   */
  async getOperationalActivity(params: {
    action?: string | undefined;
    actorRole?: string | undefined;
    actorId?: string | undefined;
    status?: string | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }): Promise<{
    activity: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.action) {
      where.action = params.action;
    }

    if (params.actorRole) {
      where.actorRole = params.actorRole;
    }

    if (params.actorId) {
      where.actorId = params.actorId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { details: { contains: params.search, mode: "insensitive" } },
        { actorName: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          application: {
            select: {
              id: true,
              applicationNumber: true,
              institutionName: true,
            },
          },
        },
      }),
    ]);

    const formatted = logs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      action: log.action,
      actor: {
        id: log.actorId,
        name: log.actorName,
        role: log.actorRole,
        isSystem: log.actorRole === "SYSTEM",
      },
      application: log.application || null,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      status: log.status,
      details: log.details,
      metadata: log.metadata,
    }));

    return {
      activity: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const ministryService = new MinistryService();
