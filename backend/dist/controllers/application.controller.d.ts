import type { Request, Response } from "express";
export declare const createApplication: (req: Request, res: Response) => Promise<void>;
export declare const runExtractionForApplication: (req: Request, res: Response) => Promise<void>;
export declare const runScrutinyForApplication: (req: Request, res: Response) => Promise<void>;
export declare const getScrutinyReportForApplication: (req: Request, res: Response) => Promise<void>;
export declare const getApplicationById: (req: Request, res: Response) => Promise<void>;
/**
 * Unified Case Workspace endpoint (Slice 5).
 * Consolidates application details, documents, latest scrutiny report,
 * authority verifications, and audit chronology into a single concurrent response.
 */
export declare const getCaseWorkspaceData: (req: Request, res: Response) => Promise<void>;
export declare const listApplications: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=application.controller.d.ts.map