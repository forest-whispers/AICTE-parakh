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
  revisionCount: number | null; // null if inconclusive / not ascertainable
  isEncrypted: boolean | null; // true if confirmed in trailer, false if verified trailer without /Encrypt, null if inconclusive
  hasJavaScript: boolean | null; // true if confirmed in object dictionary, false if verified without JS, null if inconclusive
  toolCategory: "STANDARD" | "GRAPHIC_EDITOR" | "ONLINE_UTILITY" | "OFFICE_SUITE" | "UNKNOWN";
  confidence: "CONFIRMED" | "INCONCLUSIVE";
  details: string[];
}

/**
 * Extracts a balanced PDF string literal starting right after an opening parenthesis.
 * Handles escaped parentheses \(, \), and backslashes \\.
 */
export function extractPdfString(str: string, startPos: number): string {
  let res = "";
  let i = startPos;
  let depth = 1;

  while (i < str.length && depth > 0) {
    const ch = str[i];
    if (ch === "\\" && i + 1 < str.length) {
      const next = str[i + 1];
      if (next === "(" || next === ")") {
        res += next;
        i += 2;
        continue;
      } else if (next === "\\") {
        res += "\\";
        i += 2;
        continue;
      } else if (next === "n") {
        res += "\n";
        i += 2;
        continue;
      } else if (next === "r") {
        res += "\r";
        i += 2;
        continue;
      } else if (next === "t") {
        res += "\t";
        i += 2;
        continue;
      }
      res += next;
      i += 2;
      continue;
    }

    if (ch === "(") {
      depth++;
      res += ch;
    } else if (ch === ")") {
      depth--;
      if (depth === 0) break;
      res += ch;
    } else {
      res += ch;
    }
    i++;
  }

  return res.trim();
}

/**
 * Parses PDF date format: D:YYYYMMDDHHmmSS[OHH'mm'] into a Date object.
 */
export function parsePdfDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const cleaned = dateStr.replace(/^D:/, "").replace(/'/g, "").trim();
  const m = cleaned.match(/^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([+\-Z])?(\d{2})?(\d{2})?/);
  if (!m) return null;

  const year = m[1];
  const month = m[2] || "01";
  const day = m[3] || "01";
  const hour = m[4] || "00";
  const min = m[5] || "00";
  const sec = m[6] || "00";

  let tz = "Z";
  if (m[7] && m[7] !== "Z" && m[8]) {
    tz = `${m[7]}${m[8]}:${m[9] || "00"}`;
  }

  const iso = `${year}-${month}-${day}T${hour}:${min}:${sec}${tz}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Classifies the authoring tool category based on confirmed producer and creator metadata.
 */
export function categorizeTool(
  producer: string | null,
  creator: string | null
): "STANDARD" | "GRAPHIC_EDITOR" | "ONLINE_UTILITY" | "OFFICE_SUITE" | "UNKNOWN" {
  const combined = `${producer || ""} ${creator || ""}`.toLowerCase();
  if (!combined.trim()) return "UNKNOWN";

  // Graphic / raster editing software
  if (
    combined.includes("photoshop") ||
    combined.includes("canva") ||
    combined.includes("gimp") ||
    combined.includes("coreldraw") ||
    combined.includes("illustrator") ||
    combined.includes("inkscape")
  ) {
    return "GRAPHIC_EDITOR";
  }

  // Web-based freemium PDF modifier tools
  if (
    combined.includes("ilovepdf") ||
    combined.includes("smallpdf") ||
    combined.includes("sejda") ||
    combined.includes("pdfescape") ||
    combined.includes("pdf2go") ||
    combined.includes("sodapdf")
  ) {
    return "ONLINE_UTILITY";
  }

  // Desktop office authoring software
  if (
    combined.includes("word") ||
    combined.includes("libreoffice") ||
    combined.includes("openoffice") ||
    combined.includes("pages") ||
    combined.includes("google docs") ||
    combined.includes("writer")
  ) {
    return "OFFICE_SUITE";
  }

  // Standard enterprise scanners, print drivers, and certified generators
  if (
    combined.includes("acrobat") ||
    combined.includes("distiller") ||
    combined.includes("reportlab") ||
    combined.includes("ghostscript") ||
    combined.includes("quartz") ||
    combined.includes("skia") ||
    combined.includes("canon") ||
    combined.includes("hp") ||
    combined.includes("xerox") ||
    combined.includes("ricoh") ||
    combined.includes("kyocera") ||
    combined.includes("sharp") ||
    combined.includes("brother") ||
    combined.includes("epson") ||
    combined.includes("wkhtmltopdf") ||
    combined.includes("pdfkit") ||
    combined.includes("itext")
  ) {
    return "STANDARD";
  }

  return "UNKNOWN";
}

export class PdfForensicsService {
  /**
   * Evaluates raw PDF buffer to extract structural and metadata indicators conservatively.
   */
  inspectBuffer(buffer: Buffer): PdfForensicsReport {
    const details: string[] = [];

    // Use latin1 so byte offsets correspond 1:1 with string indices
    const content = buffer.toString("latin1");

    // 1. Check PDF header
    const headerMatch = content.match(/^%PDF-(\d+\.\d+)/);
    const pdfVersion = headerMatch ? headerMatch[1] : null;

    if (!pdfVersion) {
      details.push("File does not start with standard %PDF- header.");
      return {
        pdfVersion: null,
        producer: null,
        creator: null,
        creationDate: null,
        modDate: null,
        rawCreationDateStr: null,
        rawModDateStr: null,
        revisionCount: null,
        isEncrypted: null,
        hasJavaScript: null,
        toolCategory: "UNKNOWN",
        confidence: "INCONCLUSIVE",
        details,
      };
    }

    // 2. Extract /Producer, /Creator, /CreationDate, /ModDate from /Info dictionary or XMP
    let producer: string | null = null;
    let creator: string | null = null;
    let rawCreationDateStr: string | null = null;
    let rawModDateStr: string | null = null;

    // A. Info dictionary search
    const extractInfoField = (fieldName: string): string | null => {
      // Look for /FieldName (Value)
      const fieldRegex = new RegExp(`\\/${fieldName}\\s*\\(`, "g");
      let match: RegExpExecArray | null;
      let lastVal: string | null = null;

      while ((match = fieldRegex.exec(content)) !== null) {
        const val = extractPdfString(content, match.index + match[0].length);
        if (val) lastVal = val;
      }
      return lastVal;
    };

    producer = extractInfoField("Producer");
    creator = extractInfoField("Creator");
    rawCreationDateStr = extractInfoField("CreationDate");
    rawModDateStr = extractInfoField("ModDate");

    // B. XMP Packet fallback (if info dict omitted or stripped)
    if (!producer) {
      const xmpProd = content.match(/<pdf:Producer>([^<]+)<\/pdf:Producer>/i);
      if (xmpProd && xmpProd[1]) producer = xmpProd[1].trim();
    }
    if (!creator) {
      const xmpCreator = content.match(/<xmp:CreatorTool>([^<]+)<\/xmp:CreatorTool>/i);
      if (xmpCreator && xmpCreator[1]) creator = xmpCreator[1].trim();
    }
    if (!rawCreationDateStr) {
      const xmpCDate = content.match(/<xmp:CreateDate>([^<]+)<\/xmp:CreateDate>/i);
      if (xmpCDate && xmpCDate[1]) rawCreationDateStr = xmpCDate[1].trim();
    }
    if (!rawModDateStr) {
      const xmpMDate = content.match(/<xmp:ModifyDate>([^<]+)<\/xmp:ModifyDate>/i);
      if (xmpMDate && xmpMDate[1]) rawModDateStr = xmpMDate[1].trim();
    }

    const creationDate = parsePdfDate(rawCreationDateStr) || (rawCreationDateStr ? new Date(rawCreationDateStr) : null);
    const modDate = parsePdfDate(rawModDateStr) || (rawModDateStr ? new Date(rawModDateStr) : null);

    const validCreationDate = creationDate && !isNaN(creationDate.getTime()) ? creationDate : null;
    const validModDate = modDate && !isNaN(modDate.getTime()) ? modDate : null;

    // 3. Conservative Revision Count
    // In valid PDF incremental updates, each revision ends with:
    // startxref\r?\n\d+\r?\n%%EOF
    const structuredEofRegex = /(?:^|[\r\n])startxref\s+\d+\s+%%EOF/g;
    const structuredMatches = [...content.matchAll(structuredEofRegex)];

    let revisionCount: number | null = null;
    if (structuredMatches.length > 0) {
      revisionCount = structuredMatches.length;
    } else {
      // Fallback: check trailing %%EOF
      const rawEofCount = (content.match(/%%EOF/g) || []).length;
      if (rawEofCount === 1) {
        revisionCount = 1;
      } else if (rawEofCount === 0) {
        revisionCount = null; // truncated or streamed
        details.push("No standard %%EOF trailer found in document payload.");
      } else {
        // Raw occurrences without structured startxref might be inside compressed streams; mark as inconclusive
        revisionCount = null;
        details.push(`Raw %%EOF tokens found (${rawEofCount}) but structured startxref trailers are absent or compressed.`);
      }
    }

    // 4. Conservative Encryption Check
    // /Encrypt must appear in a trailer dictionary: trailer << ... /Encrypt ... >>
    let isEncrypted: boolean | null = null;
    const trailerMatch = content.match(/trailer\s*<<([\s\S]*?)>>/);
    if (trailerMatch && trailerMatch[1]) {
      const trailerBody = trailerMatch[1];
      isEncrypted = /\/Encrypt\b/.test(trailerBody);
    } else {
      // In PDF 1.5+ Cross-Reference Streams, trailer is merged into an object stream
      const xrefObjMatch = content.match(/\d+\s+\d+\s+obj\s*<<[^>]*\/Type\s*\/XRef[\s\S]*?>>/);
      if (xrefObjMatch) {
        isEncrypted = /\/Encrypt\b/.test(xrefObjMatch[0]);
      } else {
        isEncrypted = null; // Inconclusive
      }
    }

    // 5. Conservative JavaScript Check
    // Must be an explicit PDF Action dictionary or Names dictionary:
    // << ... /Type /Action ... /S /JavaScript ... >> or << ... /Names << ... /JavaScript ... >>
    let hasJavaScript: boolean | null = null;
    const jsActionRegex = /<<[^>]*\/Type\s*\/Action[\s\S]*?\/S\s*\/JavaScript[^>]*>>/;
    const jsNamesRegex = /<<[^>]*\/Names\s*<<[^>]*\/JavaScript[\s\S]*?>>/;
    const jsKeyRegex = /<<[^>]*\/JS\s*\(/;

    if (jsActionRegex.test(content) || jsNamesRegex.test(content) || jsKeyRegex.test(content)) {
      hasJavaScript = true;
    } else {
      // If object dictionaries exist and none contain JS actions, confirmed false
      const hasObjects = /\d+\s+\d+\s+obj\s*<</.test(content);
      hasJavaScript = hasObjects ? false : null;
    }

    const toolCategory = categorizeTool(producer, creator);

    return {
      pdfVersion,
      producer,
      creator,
      creationDate: validCreationDate,
      modDate: validModDate,
      rawCreationDateStr,
      rawModDateStr,
      revisionCount,
      isEncrypted,
      hasJavaScript,
      toolCategory,
      confidence: "CONFIRMED",
      details,
    };
  }
}

export const pdfForensicsService = new PdfForensicsService();
