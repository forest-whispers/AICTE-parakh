/**
 * Evidence Resolver for Authority Verification Adapters
 *
 * Seamlessly resolves effective document values by overlaying officer-reviewed
 * corrections while preserving original extracted values as provenance for both
 * untouched and reviewed fields.
 */

export interface ResolvedField<T = any> {
  value: T;
  isOfficerReviewed: boolean;
  originalExtractedValue: T;
}

export function extractFieldValue(fieldObj: any): any {
  if (fieldObj === null || fieldObj === undefined) return null;
  if (typeof fieldObj === "object" && "value" in fieldObj) {
    return fieldObj.value;
  }
  return fieldObj;
}

export function normalizeString(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolves the effective value of a document field by checking officer review first,
 * falling back to original extracted data if untouched.
 */
export function resolveEffectiveField<T = any>(
  document: any,
  docData: Record<string, any>,
  ...candidateKeys: string[]
): ResolvedField<T> {
  const rawData = document?.extractedData || {};
  const officerReview = rawData.officerReview || rawData.officerCorrections;
  const reviewFields = officerReview?.fields;

  // Find original extracted value across candidate keys
  let originalExtractedValue: any = null;
  for (const key of candidateKeys) {
    if (docData && docData[key] !== undefined) {
      originalExtractedValue = extractFieldValue(docData[key]);
      break;
    }
  }

  // Check if an officer review/correction exists for any candidate key
  if (reviewFields && typeof reviewFields === "object") {
    for (const key of candidateKeys) {
      const fieldCorrection = reviewFields[key];
      if (fieldCorrection && typeof fieldCorrection === "object") {
        const state = fieldCorrection.state || "PRESENT";
        const reviewedValue = state === "PRESENT" ? fieldCorrection.value : null;

        return {
          value: reviewedValue as T,
          isOfficerReviewed: true,
          originalExtractedValue: originalExtractedValue as T,
        };
      }
    }
  }

  // Untouched field: use original extracted value
  return {
    value: originalExtractedValue as T,
    isOfficerReviewed: false,
    originalExtractedValue: originalExtractedValue as T,
  };
}

