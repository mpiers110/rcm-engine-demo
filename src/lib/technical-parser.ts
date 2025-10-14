import pdfToText from "react-pdftotext";

/**
 * ========================
 * TYPE DEFINITIONS
 * ========================
 */

export interface ServiceApprovalRule {
  serviceCode: string;
  description: string;
  approvalRequired: boolean;
}

export interface DiagnosisApprovalRule {
  diagnosisCode: string;
  diagnosis: string;
  approvalRequired: boolean;
}

export interface ThresholdRule {
  field: string;
  currency: string;
  amount: number;
  condition: string;
}

export interface IdFormatRule {
  description: string;
  pattern?: string;
}

export interface TechnicalRuleSet {
  rawText: string;
  sections: Record<string, string>;
  structured: {
    serviceApprovals: ServiceApprovalRule[];
    diagnosisApprovals: DiagnosisApprovalRule[];
    thresholdRules: ThresholdRule[];
    idFormatRules: IdFormatRule[];
  };
}

/**
 * ========================
 * MAIN PARSER FUNCTION
 * ========================
 */

export const parseTechnicalRulesFromPdf = async (file: File): Promise<TechnicalRuleSet> => {
  try {
    const rawText = await pdfToText(file);
    const cleanText = rawText.replace(/\r?\n|\r/g, "\n").trim();

    // Split into 1), 2), 3), 4) sections
    const sections = splitSections(cleanText);

    const serviceApprovals = parseServiceApprovalRules(sections["1"] || "");
    const diagnosisApprovals = parseDiagnosisApprovalRules(sections["2"] || "");
    const thresholdRules = parseThresholdRules(sections["3"] || "");
    const idFormatRules = parseIdFormatRules(sections["4"] || "");

    return {
      rawText: cleanText,
      sections,
      structured: {
        serviceApprovals,
        diagnosisApprovals,
        thresholdRules,
        idFormatRules,
      },
    };
  } catch (error) {
    console.error("Error parsing technical PDF:", error);
    throw new Error("Failed to parse and extract technical rules from PDF.");
  }
};

/**
 * ========================
 * SECTION SPLITTER
 * ========================
 */

function splitSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const matches = text.split(/(?=\n?1\)|\n?2\)|\n?3\)|\n?4\))/g);

  matches.forEach((chunk) => {
    const headerMatch = chunk.match(/^(\d)\)/);
    if (headerMatch) {
      const key = headerMatch[1];
      sections[key] = chunk.trim();
    }
  });

  return sections;
}

/**
 * ========================
 * PARSERS
 * ========================
 */

function parseServiceApprovalRules(text: string): ServiceApprovalRule[] {
  const lines = text.split("\n").map((l) => l.trim());
  const rules: ServiceApprovalRule[] = [];

  lines.forEach((line) => {
    const match = line.match(/^(SRV\d{4})\s+(.+?)\s+(YES|NO)$/i);
    if (match) {
      const [, serviceCode, description, approval] = match;
      rules.push({
        serviceCode,
        description: description.trim(),
        approvalRequired: approval.toUpperCase() === "YES",
      });
    }
  });

  return rules;
}

function parseDiagnosisApprovalRules(text: string): DiagnosisApprovalRule[] {
  const lines = text.split("\n").map((l) => l.trim());
  const rules: DiagnosisApprovalRule[] = [];

  lines.forEach((line) => {
    const match = line.match(/^([A-Z0-9.]+)\s+(.+?)\s+(YES|NO)$/i);
    if (match) {
      const [, diagnosisCode, diagnosis, approval] = match;
      rules.push({
        diagnosisCode,
        diagnosis: diagnosis.trim(),
        approvalRequired: approval.toUpperCase() === "YES",
      });
    }
  });

  return rules;
}

function parseThresholdRules(text: string): ThresholdRule[] {
  const rules: ThresholdRule[] = [];
  const match = text.match(/paid_amount_aed\s*>\s*AED\s*(\d+)/i);

  if (match) {
    const amount = parseFloat(match[1]);
    rules.push({
      field: "paid_amount_aed",
      currency: "AED",
      amount,
      condition: `> ${amount}`,
    });
  }

  return rules;
}

function parseIdFormatRules(text: string): IdFormatRule[] {
  const rules: IdFormatRule[] = [];

  if (/UPPERCASE/.test(text)) {
    rules.push({
      description: "All IDs must be UPPERCASE alphanumeric (A–Z, 0–9).",
      pattern: "^[A-Z0-9]+$",
    });
  }

  if (/unique_id structure/i.test(text)) {
    rules.push({
      description:
        "unique_id structure: first4(National ID) – middle4(Member ID) – last4(Facility ID). Segments must be hyphen-separated.",
      pattern: "^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$",
    });
  }

  return rules;
}
