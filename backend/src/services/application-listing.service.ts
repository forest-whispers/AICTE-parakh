import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth.service.js";

export interface ApplicationListingParams {
  search?: string;
  status?: string;
  scrutinyStatus?: string;
  programCategory?: string;
  officerId?: string; // Honored strictly for MINISTRY_ADMIN only
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ApplicationListingResult {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ApplicationListingService {
  /**
   * Unified, role-scoped applications listing with search, filtering, and pagination.
   *
   * Role Scoping Policy:
   * - OFFICER: strictly locked to applications assigned to the requesting officer (assignedOfficerId = user.id).
   *   Client-supplied officerId filters are ignored/overridden.
   * - MINISTRY_ADMIN: access to the entire portfolio. Can filter by specific officerId or "unassigned".
   *
   * Scrutiny Filtering Policy:
   * - Evaluates ONLY the latest persisted scrutiny report (app.scrutinyReports[0]), never older historical reports.
   * - Supports "UNASSESSED" / "AWAITING" for applications with zero scrutiny evaluations.
   * - Applies filtering across the full eligible dataset BEFORE pagination so total and totalPages are accurate.
   */
  async listApplications(
    user: AuthenticatedUser,
    params: ApplicationListingParams = {}
  ): Promise<ApplicationListingResult> {
    const where: any = {};

    // 1. Identity & Role-Based Scope Assignment
    if (user.role === "OFFICER") {
      where.assignedOfficerId = user.id;
    } else if (user.role === "MINISTRY_ADMIN") {
      if (params.officerId) {
        if (params.officerId === "unassigned") {
          where.assignedOfficerId = null;
        } else {
          where.assignedOfficerId = params.officerId;
        }
      }
    } else {
      // Unrecognized role
      return {
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
      };
    }

    // 2. Program Category Filter
    if (params.programCategory) {
      where.programCategory = params.programCategory;
    }

    // 3. Application Lifecycle Status Filter
    if (params.status) {
      where.status = params.status;
    }

    // 4. Text Search (Application Reference Number or Institution Name)
    if (params.search && params.search.trim()) {
      const query = params.search.trim();
      where.OR = [
        { applicationNumber: { contains: query, mode: "insensitive" } },
        { institutionName: { contains: query, mode: "insensitive" } },
      ];
    }

    // 5. Query full eligible set with latest scrutiny report included
    const allMatching = await prisma.application.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: params.sortOrder === "asc" ? "asc" : "desc" },
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
            extractedData: true,
          },
        },
        scrutinyReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            overallStatus: true,
            totalRulesRun: true,
            passedCount: true,
            deficiencyCount: true,
            reviewCount: true,
            missingCount: true,
            evaluationDate: true,
          },
        },
      },
    });

    // 6. Filter by Latest Scrutiny Report (Guaranteed latest via take: 1, desc)
    let filtered = allMatching;
    if (params.scrutinyStatus && params.scrutinyStatus.trim()) {
      const target = params.scrutinyStatus.trim().toUpperCase();
      filtered = allMatching.filter((app) => {
        const latestReport = app.scrutinyReports?.[0];
        if (target === "UNASSESSED" || target === "AWAITING" || target === "NONE") {
          return !latestReport;
        }
        return latestReport?.overallStatus === target;
      });
    }

    // 7. Calculate accurate pagination metadata over the fully-filtered result set
    const total = filtered.length;
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;
    const pagedData = filtered.slice(skip, skip + limit);

    return {
      data: pagedData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}

export const applicationListingService = new ApplicationListingService();
