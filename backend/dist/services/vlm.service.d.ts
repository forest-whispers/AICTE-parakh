import { type BatchExtractionResponse } from "../schemas/extraction.schema.js";
export declare const buildSystemPrompt: () => string;
/**
 * Sanitizes raw JSON string from LLMs:
 * - Strips Markdown fences
 * - Escapes unescaped control characters (newlines, carriage returns, tabs) inside string literals
 */
export declare function sanitizeJsonString(raw: string): string;
export interface ProcessDocumentItem {
    id: string;
    filePath: string;
    mimeType: string;
    originalName: string;
}
export declare class VLMService {
    private ai;
    constructor();
    private getClient;
    /**
     * Process an application's uploaded documents in a single multimodal VLM request.
     */
    processApplicationDocuments(applicationId: string, documents: ProcessDocumentItem[]): Promise<{
        success: boolean;
        data?: BatchExtractionResponse;
        error?: string;
    }>;
}
export declare const vlmService: VLMService;
//# sourceMappingURL=vlm.service.d.ts.map