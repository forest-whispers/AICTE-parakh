/**
 * Independent Validation Script for Seeded Scenarios (Slice 4)
 *
 * Independently triggers the deterministic scrutiny engine against each of the
 * 8 seeded applications in the database, verifying:
 * 1. Data retrieval and document storage references.
 * 2. Independent execution of complianceService.evaluateApplication(id).
 * 3. Generation and persistence of ScrutinyReport records.
 * 4. Distinct and meaningful outcomes across all 8 scenarios.
 */
import "dotenv/config";
//# sourceMappingURL=verify-seeded-scenarios.d.ts.map