export type ClaimStatus = 'Validated' | 'Not validated' | 'Pending';
export type ErrorType = 'No error' | 'Medical error' | 'Technical error' | 'both';

export interface Claim {
  id: string;
  claim_id: string;
  encounter_type: 'Inpatient' | 'Outpatient';
  service_date: string;
  national_id: string;
  member_id: string;
  facility_id: string;
  unique_id: string;
  diagnosis_codes: string;
  service_code: string;
  paid_amount_aed: number;
  approval_number?: string;
  status: ClaimStatus;
  error_type: ErrorType;
  error_explanation: string | null;
  recommended_action: string | null;
  raw_errors?: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export type ChartData = {
  category: string;
  count?: number;
  amount?: number;
};

export interface AuditLogEntry {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  userId?: string | null;
}

export interface ClaimRecord {
  claim_id: string;
  encounter_type: string;
  serviceCode: string;
  service_date: string;
  diagnosis_codes: string;
  facility_id: string;
  paid_amount_aed: number;
  member_id: string;
  national_id: string;
  unique_id: string;
  approval_number?: string;
  [key: string]: any; // for extra unmapped columns
}

export interface ClaimsParseResult {
  headers: string[];
  claims: ClaimRecord[];
}

export interface StaticValidationError {
  type: 'Medical' | 'Technical';
  message: string;
}

export interface StaticValidationResult {
  claim_id: string;
  status: 'Validated' | 'Not validated';
  error_type: 'No error' | 'Medical error' | 'Technical error' | 'both';
  errors: StaticValidationError[];
  explanation: string[];
  recommended_action: string[];
}
