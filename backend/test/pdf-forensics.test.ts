import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  pdfForensicsService,
  parsePdfDate,
  extractPdfString,
  categorizeTool,
} from "../src/services/pdf-forensics.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("PDF Forensics & Structural Inspection Service", () => {
  it("parses PDF date strings with timezone offsets into Date objects", () => {
    const d1 = parsePdfDate("D:20261027075359+00'00'");
    assert.ok(d1);
    assert.equal(d1.getUTCFullYear(), 2026);
    assert.equal(d1.getUTCMonth(), 9); // October is index 9
    assert.equal(d1.getUTCDate(), 27);

    const d2 = parsePdfDate("D:20240115120000Z");
    assert.ok(d2);
    assert.equal(d2.getUTCFullYear(), 2024);

    const d3 = parsePdfDate("invalid-date");
    assert.equal(d3, null);
  });

  it("extracts balanced PDF string literals with escaped parentheses and slashes", () => {
    const raw = "/Producer (Adobe Photoshop 24.1 \\(Macintosh\\)) /Other (val)";
    const startIdx = raw.indexOf("/Producer (") + "/Producer (".length;
    const extracted = extractPdfString(raw, startIdx);
    assert.equal(extracted, "Adobe Photoshop 24.1 (Macintosh)");
  });

  it("categorizes tools based on metadata fingerprints", () => {
    assert.equal(categorizeTool("Adobe Photoshop 24.1", null), "GRAPHIC_EDITOR");
    assert.equal(categorizeTool(null, "Canva PDF Exporter"), "GRAPHIC_EDITOR");
    assert.equal(categorizeTool("ilovepdf.com", null), "ONLINE_UTILITY");
    assert.equal(categorizeTool("Smallpdf Web Converter", null), "ONLINE_UTILITY");
    assert.equal(categorizeTool("Microsoft Word 2021", null), "OFFICE_SUITE");
    assert.equal(categorizeTool("ReportLab PDF Library - (opensource)", null), "STANDARD");
    assert.equal(categorizeTool("Canon iR-ADV Scanner", null), "STANDARD");
    assert.equal(categorizeTool(null, null), "UNKNOWN");
  });

  it("inspects real uploaded PDF file and confirms standard parameters", () => {
    const uploadsDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadsDir)) return;

    const files = fs.readdirSync(uploadsDir).filter((f) => f.endsWith(".pdf"));
    if (files.length === 0) return;

    const buf = fs.readFileSync(path.join(uploadsDir, files[0]));
    const report = pdfForensicsService.inspectBuffer(buf);

    assert.equal(report.confidence, "CONFIRMED");
    assert.ok(report.pdfVersion);
    assert.equal(report.toolCategory, "STANDARD");
    assert.equal(report.revisionCount, 1);
    assert.equal(report.isEncrypted, false);
    assert.equal(report.hasJavaScript, false);
  });

  it("conservatively ignores raw tokens outside dictionaries and trailers", () => {
    // Create a PDF buffer where words like /JavaScript, /Encrypt, or %%EOF appear inside a text comment or stream
    const rawPdf = Buffer.from(
      `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
(This document mentions /JavaScript and /Encrypt and %%EOF in innocent text) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000178 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
348
%%EOF
`,
      "latin1"
    );

    const report = pdfForensicsService.inspectBuffer(rawPdf);

    // Because /Encrypt was NOT in the trailer dictionary and /JavaScript was NOT in an action dictionary,
    // it must NOT falsely flag them!
    assert.equal(report.isEncrypted, false, "Should not flag /Encrypt when merely in text");
    assert.equal(report.hasJavaScript, false, "Should not flag /JavaScript when merely in stream text");
    assert.equal(report.revisionCount, 1, "Should count exactly 1 structured startxref %%EOF revision");
  });

  it("detects genuine active /Action /JavaScript dictionary", () => {
    const rawPdf = Buffer.from(
      `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R /OpenAction 3 0 R >>
endobj
3 0 obj
<< /Type /Action /S /JavaScript /JS (app.alert("malicious");) >>
endobj
trailer
<< /Size 4 /Root 1 0 R >>
startxref
150
%%EOF
`,
      "latin1"
    );

    const report = pdfForensicsService.inspectBuffer(rawPdf);
    assert.equal(report.hasJavaScript, true, "Must detect genuine /Action /JavaScript dictionary");
  });

  it("detects genuine /Encrypt dictionary in trailer", () => {
    const rawPdf = Buffer.from(
      `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
trailer
<< /Size 2 /Root 1 0 R /Encrypt 3 0 R >>
startxref
100
%%EOF
`,
      "latin1"
    );

    const report = pdfForensicsService.inspectBuffer(rawPdf);
    assert.equal(report.isEncrypted, true, "Must detect genuine /Encrypt in trailer");
  });

  it("detects multiple incremental revisions with structured startxref blocks", () => {
    const multiRevisionPdf = Buffer.from(
      `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
trailer
<< /Size 2 /Root 1 0 R >>
startxref
100
%%EOF
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Title (Modified) >>
endobj
trailer
<< /Size 2 /Root 1 0 R >>
startxref
200
%%EOF
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Title (Modified Again) >>
endobj
trailer
<< /Size 2 /Root 1 0 R >>
startxref
300
%%EOF
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Title (Modified Third Time) >>
endobj
trailer
<< /Size 2 /Root 1 0 R >>
startxref
400
%%EOF
`,
      "latin1"
    );

    const report = pdfForensicsService.inspectBuffer(multiRevisionPdf);
    assert.equal(report.revisionCount, 4, "Must detect 4 incremental revisions");
  });
});
