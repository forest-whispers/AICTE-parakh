import type { UserSanitized } from "./auth.service.js";
export declare class AssignmentService {
    /**
     * Assign or reassign an application to an officer according to strict authorization policy.
     */
    assignApplication(applicationId: string, targetOfficerId: string, actor: UserSanitized, reason?: string): Promise<{
        assignedOfficer: {
            email: string;
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        institutionName: string;
        applicationNumber: string;
        programCategory: string | null;
        proposedIntake: number | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        assignedOfficerId: string | null;
        assignedById: string | null;
        assignedAt: Date | null;
    }>;
    /**
     * List unassigned applications for ministry administration oversight.
     */
    getUnassignedApplications(): Promise<({
        documents: {
            documentType: string;
            id: string;
            originalName: string;
        }[];
    } & {
        id: string;
        institutionName: string;
        applicationNumber: string;
        programCategory: string | null;
        proposedIntake: number | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        assignedOfficerId: string | null;
        assignedById: string | null;
        assignedAt: Date | null;
    })[]>;
}
export declare const assignmentService: AssignmentService;
//# sourceMappingURL=assignment.service.d.ts.map