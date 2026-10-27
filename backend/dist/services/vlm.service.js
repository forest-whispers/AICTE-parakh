import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { BatchExtractionResponseSchema, } from "../schemas/extraction.schema.js";
export const buildSystemPrompt = () => {
    return `You are an expert AICTE Regulatory Document Scrutiny Auditor for "New Institution (Initial Approval)" applications.

Your task is to analyze the provided documents, classify each document according to the AICTE Approval Process Handbook (APH) inventory, extract predefined regulatory fields, and provide grounded evidence (verbatim text excerpts, page numbers, and raw strings).

=== CRITICAL OPERATING PRINCIPLES ===
1. STRICT CONTEXT ISOLATION:
   - Each document is individually delimited by boundary markers:
     [DOCUMENT_BOUNDARY_START documentId="..." originalFileName="..."]
     ... document content ...
     [DOCUMENT_BOUNDARY_END]
   - You MUST extract information from each document in STRICT ISOLATION.
   - NEVER borrow names, dates, amounts, or identifiers from one document to fill in, infer, or correct another document.
   - If a name is misspelled or differs across documents (e.g. "ABC Trust" in one deed vs "Mr. ABC" in a bank certificate), extract EXACTLY what is printed in that specific document. Preserving these exact differences is essential for regulatory scrutiny.

2. DOCUMENT CLASSIFICATION:
   Classify each document into exactly ONE of the following APH document types:
   - DOC_01_REGISTRATION: Applicant Society / Trust / Section 8 Company Registration & MoA / Rules
   - DOC_02_RESOLUTION: Applicant Organisation Resolution (Format 3) to establish the institution
   - DOC_03_LAND_DEED: Registered Land Sale Deed, Gift Deed, Government Lease, or Private Lease Deed
   - DOC_04_LEASE_AFFIDAVIT: Irrevocable Lease Joint Affidavit (Affidavit 7)
   - DOC_05_LAND_USE: Land Use Certificate (LUC) or Conversion Order for educational use
   - DOC_06_BUILDING_PLAN: Approved Building Plan & Room/Carpet-Area Schedule with Architect CoA
   - DOC_07_OCCUPANCY: Occupancy / Completion Certificate, Building Licence, or Form D
   - DOC_08_STRUCTURAL_STABILITY: Structural Stability Certificate (by certified engineer)
   - DOC_09_FIRE_SAFETY: Fire Safety Certificate from competent Fire Authority
   - DOC_10_BANK_FUNDS: Bank Certificate of Funds (Certificate 3) stating unencumbered balances / FDR
   - DOC_11_AFFIDAVIT_2: Affidavit 2 (General AICTE Undertaking on e-stamp)
   - DOC_14_SITE_MAP: Satellite / Geo-Tagged Site Map with GPS coordinates and boundaries
   - UNRECOGNIZED: Document does not match any of the above or evidence is insufficient.

3. STRICT FIELD EXTRACTION STATES:
   Every field in the schema is an ExtractedField object with:
   - state: ONE of ["PRESENT", "NOT_FOUND", "ILLEGIBLE", "AMBIGUOUS", "NOT_APPLICABLE"]
   - value: Normalized typed value (number, ISO string YYYY-MM-DD, boolean, string).
     * IMPORTANT: If state is NOT "PRESENT", value MUST BE null. NEVER fabricate, default, or guess dates, zeros, or false!
   - rawText: The verbatim string as printed in the document (or null if not found).
   - pageNumber: 1-based page number where the evidence appears (or null).
   - excerpt: Short snippet of surrounding text showing provenance (or null).
   - uncertaintyReason: Mandatory explanation if state is "ILLEGIBLE" or "AMBIGUOUS" (or null).

4. TYPED DOCUMENT BLOCKS:
   - Your response contains a "documents" array. Each item has a "documentId" matching the input boundary.
   - Populated block: You MUST populate ONLY the block corresponding to the "classifiedType":
     * DOC_01_REGISTRATION -> populate doc01Registration
     * DOC_02_RESOLUTION -> populate doc02Resolution
     * DOC_03_LAND_DEED -> populate doc03LandDeed
     * DOC_04_LEASE_AFFIDAVIT -> populate doc04LeaseAffidavit
     * DOC_05_LAND_USE -> populate doc05LandUse
     * DOC_06_BUILDING_PLAN -> populate doc06BuildingPlan
     * DOC_07_OCCUPANCY -> populate doc07Occupancy
     * DOC_08_STRUCTURAL_STABILITY -> populate doc08StructuralStability
     * DOC_09_FIRE_SAFETY -> populate doc09FireSafety
     * DOC_10_BANK_FUNDS -> populate doc10BankFunds
     * DOC_11_AFFIDAVIT_2 -> populate doc11Affidavit2
     * DOC_14_SITE_MAP -> populate doc14SiteMap
     * UNRECOGNIZED -> do not populate any doc block.
   - Leave all non-matching doc blocks undefined or omitted.

5. OUTPUT FORMAT:
   Return a valid JSON object matching the requested schema:
   {
     "documents": [
       {
         "documentId": "string",
         "classifiedType": "DOC_...",
         "classificationConfidence": "HIGH" | "MEDIUM" | "LOW",
         "classificationReasoning": "string",
         "pageCount": number | null,
         "extractionStatus": "SUCCESS" | "PARTIAL" | "FAILED",
         "generalRemarks": "string or null",
         ... matching doc block ...
       }
     ]
   }`;
};
export class VLMService {
    ai = null;
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey.trim().length > 0) {
            this.ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        }
    }
    getClient() {
        if (!this.ai) {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey || apiKey.trim().length === 0) {
                throw new Error("GEMINI_API_KEY environment variable is not configured. Please set GEMINI_API_KEY in backend/.env");
            }
            this.ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        }
        return this.ai;
    }
    /**
     * Process an application's uploaded documents in a single multimodal VLM request.
     */
    async processApplicationDocuments(applicationId, documents) {
        if (!documents || documents.length === 0) {
            return { success: true, data: { documents: [] } };
        }
        try {
            const client = this.getClient();
            // Build multimodal contents array
            const contentsParts = [];
            for (const doc of documents) {
                try {
                    const fileBuffer = await fs.readFile(doc.filePath);
                    const base64Data = fileBuffer.toString("base64");
                    contentsParts.push({
                        text: `\n[DOCUMENT_BOUNDARY_START documentId="${doc.id}" originalFileName="${doc.originalName}"]\n`,
                    });
                    contentsParts.push({
                        inlineData: {
                            mimeType: doc.mimeType,
                            data: base64Data,
                        },
                    });
                    contentsParts.push({
                        text: `\n[DOCUMENT_BOUNDARY_END documentId="${doc.id}"]\n`,
                    });
                }
                catch (readErr) {
                    console.error(`Failed to read document file ${doc.filePath}:`, readErr);
                    await prisma.document.update({
                        where: { id: doc.id },
                        data: {
                            extractionStatus: "FAILED",
                            extractedData: {
                                error: `Could not read file from storage: ${readErr.message}`,
                            },
                        },
                    });
                }
            }
            if (contentsParts.length === 0) {
                return { success: false, error: "No readable document files found to process." };
            }
            contentsParts.push({
                text: `\nPlease analyze all delimited documents above. Return the structured JSON output with a "documents" array containing the extraction envelope for each documentId.`,
            });
            const systemInstruction = buildSystemPrompt();
            // Call Gemini API with timeout protection (120 seconds)
            const timeoutMs = 120000;
            const apiCallPromise = client.models.generateContent({
                model: "gemini-2.5-flash",
                contents: contentsParts,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                },
            });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`VLM extraction timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs));
            const response = await Promise.race([apiCallPromise, timeoutPromise]);
            const rawText = response.text || "{}";
            let parsedJson;
            try {
                parsedJson = JSON.parse(rawText);
            }
            catch (jsonErr) {
                throw new Error(`Failed to parse VLM response as JSON: ${jsonErr.message}. Raw: ${rawText.substring(0, 300)}`);
            }
            // Backend Zod Validation
            const validationResult = BatchExtractionResponseSchema.safeParse(parsedJson);
            if (!validationResult.success) {
                console.warn("Zod validation warning on VLM output:", validationResult.error.format());
                // If top-level documents array exists, attempt to extract valid individual envelopes
                const rawDocs = parsedJson?.documents;
                if (!Array.isArray(rawDocs)) {
                    throw new Error(`VLM returned invalid schema format: 'documents' array missing. Error: ${validationResult.error.message}`);
                }
            }
            const extractedBatch = validationResult.success
                ? validationResult.data
                : parsedJson;
            // Map results back to database Document records by documentId
            const resultMap = new Map();
            for (const item of extractedBatch.documents || []) {
                if (item.documentId) {
                    resultMap.set(item.documentId, item);
                }
            }
            for (const doc of documents) {
                const resultEnvelope = resultMap.get(doc.id);
                if (resultEnvelope) {
                    await prisma.document.update({
                        where: { id: doc.id },
                        data: {
                            documentType: resultEnvelope.classifiedType,
                            extractionStatus: resultEnvelope.extractionStatus || "SUCCESS",
                            extractedData: resultEnvelope,
                        },
                    });
                }
                else {
                    // Document was sent but omitted in the VLM response
                    await prisma.document.update({
                        where: { id: doc.id },
                        data: {
                            extractionStatus: "FAILED",
                            extractedData: {
                                error: "Document was submitted to VLM but omitted in the extraction response.",
                            },
                        },
                    });
                }
            }
            // Update Application status
            await prisma.application.update({
                where: { id: applicationId },
                data: {
                    status: "EXTRACTION_COMPLETED",
                },
            });
            return { success: true, data: extractedBatch };
        }
        catch (batchError) {
            console.error("Batch VLM extraction failure:", batchError);
            // Record batch-level error against all submitted documents without marking as successful
            for (const doc of documents) {
                try {
                    await prisma.document.update({
                        where: { id: doc.id },
                        data: {
                            extractionStatus: "FAILED",
                            extractedData: {
                                batchError: batchError.message || "VLM extraction batch failed",
                            },
                        },
                    });
                }
                catch (dbErr) {
                    console.error(`Failed to update document ${doc.id} failure state:`, dbErr);
                }
            }
            await prisma.application.update({
                where: { id: applicationId },
                data: {
                    status: "EXTRACTION_FAILED",
                },
            });
            return { success: false, error: batchError.message };
        }
    }
}
export const vlmService = new VLMService();
//# sourceMappingURL=vlm.service.js.map