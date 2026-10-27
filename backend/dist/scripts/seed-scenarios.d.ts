/**
 * Database Seeding Script for Synthetic Scenarios (Slice 4)
 *
 * Populates the development database with 8 distinct synthetic applications,
 * their associated document records, valid storage file references, and mocked
 * VLM extraction outputs.
 *
 * Rules & Guarantees:
 * - Idempotent: Can be run repeatedly without duplicating records.
 * - Safe: Only modifies applications with predictable prefix "AICTE-DEMO-".
 * - Deterministic: Stops immediately after persisting mocked extraction data.
 *   Does NOT call LLMs, run extraction, or create scrutiny reports.
 */
import "dotenv/config";
//# sourceMappingURL=seed-scenarios.d.ts.map