import * as XLSX from "xlsx";
import type { ClaimRecord, ClaimsParseResult } from './types';


/**
 * ========================
 * MAIN FUNCTION
 * ========================
 */

/**
 * Reads an Excel file and extracts normalized claim data.
 * @param file - The Excel (.xlsx) file uploaded by the user
 * @returns A structured array of claim objects ready for rule validation
 */
export const parseClaimsExcel = async (file: File): Promise<ClaimsParseResult> => {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheet = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheet];

    // Convert sheet to JSON rows
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    if (!jsonData.length) throw new Error("No data found in Excel file.");

    const headers = Object.keys(jsonData[0]);

    // Normalize and clean claims
    const claims: ClaimRecord[] = jsonData.map((row) => ({
      claim_id: sanitizeString(row.claim_id || row.Claim_ID || row["Claim ID"]),
      encounter_type: sanitizeString(row.encounter_type || row.Encounter_Type || row["Encounter Type"]),
      service_code: sanitizeString(row.service_code || row.Service_Code || row["Service Code"]),
      service_date: normalizeDate(row.service_date || row.Service_Date || row["Service Date"]),
      diagnosis_codes: sanitizeString(row.diagnosis_codes || row.diagnosis_code || row.Diagnosis_Codes || row.Diagnosis_Code || row["Diagnosis Codes"] || row["Diagnosis Code"]),
      facility_id: sanitizeString(row.facility_id || row.Facility_ID || row["Facility ID"]),
      paid_amount_aed: parseFloat(row.paid_amount_aed || row.Paid_Amount_AED || row["Paid Amount (AED)"] || 0),
      member_id: sanitizeString(row.member_id || row.Member_ID || row["Member ID"]),
      national_id: sanitizeString(row.national_id || row.National_ID || row["National ID"]),
      unique_id: sanitizeString(row.unique_id || row.Unique_ID || row["Unique ID"]),
      approval_number: sanitizeString(row.approval_number || row.Approval_Number || row["Approval Number"]),
      ...row // keep extras for completeness
    }));

    return { headers, claims };
  } catch (error) {
    console.error("Error parsing claims Excel:", error);
    throw new Error("Failed to parse claims Excel file.");
  }
};

/**
 * ========================
 * HELPERS
 * ========================
 */

function sanitizeString(value: any): string {
  if (typeof value !== "string") return String(value || "").trim();
  return value.trim();
}

function normalizeDate(value: any): string {
  if (!value) return "";
  // Check if it's a number (Excel date)
  if (typeof value === 'number' && value > 1) {
    try {
      // Excel's epoch starts on 1900-01-01, but has a bug where it thinks 1900 is a leap year.
      // The correction involves subtracting 1, but most libraries handle this.
      // Here we convert excel date number to JS date.
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    } catch {
       return String(value);
    }
  }
  // If it's a string, try to parse it
  try {
    const date = new Date(value);
    // Check if the parsed date is valid
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // fall-through
  }
  return String(value);
}