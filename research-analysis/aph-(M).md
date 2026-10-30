# AICTE Approval Process Handbook (APH): Project Requirements Context

## 1. Purpose of this file

This file describes the regulatory and document-processing concepts relevant to the AICTE Application Processing and Validation Platform prototype. It provides context for the responsibilities of the multimodal vision-language model (VLM), deterministic backend validation, evidence handling, and human review.

The source material is the AICTE Approval Process Handbook (APH) 2024–2027 and the accompanying preliminary Gemini analysis. The Gemini analysis is a useful discovery aid, **not an authoritative or fully verified rulebook**. Specific thresholds, legal interpretations, application-category conditions, external integrations, and consequences must not be treated as confirmed solely because they appear in that analysis. Where a rule is implemented, its exact APH clause/annexure, applicability, effective period, and interpretation need to be confirmed.

This is project context, not an exhaustive transcription of the APH. The prototype deliberately covers a small number of application paths rather than every category in the handbook.

## 2. Prototype scope: a small set of application paths

The APH distinguishes applications for new institutions from applications by existing approved institutions, and describes multiple changes that existing institutions may seek. The prototype can represent these with three broad paths:

1. **New institution** — the institution is seeking initial approval. Evidence may concern the applicant/promoter, land and buildings, permissions/certificates, financial readiness, and planned infrastructure.
2. **Extension of Approval (EoA)** — an already approved institution is seeking continuation of approval. Evidence may include current institutional details, relevant declarations, occupancy/building and fire-safety documents, and the institution's existing approval/record history.
3. **Change or expansion for an existing institution** — a limited prototype path for a change such as adding a programme or increasing intake. Applicable evidence and infrastructure/faculty checks depend on the selected change.

These are intentionally broad prototype paths, not a claim that all real AICTE application types can be collapsed into these categories without distinction. A selected path and its parameters determine which requirements apply. For example, adding a programme may require checks different from a simple EoA renewal. Requirements are conditional, not one universal checklist.

## 3. Core processing model

The system has several distinct kinds of work. They should not be treated as one undifferentiated LLM task.

### 3.1 Document understanding — VLM-assisted

The VLM's role is to understand each submitted document and produce structured, source-grounded observations. Depending on the document, these may include:

- likely document type and subtype (for example, fire-safety certificate, occupancy/completion certificate, land deed, approved building plan, affidavit, bank certificate, or faculty roster);
- visible issuing authority, institution/promoter name, address, registration/reference number, issue date, expiry/validity text, survey/plot identifiers, areas and units, or other relevant fields;
- tables and repeated records, such as room schedules or faculty lists;
- statements, conditions, endorsements, exceptions, or qualifications that affect how a document should be interpreted;
- signs that expected information is absent, illegible, ambiguous, or not confidently extractable;
- evidence locations for each extracted value, preferably page number and a short supporting text excerpt; bounding boxes or image regions may be included when the model/interface can provide them reliably.

The VLM reports what is present in the submitted evidence. It does not decide whether the evidence is legally sufficient, authentic, current, or compliant merely by extracting it. It must not invent a missing value to complete a schema. Unknown or unreadable values remain unknown and are distinguished from values that are visibly absent.

Document identity should be stable in the application data model. A VLM response may refer to a document's application-level ID or a temporary label such as `document_1`; the backend is responsible for mapping that reference to the actual uploaded file and preserving traceability.

### 3.2 Deterministic validation — backend-owned

Rules that can be expressed as explicit conditions or calculations belong in backend logic, not in free-form model judgement. Examples include:

- whether a required document has been submitted for the selected application path;
- whether a required field was extracted, is empty, or is unreadable;
- date comparisons, such as whether a certificate is valid for the relevant processing period, provided the applicable validity rule and reference date are configured;
- comparing normalized names, addresses, survey numbers, reference numbers, programme names, or other identifiers across application records and supporting documents;
- checking numeric constraints, units, totals, counts, ratios, and thresholds where the correct APH rule and its applicability have been confirmed;
- checking whether a set of extracted values satisfies a configured requirement;
- determining whether an item is missing, contradictory, expired, outside a configured range, or awaiting evidence.

The backend owns rule applicability, comparisons, calculations, result statuses, and audit records. The VLM can extract or explain inputs, but should not be the final authority for arithmetic, date validity, requiredness, or a compliance pass/fail result.

### 3.3 Checks that are not just checklist validation

The project is more than a presence/absence checklist and cross-document field comparison. The problem statement also calls for preliminary anomaly detection, evidence review, and verification support. These should be represented as separate findings with appropriately limited claims.

- **Document integrity and anomaly indicators:** potential duplicate files or near-duplicate documents, inconsistent repeated identifiers, suspicious visual/layout differences, possible edits or overlays, irregular date sequences, and unusual metadata where metadata is available. These are indicators for review, not proof of forgery.
- **Within-document consistency:** for example, a certificate's institution name differing between its heading and body, totals not matching line items, inconsistent dates, or a condition/qualification that changes the meaning of a statement.
- **Cross-document consistency:** for example, the campus address or survey numbers in a land document not agreeing with those in an approved plan, or a stated building area differing across a plan and occupancy document.
- **Evidence sufficiency and ambiguity:** a document may exist but fail to show the relevant page, covered building block, signature, validity period, room schedule, or other detail needed to assess a rule. This is not necessarily the same as a failed regulatory check.
- **Infrastructure evidence assistance:** extracting room schedules and area figures from plans/certificates, calculating configured totals and counts, and flagging relevant visible features in photos/videos/plans when technically feasible. Visual review cannot by itself establish that a facility is compliant, correctly measured, operational, or physically present at the stated location. Some questions require additional evidence or an inspection.
- **Authorized source verification:** where an approved integration or official verification mechanism is available, compare returned information to the submitted evidence and record the source and time. This is a separate verification result, not something the VLM can claim based on visual appearance alone. In the prototype, unavailable integrations can be represented as pending, unavailable, or requiring manual verification rather than simulated as successful.

## 4. Example document understanding output

The following is an illustrative shape, not a fixed final schema. It shows that extracted values should be paired with evidence and uncertainty. A document can contain additional fields or repeated records depending on its type.

```json
{
  "document_id": "doc_8f2a",
  "document_type": {
    "value": "Fire Safety Certificate",
    "confidence": 0.94,
    "evidence": {
      "page": 1,
      "text": "Fire Safety Certificate"
    }
  },
  "fields": {
    "institution_name": {
      "value": "Example Institute of Technology",
      "confidence": 0.97,
      "evidence": {
        "page": 1,
        "text": "Issued in favour of Example Institute of Technology"
      }
    },
    "certificate_reference": {
      "value": "FSC/2026/0142",
      "confidence": 0.91,
      "evidence": {
        "page": 1,
        "text": "Certificate No. FSC/2026/0142"
      }
    },
    "issue_date": {
      "value": "2026-04-12",
      "confidence": 0.88,
      "evidence": {
        "page": 1,
        "text": "Date: 12/04/2026"
      }
    },
    "expiry_date": {
      "value": null,
      "confidence": 0.0,
      "evidence": null,
      "extraction_status": "not_found"
    },
    "covered_buildings": {
      "value": ["Main Academic Block"],
      "confidence": 0.84,
      "evidence": {
        "page": 1,
        "text": "Applicable to Main Academic Block"
      }
    }
  },
  "document_observations": [
    {
      "type": "qualification_or_condition",
      "description": "The certificate text refers to the Main Academic Block only.",
      "evidence": {
        "page": 1,
        "text": "Applicable to Main Academic Block"
      }
    }
  ]
}
```

Important distinctions:
- `not_found` means the field was not located in the reviewed evidence; it does not mean a guessed value should be supplied.
- An extracted date is a document observation. Whether it is valid for the current application is a backend rule result.
- Confidence helps route uncertain extraction for review; it is not proof of authenticity or compliance.
- Evidence references should point to the actual uploaded file and page. Short text excerpts are useful; image coordinates are optional when reliable.

## 5. Example of deterministic rules and resulting findings

The following is an illustrative example of how extracted data, application context, and configured rules work together. The threshold and rule applicability are placeholders until confirmed against the relevant APH clause and current application context.

### Inputs
- Application path: EoA
- Processing period end date: configured by the application workflow
- Submitted documents: fire-safety certificate, occupancy certificate, land/lease record
- Extracted facts: certificate expiry date is absent; campus address differs slightly between the application and the occupancy certificate; the land record and building plan share some but not all survey identifiers.

### Rule evaluation
1. The document inventory says a fire-safety certificate is required for this application path.
2. The submitted certificate is present, but its expiry date was not extracted.
3. The validity rule cannot conclude that the certificate is valid or expired without a usable expiry date and the configured reference date.
4. The address comparison detects a difference. Normalization may remove harmless differences such as punctuation, but it should not silently erase meaningful differences.
5. The survey-identifier comparison reports the values from each source and the exact unmatched identifiers for scrutiny. It does not label the institution fraudulent.

### Example findings
```json
[
  {
    "finding_id": "finding_001",
    "kind": "evidence_incomplete",
    "rule_id": "FIRE_CERTIFICATE_EXPIRY_REQUIRED",
    "status": "needs_review",
    "summary": "The certificate is present, but an expiry date could not be identified.",
    "evidence": [
      {"document_id": "doc_8f2a", "page": 1}
    ],
    "next_step": "Review the document or request a clearer/complete copy."
  },
  {
    "finding_id": "finding_002",
    "kind": "cross_document_mismatch",
    "rule_id": "CAMPUS_ADDRESS_CONSISTENCY",
    "status": "mismatch_detected",
    "summary": "The normalized campus addresses in the application and occupancy certificate differ.",
    "evidence": [
      {"document_id": "application_record", "field": "campus_address"},
      {"document_id": "occupancy_doc_id", "page": 1, "field": "premises_address"}
    ],
    "next_step": "Official scrutiny of the address discrepancy."
  }
]
```

The example demonstrates the separation between **extracted observations**, **rule evaluations**, and **human-facing findings**. The UI can summarize findings, but each one remains linked to its source evidence and the rule that generated it.

## 6. Findings and statuses

A single application-level pass/fail flag is too coarse. Different checks can have different outcomes. Useful conceptual statuses include:

- `pass` — the configured check was evaluated and satisfied;
- `missing` — required evidence or information was not submitted;
- `incomplete` — a submitted item lacks required information or pages;
- `unreadable` / `ambiguous` — the relevant information could not be reliably extracted;
- `mismatch_detected` — compared values differ;
- `expired` — a configured date-validity rule determines that a document is out of date;
- `anomaly_flagged` — a suspicious pattern needs investigation;
- `verification_pending` — an authorized source check has not completed;
- `source_unavailable` — the external verification source could not be reached or is not integrated;
- `manual_review_required` — evidence or interpretation requires an authorized person's judgement;
- `not_applicable` — the configured applicability conditions do not apply;
- `not_evaluated` — a prerequisite is missing, so the rule cannot yet be evaluated.

These are conceptual examples; the implementation can choose a consistent enum. A missing/unreadable input should not automatically be treated as a confirmed regulatory violation. A system-wide summary can be derived from individual findings without discarding their distinct meanings.

## 7. Infrastructure compliance as a layered assessment

APH-related infrastructure evidence can include approved building plans, architect certificates, room schedules, occupancy/completion documents, structural-stability evidence where applicable, fire-safety certificates, and photographs/videos of facilities.

The prototype can support a layered approach:

1. **Extract:** identify room types, areas, floors, building blocks, certificate scope, dates, and other legible facts.
2. **Calculate:** use backend rules to add room areas, count rooms, compare totals, or test configured programme/intake-dependent thresholds.
3. **Reconcile:** compare schedules and figures with the other submitted documents.
4. **Flag visual observations:** where image/video analysis is supported, identify visible items or apparent discrepancies for a reviewer.
5. **Escalate:** label matters requiring a clearer plan, further evidence, specialist assessment, or physical inspection.

Any exact numeric norm must be tied to its source clause, programme/level, intake assumptions, exceptions, and applicable version. A generic threshold must not be applied to every institution. Image/video analysis is an aid to scrutiny, not a replacement for an authorized inspection or professional certification.

## 8. Source traceability and rule configuration

A regulatory requirement needs more context than a field name and a boolean `required` value. A usable rule definition conceptually includes:

- stable rule identifier and human-readable title;
- source handbook, chapter/clause/annexure/page, and review notes;
- application path and explicit applicability conditions;
- required evidence and/or required extracted facts;
- rule logic or comparison/calculation to evaluate;
- validity period or effective academic year, when relevant;
- exceptions, alternate acceptable evidence, and conditional cases;
- outcome/status semantics and explanation shown to the reviewer;
- evidence links and relevant extracted values;
- whether the result is fully deterministic, AI-assisted, external-source-dependent, or requires human judgement;
- configuration version, activation date, and audit history.

This supports versioned, configurable requirements without hard-coding every APH rule into application code. Rules must be reviewed before being treated as active regulatory requirements. The platform should preserve which rule version was applied to each application.

## 9. Auditability, security, and decision boundary

- Every finding is traceable to the submitted file, page/region where possible, extracted fact, and rule or analysis that produced it.
- Original uploads remain preserved separately from derived text, extracted JSON, previews, and analysis outputs.
- The system records which checks ran, which rule version was used, timestamps, external-source results where applicable, and reviewer actions.
- External verification occurs only through authorized integrations or official methods. A source that is unavailable or not integrated is recorded as such; it is not represented as verified.
- Potential alteration, duplication, inconsistency, or infrastructure concerns are preliminary indicators and not conclusive findings of fraud or misconduct.
- The platform is decision support. AICTE officials retain regulatory scrutiny, inspection decisions, and final approval-related decisions.
- The prototype uses authorized, anonymized, or synthetic data and follows role-based access and confidentiality safeguards.

## 10. Important limits of the preliminary Gemini analysis

The accompanying Gemini output contains useful examples of document fields, cross-document comparisons, infrastructure calculations, and possible verification workflows. It also contains many specific thresholds, legal conclusions, external-system assumptions, and automatic consequences. Those details are not automatically implementation requirements.

In particular:
- the presence of a named authority or portal in an analysis does not establish that a usable API exists or that the project is authorized to access it;
- a plausible field schema does not prove that every field is required in every application path;
- a suggested formula or numeric threshold is not active until its source and applicability are confirmed;
- an anomaly signal does not establish document forgery;
- a finding should not automatically reject an application or impose a regulatory penalty;
- external verification, computer-vision inspection, cryptographic signature validation, and complex legal interpretation may be out of scope for a prototype unless explicitly implemented and supported.

The APH's specific provisions remain the source for regulatory requirements. The project problem statement remains the source for the prototype's functional and safeguard expectations. Where either source leaves a matter unclear, the requirement remains unresolved rather than being silently guessed.