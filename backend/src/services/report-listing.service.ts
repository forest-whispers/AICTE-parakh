import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth.service.js";

export interface ReportListingParams {
  search?: string;
  status?: string;
  programCategory?: string;
  officerId?: string; // Honored strictly for MINISTRY_ADMIN only
  page?: number | string;
  limit?: number | string;
  sortOrder?: "asc" | "desc";
}

export interface ReportListingResult {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ReportListingService {
  /**
   * Unified, role-scoped scrutiny report listing with database-level filtering and pagination.
   *
   * Scoping & Invariance Policy:
   * - Lists persisted ScrutinyReport records directly. Applications without a persisted report
   *   have no ScrutinyReport rows and therefore never appear.
   * - Every persisted report (including historical reports) has its own record.
   * - OFFICER: strictly locked to reports whose application is assigned to them (application.assignedOfficerId = user.id).
   *   Client-supplied officerId filters are ignored/overridden.
   * - MINISTRY_ADMIN: access across the entire ministry-wide scope. Can filter by specific officerId.
   */
  async listReports(
    user: AuthenticatedUser,
    params: ReportListingParams = {}
  ): Promise<ReportListingResult> {
    const where: any = {};

    // 1. Role-based scoping
    if (user.role === "OFFICER") {
      where.application = {
        assignedOfficerId: user.id,
      };
    } else if (user.role === "MINISTRY_ADMIN") {
      if (params.officerId) {
        where.application = {
          assignedOfficerId: params.officerId === "unassigned" ? null : params.officerId,
        };
      }
    } else {
      return {
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
      };
    }

    // 2. Scrutiny Overall Status Filter
    if (params.status && params.status.trim()) {
      where.overallStatus = params.status.trim().toUpperCase();
    }

    // 3. Program Category Filter
    if (params.programCategory && params.programCategory.trim()) {
      where.application = {
        ...where.application,
        programCategory: params.programCategory.trim(),
      };
    }

    // 4. Search Filter (by Application Reference Number or Institution Name)
    if (params.search && params.search.trim()) {
      const query = params.search.trim();
      where.application = {
        ...where.application,
        OR: [
          { applicationNumber: { contains: query, mode: "insensitive" } },
          { institutionName: { contains: query, mode: "insensitive" } },
        ],
      };
    }

    // 5. Pagination and count
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const [total, reports] = await Promise.all([
      prisma.scrutinyReport.count({ where }),
      prisma.scrutinyReport.findMany({
        where,
        orderBy: { evaluationDate: params.sortOrder === "asc" ? "asc" : "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          applicationId: true,
          evaluationDate: true,
          overallStatus: true,
          totalRulesRun: true,
          passedCount: true,
          deficiencyCount: true,
          reviewCount: true,
          missingCount: true,
          createdAt: true,
          application: {
            select: {
              id: true,
              applicationNumber: true,
              institutionName: true,
              programCategory: true,
              proposedIntake: true,
              status: true,
              assignedOfficerId: true,
              assignedOfficer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  designation: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: reports,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}

export const reportListingService = new ReportListingService();

