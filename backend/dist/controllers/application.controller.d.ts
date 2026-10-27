import type { Request, Response } from "express";
export declare const createApplication: (req: Request, res: Response) => Promise<void>;
export declare const runExtractionForApplication: (req: Request, res: Response) => Promise<void>;
export declare const runScrutinyForApplication: (req: Request, res: Response) => Promise<void>;
export declare const getScrutinyReportForApplication: (req: Request, res: Response) => Promise<void>;
export declare const getApplicationById: (req: Request, res: Response) => Promise<void>;
export declare const listApplications: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=application.controller.d.ts.map