import pdfToText from "react-pdftotext";

/**
 * ========================
 * TYPE DEFINITIONS
 * ========================
 */

export interface EncounterRule {
  encounterType: "INPATIENT" | "OUTPATIENT" | string;
  services: string[];
}

export interface FacilityRule {
  [facilityType: string]: string[];
}

export interface DiagnosisRule {
  code: string;
  diagnosis: string;
  requiredService: string;
}

export interface ExclusionRule {
  codeA: string;
  codeB: string;
  rule: string;
}

export interface RuleSet {
  rawText: string;
  sections: Record<string, string>;
  structured: {
    encounterRules: EncounterRule[];
    facilityRules: FacilityRule;
    diagnosisRules: DiagnosisRule[];
    exclusionRules: ExclusionRule[];
  };
}

/**
 * ========================
 * MAIN PARSER FUNCTION
 * ========================
 */

/**
 * Parses a PDF file into a structured set of validation rules.
 * Designed for downstream use in claim validation and adjudication engines.
 */
export const parseMedicalRulesFromPdf = async (file: File): Promise<RuleSet> => {
  try {
    const rawText = await pdfToText(file);
    const cleanText = rawText.replace(/\r?\n|\r/g, "\n").trim();

    const sections = splitSections(cleanText);

    const encounterRules = parseEncounterRules(sections.A || "");
    const facilityRules = parseFacilityRules(sections.B || "");
    const diagnosisRules = parseDiagnosisRules(sections.C || "");
    const exclusionRules = parseExclusionRules(sections.D || "");

    return {
      rawText: cleanText,
      sections,
      structured: {
        encounterRules,
        facilityRules,
        diagnosisRules,
        exclusionRules,
      },
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse and extract rules from PDF.");
  }
};

/**
 * ========================
 * HELPER FUNCTIONS
 * ========================
 */

function splitSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const matches = text.split(/(?=A\.|B\.|C\.|D\.)/g);

  matches.forEach((chunk) => {
    const header = chunk.substring(0, 2).trim().replace(/\./, "");
    if (header) sections[header] = chunk.trim();
  });

  return sections;
}

function parseEncounterRules(text: string): EncounterRule[] {
  const rules: EncounterRule[] = [];

  const inpatient = text.match(/Inpatient-only services:\s*([\s\S]*?)Outpatient-only/)?.[1];
  const outpatient = text.match(/Outpatient-only services:\s*([\s\S]*)/)?.[1];

  if (inpatient) {
    rules.push({ encounterType: "INPATIENT", services: extractServices(inpatient) });
  }

  if (outpatient) {
    rules.push({ encounterType: "OUTPATIENT", services: extractServices(outpatient) });
  }

  return rules;
}

function parseFacilityRules(text: string): FacilityRule {
  const lines = text.split("\n").map((l) => l.trim());
  const facilityRules: FacilityRule = {};

  lines.forEach((line) => {
    const match = line.match(/^•\s*([A-Z_]+):\s*(.+)$/);
    if (match) {
      const [, facility, srvList] = match;
      facilityRules[facility] = extractServiceCodes(srvList);
    }
  });

  return facilityRules;
}

function parseDiagnosisRules(text: string): DiagnosisRule[] {
  const lines = text.split("\n").map((l) => l.trim());
  const diagnosisRules: DiagnosisRule[] = [];

  lines.forEach((line) => {
    const match = line.match(/^•\s*([A-Z0-9.]+)\s+([A-Za-z\s]+):\s*(SRV\d+)/);
    if (match) {
      const [_, code, diagnosis, service] = match;
      diagnosisRules.push({ code, diagnosis: diagnosis.trim(), requiredService: service });
    }
  });

  return diagnosisRules;
}

function parseExclusionRules(text: string): ExclusionRule[] {
  const lines = text.split("\n").map((l) => l.trim());
  const exclusions: ExclusionRule[] = [];

  lines.forEach((line) => {
    const match = line.match(/^•\s*([A-Z0-9.]+).*? with ([A-Z0-9.]+)/);
    if (match) {
      const [_, codeA, codeB] = match;
      exclusions.push({
        codeA,
        codeB,
        rule: line.replace(/^•\s*/, ''),
      });
    }
  });

  return exclusions;
}

/**
 * ========================
 * TEXT UTILITIES
 * ========================
 */

function extractServices(text: string): string[] {
  return (text.match(/SRV\d{4}/g) || []).map((s) => s.trim());
}

function extractServiceCodes(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
