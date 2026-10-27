/**
 * PDF Forensics & Structural Inspection Service (Slice 4A)
 *
 * Lightweight, zero-dependency, pure-TypeScript PDF metadata and structural inspector.
 * Designed conservatively: avoids false positives by validating structural context
 * rather than scanning ungrounded raw byte sequences.
 */
export interface PdfForensicsReport {
    pdfVersion: string | null;
    producer: string | null;
    creator: string | null;
    creationDate: Date | null;
    modDate: Date | null;
    rawCreationDateStr: string | null;
    rawModDateStr: string | null;
    revisionCount: number | null;
    isEncrypted: boolean | null;
    hasJavaScript: boolean | null;
    toolCategory: "STANDARD" | "GRAPHIC_EDITOR" | "ONLINE_UTILITY" | "OFFICE_SUITE" | "UNKNOWN";
    confidence: "CONFIRMED" | "INCONCLUSIVE";
    details: string[];
}
/**
 * Extracts a balanced PDF string literal starting right after an opening parenthesis.
 * Handles escaped parentheses \(, \), and backslashes \\.
 */
export declare function extractPdfString(str: string, startPos: number): string;
/**
 * Parses PDF date format: D:YYYYMMDDHHmmSS[OHH'mm'] into a Date object.
 */
export declare function parsePdfDate(dateStr: string | null | undefined): Date | null;
/**
 * Classifies the authoring tool category based on confirmed producer and creator metadata.
 */
export declare function categorizeTool(producer: string | null, creator: string | null): "STANDARD" | "GRAPHIC_EDITOR" | "ONLINE_UTILITY" | "OFFICE_SUITE" | "UNKNOWN";
export declare class PdfForensicsService {
    /**
     * Evaluates raw PDF buffer to extract structural and metadata indicators conservatively.
     */
    inspectBuffer(buffer: Buffer): PdfForensicsReport;
}
export declare const pdfForensicsService: PdfForensicsService;
//# sourceMappingURL=pdf-forensics.service.d.ts.map