import { prisma } from "../lib/prisma.js";

export interface PrioritizedQueueItem {
  id: string;
  applicationId: string;
  applicationNumber: string;
  institutionName: string;
  priorityRank: number; // 1 (Highest) to 8 (Lowest)
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY" | "INFO";
  issueType:
    | "EXTRACTION_FAILURE"
    | "REGULATORY_DEFICIENCY"
    | "AUTHORITY_MISMATCH"
    | "AUTHORITY_EXPIRED"
    | "MISSING_MANDATORY_DOCUMENTS"
    | "PENDING_BANK_CONFIRMATION"
    | "MANUAL_REVIEW_REQUIRED"
    | "EXTRACTION_UNCERTAIN"
    | "FORENSIC_ADVISORY"
    | "SCRUTINY_PENDING";
  title: string;
  explanation: string;
  recommendedAction: string;
  relatedDocumentType: string | null;
  ruleIdOrSource: string | null;
  detectedAt?: Date | string;
}

export interface WorkbenchOverviewData {
  totalAssigned: number;
  activeAssigned: number;
  compliantCount: number;
  deficienciesCount: number;
  manualReviewCount: number;
  pendingConfirmationsCount: number;
  extractionFailedCount: number;
  unreadNotificationsCount: number;
}

export interface WorkbenchDashboardData {
  overview: WorkbenchOverviewData;
  actionQueue: PrioritizedQueueItem[];
  reviewBuckets: ReviewWorkBucket[];
  assignedApplications: any[];
  recentActivity: any[];
}

export interface ReviewWorkBucket {
  category: string;
  label: string;
  count: number;
  items: Array<{
    applicationId: string;
    applicationNumber: string;
    institutionName: string;
    itemKey: string;
    title: string;
    severity: string;
    details: string;
    evidenceExcerpt?: string | null;
  }>;
}

export class WorkbenchService {
  /**
   * Computes officer workbench executive overview counters from applications and unread notifications.
   */
  computeOverview(apps: any[], unreadNotificationsCount: number): WorkbenchOverviewData {
    let compliantCount = 0;
    let deficienciesCount = 0;
    let manualReviewCount = 0;
    let pendingConfirmationsCount = 0;
    let extractionFailedCount = 0;

    for (const app of apps) {
      const scrutiny = app.scrutinyReports?.[0];
      const verifs = app.authorityVerifications || [];
      const hasFailedDoc = app.documents?.some((d: any) => d.extractionStatus === "FAILED");

      if (app.status === "EXTRACTION_FAILED" || hasFailedDoc) {
        extractionFailedCount++;
      }

      if (scrutiny) {
        if (scrutiny.overallStatus === "COMPLIANT") compliantCount++;
        if (scrutiny.deficiencyCount > 0 || scrutiny.overallStatus === "DEFICIENCIES_DETECTED") deficienciesCount++;
        if (scrutiny.reviewCount > 0 || scrutiny.overallStatus === "MANUAL_REVIEW_REQUIRED") manualReviewCount++;
      }

      if (verifs.some((v: any) => v.status === "CONFIRMATION_PENDING")) {
        pendingConfirmationsCount++;
      }
    }

    return {
      totalAssigned: apps.length,
      activeAssigned: apps.length - compliantCount,
      compliantCount,
      deficienciesCount,
      manualReviewCount,
      pendingConfirmationsCount,
      extractionFailedCount,
      unreadNotificationsCount,
    };
  }

  /**
   * Officer personal workbench executive overview.
   */
  async getWorkbenchOverview(officerId: string): Promise<WorkbenchOverviewData> {
    const [apps, unreadNotificationsCount] = await Promise.all([
      prisma.application.findMany({
        where: { assignedOfficerId: officerId },
        include: {
          documents: {
            select: { id: true, extractionStatus: true },
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
      prisma.notification.count({
        where: { recipientId: officerId, isRead: false },
      }),
    ]);

    return this.computeOverview(apps, unreadNotificationsCount);
  }

  /**
   * Searchable, filterable, paginated register of applications assigned strictly to the authenticated officer.
   */
  async getAssignedApplications(
    officerId: string,
    params: {
      search?: string | undefined;
      status?: string | undefined;
      programCategory?: string | undefined;
      hasDeficiencies?: boolean | undefined;
      hasPendingVerifications?: boolean | undefined;
      hasManualReview?: boolean | undefined;
      page?: number | undefined;
      limit?: number | undefined;
      sortBy?: string | undefined;
      sortOrder?: "asc" | "desc" | undefined;
    }
  ): Promise<{
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
    const where: any = {
      assignedOfficerId: officerId,
    };

    if (params.programCategory) {
      where.programCategory = params.programCategory;
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { applicationNumber: { contains: q, mode: "insensitive" } },
        { institutionName: { contains: q, mode: "insensitive" } },
      ];
    }

    const apps = await prisma.application.findMany({
      where,
      include: {
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

    // In-memory filter for flexible multi-condition queries
    const filtered = apps.filter((app) => {
      if (params.search) {
        const q = params.search.toLowerCase().trim();
        const mNum = app.applicationNumber.toLowerCase().includes(q);
        const mName = app.institutionName.toLowerCase().includes(q);
        if (!mNum && !mName) return false;
      }

      if (params.programCategory && app.programCategory !== params.programCategory) {
        return false;
      }

      const scrutiny = app.scrutinyReports[0];
      const verifs = app.authorityVerifications || [];

      if (params.status) {
        const s = params.status.toUpperCase();
        const currentStatus = (scrutiny?.overallStatus || app.status).toUpperCase();
        if (currentStatus !== s) return false;
      }

      if (params.hasDeficiencies !== undefined) {
        const hasDef = Boolean(scrutiny && (scrutiny.deficiencyCount > 0 || scrutiny.overallStatus === "DEFICIENCIES_DETECTED"));
        if (hasDef !== params.hasDeficiencies) return false;
      }

      if (params.hasManualReview !== undefined) {
        const hasRev = Boolean(scrutiny && (scrutiny.reviewCount > 0 || scrutiny.overallStatus === "MANUAL_REVIEW_REQUIRED"));
        if (hasRev !== params.hasManualReview) return false;
      }

      if (params.hasPendingVerifications !== undefined) {
        const hasPend = verifs.some((v) => v.status === "CONFIRMATION_PENDING");
        if (hasPend !== params.hasPendingVerifications) return false;
      }

      return true;
    });

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit).map((app) => {
      const scrutiny = app.scrutinyReports[0] || null;
      const verifs = app.authorityVerifications || [];

      // Generate unresolved issue tags
      const tags: string[] = [];
      if (app.status === "EXTRACTION_FAILED") tags.push("Extraction Failed");
      if (scrutiny?.deficiencyCount && scrutiny.deficiencyCount > 0) tags.push(`${scrutiny.deficiencyCount} Deficiencies`);
      if (scrutiny?.missingCount && scrutiny.missingCount > 0) tags.push(`${scrutiny.missingCount} Missing Docs`);
      if (scrutiny?.reviewCount && scrutiny.reviewCount > 0) tags.push(`${scrutiny.reviewCount} Reviews Required`);
      if (verifs.some((v) => v.status === "CONFIRMATION_PENDING")) tags.push("Pending Bank Letter");
      if (verifs.some((v) => v.status === "MISMATCH_DETECTED")) tags.push("Authority Mismatch");
      if (verifs.some((v) => v.status === "EXPIRED_AT_SOURCE")) tags.push("Expired Authority NOC");

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        institutionName: app.institutionName,
        programCategory: app.programCategory,
        proposedIntake: app.proposedIntake,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        assignedAt: app.assignedAt,
        documentsSummary: {
          total: app.documents.length,
          extracted: app.documents.filter((d) => d.extractionStatus === "SUCCESS").length,
          failed: app.documents.filter((d) => d.extractionStatus === "FAILED").length,
        },
        scrutinySummary: scrutiny
          ? {
              overallStatus: scrutiny.overallStatus,
              passedCount: scrutiny.passedCount,
              deficiencyCount: scrutiny.deficiencyCount,
              reviewCount: scrutiny.reviewCount,
              missingCount: scrutiny.missingCount,
              evaluationDate: scrutiny.evaluationDate,
            }
          : null,
        authorityVerificationSummary: {
          totalRun: verifs.length,
          verified: verifs.filter((v) => v.status === "VERIFIED_SIMULATED").length,
          mismatches: verifs.filter((v) => v.status === "MISMATCH_DETECTED" || v.status === "EXPIRED_AT_SOURCE").length,
          pending: verifs.filter((v) => v.status === "CONFIRMATION_PENDING").length,
          recorded: verifs.filter((v) => v.status === "CONFIRMATION_RECORDED").length,
        },
        issueTags: tags,
      };
    });

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
   * Actionable prioritized queue of operational tasks for the officer's applications.
   */
  /**
   * Computes the prioritized operational queue for a given list of applications.
   */
  computeActionQueue(apps: any[]): PrioritizedQueueItem[] {
    const queue: PrioritizedQueueItem[] = [];

    for (const app of apps) {
      const scrutiny = app.scrutinyReports[0] || null;
      const verifs = app.authorityVerifications || [];

      // 1. Priority 1 (CRITICAL): Extraction Failures
      const hasFailedDoc = app.documents.some((d: any) => d.extractionStatus === "FAILED");
      if (app.status === "EXTRACTION_FAILED" || hasFailedDoc) {
        queue.push({
          id: `queue-${app.id}-extraction-fail`,
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          institutionName: app.institutionName,
          priorityRank: 1,
          urgency: "CRITICAL",
          issueType: "EXTRACTION_FAILURE",
          title: "Multimodal Document Ingestion Failure",
          explanation: "One or more documents could not be parsed by the VLM pipeline; automated scrutiny is blocked.",
          recommendedAction: "Examine raw PDF upload format and re-trigger multimodal extraction.",
          relatedDocumentType: null,
          ruleIdOrSource: "VLM_INGESTION",
        });
      }

      // 2. Priority 2 (CRITICAL/HIGH): Statutory Compliance Deficiencies
      if (scrutiny && Array.isArray(scrutiny.findings)) {
        for (const finding of scrutiny.findings as any[]) {
          if (finding.outcome === "FAIL_DEFICIENCY") {
            const isCritical = finding.severity === "CRITICAL";
            queue.push({
              id: `queue-${app.id}-${finding.ruleId}`,
              applicationId: app.id,
              applicationNumber: app.applicationNumber,
              institutionName: app.institutionName,
              priorityRank: isCritical ? 2 : 3,
              urgency: isCritical ? "CRITICAL" : "HIGH",
              issueType: "REGULATORY_DEFICIENCY",
              title: `${finding.ruleName || finding.ruleId} Deficiency`,
              explanation: finding.summary || finding.details || "Statutory non-compliance detected.",
              recommendedAction: finding.remediationNote || "Issue documentary deficiency memo under APH clause.",
              relatedDocumentType: finding.evidence?.[0]?.documentType || null,
              ruleIdOrSource: finding.ruleId,
            });
          }
        }
      }

      // 3. Priority 3 (HIGH): Authority Record Mismatches or Expired Certificates
      for (const v of verifs) {
        if (v.status === "MISMATCH_DETECTED") {
          queue.push({
            id: `queue-${app.id}-auth-mismatch-${v.id}`,
            applicationId: app.id,
            applicationNumber: app.applicationNumber,
            institutionName: app.institutionName,
            priorityRank: 3,
            urgency: "HIGH",
            issueType: "AUTHORITY_MISMATCH",
            title: `Authority Discrepancy: ${v.authorityName}`,
            explanation: v.summary || "Extracted certificate details diverge from statutory authority record.",
            recommendedAction: v.scrutinyActionPrompt || "Requisition certified copy from issuing authority.",
            relatedDocumentType: v.documentId ? "SUPPORTING_DOCUMENT" : null,
            ruleIdOrSource: v.authorityCategory,
          });
        } else if (v.status === "EXPIRED_AT_SOURCE") {
          queue.push({
            id: `queue-${app.id}-auth-expired-${v.id}`,
            applicationId: app.id,
            applicationNumber: app.applicationNumber,
            institutionName: app.institutionName,
            priorityRank: 3,
            urgency: "HIGH",
            issueType: "AUTHORITY_EXPIRED",
            title: `Statutory Certificate Expired: ${v.authorityName}`,
            explanation: `Certificate validity expired at source (${v.summary}).`,
            recommendedAction: "Request valid renewal endorsement or current operational NOC.",
            relatedDocumentType: null,
            ruleIdOrSource: v.authorityCategory,
          });
        }
      }

      // 4. Priority 4 (HIGH): Missing Mandatory Statutory Documents
      if (scrutiny && scrutiny.missingCount > 0) {
        queue.push({
          id: `queue-${app.id}-missing-docs`,
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          institutionName: app.institutionName,
          priorityRank: 4,
          urgency: "HIGH",
          issueType: "MISSING_MANDATORY_DOCUMENTS",
          title: `Incomplete Submission: ${scrutiny.missingCount} Missing Mandatory Annexures`,
          explanation: "Statutory mandatory documents required under APH Annexure 3.1 have not been uploaded.",
          recommendedAction: "Dispatch documentary requisition notice for missing annexures.",
          relatedDocumentType: "MANDATORY_ANNEXURES",
          ruleIdOrSource: "RULE_MANDATORY_DOCUMENTS",
        });
      }

      // 5. Priority 5 (MEDIUM): Pending Bank Branch Confirmations
      const pendingBankVerifs = verifs.filter((v: any) => v.status === "CONFIRMATION_PENDING");
      for (const pv of pendingBankVerifs) {
        queue.push({
          id: `queue-${app.id}-bank-pend-${pv.id}`,
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          institutionName: app.institutionName,
          priorityRank: 5,
          urgency: "MEDIUM",
          issueType: "PENDING_BANK_CONFIRMATION",
          title: "Awaiting Bank Branch Manager Confirmation Letter",
          explanation: "Inquiry dispatched to bank branch regarding unencumbered status of mandatory FDR deposit.",
          recommendedAction: "Record branch manager confirmation letter on file when inward letter is received.",
          relatedDocumentType: "DOC_10_BANK_FUNDS",
          ruleIdOrSource: "BANK_BRANCH",
        });
      }

      // 6. Priority 6 (MEDIUM): Manual Review Required or Uncertain Evidence
      if (scrutiny && Array.isArray(scrutiny.findings)) {
        for (const finding of scrutiny.findings as any[]) {
          if (finding.outcome === "MANUAL_REVIEW_REQUIRED" && finding.ruleId !== "RULE_DOC_ANOMALY_FORENSICS") {
            queue.push({
              id: `queue-${app.id}-manual-${finding.ruleId}`,
              applicationId: app.id,
              applicationNumber: app.applicationNumber,
              institutionName: app.institutionName,
              priorityRank: 6,
              urgency: "MEDIUM",
              issueType: "MANUAL_REVIEW_REQUIRED",
              title: `Manual Verification Required: ${finding.ruleName || finding.ruleId}`,
              explanation: finding.summary || finding.details || "Conditional criteria require manual inspection.",
              recommendedAction: "Inspect original document excerpt and verify compliance parameters.",
              relatedDocumentType: finding.evidence?.[0]?.documentType || null,
              ruleIdOrSource: finding.ruleId,
            });
          } else if (finding.outcome === "EXTRACTION_UNCERTAIN") {
            queue.push({
              id: `queue-${app.id}-uncertain-${finding.ruleId}`,
              applicationId: app.id,
              applicationNumber: app.applicationNumber,
              institutionName: app.institutionName,
              priorityRank: 6,
              urgency: "MEDIUM",
              issueType: "EXTRACTION_UNCERTAIN",
              title: `Uncertain Evidence: ${finding.ruleName || finding.ruleId}`,
              explanation: finding.details || "Low extraction confidence or ambiguous scan.",
              recommendedAction: "Manually verify verbatim field in uploaded document viewer.",
              relatedDocumentType: finding.evidence?.[0]?.documentType || null,
              ruleIdOrSource: finding.ruleId,
            });
          }
        }
      }

      // 7. Priority 7 (ADVISORY): Document Forensics Advisories
      if (scrutiny && Array.isArray(scrutiny.findings)) {
        for (const finding of scrutiny.findings as any[]) {
          if (finding.ruleId === "RULE_DOC_ANOMALY_FORENSICS" && finding.outcome !== "PASS") {
            queue.push({
              id: `queue-${app.id}-forensics`,
              applicationId: app.id,
              applicationNumber: app.applicationNumber,
              institutionName: app.institutionName,
              priorityRank: 7,
              urgency: "ADVISORY",
              issueType: "FORENSIC_ADVISORY",
              title: "Preliminary Document Forensics Advisory",
              explanation: finding.summary || "PDF metadata reveals third-party editor or revision markers.",
              recommendedAction: "Perform visual sanity check on signatures, seals, and formatting (do not assume manipulation).",
              relatedDocumentType: null,
              ruleIdOrSource: "PDF_FORENSICS",
            });
          }
        }
      }

      // 8. Priority 8 (INFO): Applications Awaiting First Scrutiny Run
      const hasExtracted = app.documents.some((d: any) => d.extractionStatus === "SUCCESS");
      if (hasExtracted && !scrutiny) {
        queue.push({
          id: `queue-${app.id}-scrutiny-pending`,
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          institutionName: app.institutionName,
          priorityRank: 8,
          urgency: "INFO",
          issueType: "SCRUTINY_PENDING",
          title: "Awaiting Initial Deterministic Scrutiny",
          explanation: "Documents extracted; initial scrutiny evaluation has not yet been executed.",
          recommendedAction: "Trigger deterministic scrutiny evaluation.",
          relatedDocumentType: null,
          ruleIdOrSource: "SCRUTINY_ENGINE",
        });
      }
    }

    // Sort queue strictly by priorityRank (1 = highest urgency)
    queue.sort((a, b) => a.priorityRank - b.priorityRank);

    return queue;
  }

  /**
   * Actionable prioritized queue of operational tasks for the officer's applications.
   */
  async getPrioritizedActionQueue(officerId: string): Promise<PrioritizedQueueItem[]> {
    const apps = await prisma.application.findMany({
      where: { assignedOfficerId: officerId },
      include: {
        documents: true,
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        authorityVerifications: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return this.computeActionQueue(apps);
  }

  /**
   * Computes scrutiny & authority review work broken down into distinct, unflattened categories.
   */
  computeReviewBuckets(apps: any[]): ReviewWorkBucket[] {

    type BucketKey =
      | "complianceDeficiencies"
      | "missingEvidence"
      | "uncertainExtraction"
      | "manualReviewRequired"
      | "forensicAdvisories"
      | "authorityMismatches"
      | "authorityExpired"
      | "pendingBankConfirmations"
      | "recordedBankConfirmations";

    const buckets: Record<BucketKey, ReviewWorkBucket> = {
      complianceDeficiencies: {
        category: "COMPLIANCE_DEFICIENCIES",
        label: "Deterministic Compliance Deficiencies",
        count: 0,
        items: [],
      },
      missingEvidence: {
        category: "MISSING_EVIDENCE",
        label: "Missing Statutory Annexures",
        count: 0,
        items: [],
      },
      uncertainExtraction: {
        category: "UNCERTAIN_EXTRACTION",
        label: "Uncertain Field Extractions",
        count: 0,
        items: [],
      },
      manualReviewRequired: {
        category: "MANUAL_REVIEW_REQUIRED",
        label: "Manual Inspection Requirements",
        count: 0,
        items: [],
      },
      forensicAdvisories: {
        category: "FORENSIC_ADVISORIES",
        label: "PDF Forensics & Metadata Advisories",
        count: 0,
        items: [],
      },
      authorityMismatches: {
        category: "AUTHORITY_MISMATCHES",
        label: "Issuing Authority Discrepancies",
        count: 0,
        items: [],
      },
      authorityExpired: {
        category: "AUTHORITY_EXPIRED",
        label: "Expired Statutory Certificates",
        count: 0,
        items: [],
      },
      pendingBankConfirmations: {
        category: "PENDING_BANK_CONFIRMATIONS",
        label: "Pending Bank Branch Confirmations",
        count: 0,
        items: [],
      },
      recordedBankConfirmations: {
        category: "RECORDED_BANK_CONFIRMATIONS",
        label: "Recorded Bank Branch Letters (On File)",
        count: 0,
        items: [],
      },
    };

    for (const app of apps) {
      const scrutiny = app.scrutinyReports[0];
      const verifs = app.authorityVerifications || [];

      if (scrutiny && Array.isArray(scrutiny.findings)) {
        for (const finding of scrutiny.findings as any[]) {
          const baseItem = {
            applicationId: app.id,
            applicationNumber: app.applicationNumber,
            institutionName: app.institutionName,
            itemKey: finding.ruleId,
            title: finding.ruleName || finding.ruleId,
            severity: finding.severity || "MEDIUM",
            details: finding.details || finding.summary,
            evidenceExcerpt: finding.evidence?.[0]?.excerpt || null,
          };

          if (finding.outcome === "FAIL_DEFICIENCY") {
            buckets.complianceDeficiencies.items.push(baseItem);
            buckets.complianceDeficiencies.count++;
          } else if (finding.outcome === "EVIDENCE_MISSING" || finding.ruleId === "RULE_MANDATORY_DOCUMENTS") {
            buckets.missingEvidence.items.push(baseItem);
            buckets.missingEvidence.count++;
          } else if (finding.outcome === "EXTRACTION_UNCERTAIN") {
            buckets.uncertainExtraction.items.push(baseItem);
            buckets.uncertainExtraction.count++;
          } else if (finding.outcome === "MANUAL_REVIEW_REQUIRED") {
            if (finding.ruleId === "RULE_DOC_ANOMALY_FORENSICS") {
              buckets.forensicAdvisories.items.push(baseItem);
              buckets.forensicAdvisories.count++;
            } else {
              buckets.manualReviewRequired.items.push(baseItem);
              buckets.manualReviewRequired.count++;
            }
          }
        }
      }

      for (const v of verifs) {
        const authItem = {
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          institutionName: app.institutionName,
          itemKey: v.id,
          title: `${v.authorityName} (${v.authorityCategory})`,
          severity: v.status === "MISMATCH_DETECTED" ? "HIGH" : "MEDIUM",
          details: v.summary,
          evidenceExcerpt: v.queryReference ? `Query Ref: ${v.queryReference}` : null,
        };

        if (v.status === "MISMATCH_DETECTED") {
          buckets.authorityMismatches.items.push(authItem);
          buckets.authorityMismatches.count++;
        } else if (v.status === "EXPIRED_AT_SOURCE") {
          buckets.authorityExpired.items.push(authItem);
          buckets.authorityExpired.count++;
        } else if (v.status === "CONFIRMATION_PENDING") {
          buckets.pendingBankConfirmations.items.push(authItem);
          buckets.pendingBankConfirmations.count++;
        } else if (v.status === "CONFIRMATION_RECORDED") {
          buckets.recordedBankConfirmations.items.push(authItem);
          buckets.recordedBankConfirmations.count++;
        }
      }
    }

    return Object.values(buckets);
  }

  /**
   * Scrutiny & Authority review work broken down into distinct, unflattened categories.
   */
  async getReviewAndVerificationWork(officerId: string): Promise<ReviewWorkBucket[]> {
    const apps = await prisma.application.findMany({
      where: { assignedOfficerId: officerId },
      include: {
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        authorityVerifications: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return this.computeReviewBuckets(apps);
  }

  /**
   * Audit activity affecting applications assigned strictly to the authenticated officer.
   */
  async getAssignedActivity(
    officerId: string,
    params: {
      page?: number | undefined;
      limit?: number | undefined;
    }
  ): Promise<{
    activity: any[];
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

    const where: any = {
      application: {
        assignedOfficerId: officerId,
      },
    };

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
      status: log.status,
      details: log.details,
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

  /**
   * Unified officer workbench dashboard: resolves overview metrics, prioritized queue,
   * review buckets, assigned applications preview, and recent activity in a single
   * optimized operation with concurrent database queries.
   */
  async getWorkbenchDashboard(officerId: string): Promise<WorkbenchDashboardData> {
    const [apps, unreadNotificationsCount, assignedAppsResult, activityResult] = await Promise.all([
      prisma.application.findMany({
        where: { assignedOfficerId: officerId },
        include: {
          documents: true,
          scrutinyReports: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          authorityVerifications: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.notification.count({
        where: { recipientId: officerId, isRead: false },
      }),
      this.getAssignedApplications(officerId, { limit: 5 }),
      this.getAssignedActivity(officerId, { limit: 5 }),
    ]);

    const overview = this.computeOverview(apps, unreadNotificationsCount);
    const actionQueue = this.computeActionQueue(apps);
    const reviewBuckets = this.computeReviewBuckets(apps);

    return {
      overview,
      actionQueue,
      reviewBuckets,
      assignedApplications: assignedAppsResult.data,
      recentActivity: activityResult.activity,
    };
  }
}

export const workbenchService = new WorkbenchService();
