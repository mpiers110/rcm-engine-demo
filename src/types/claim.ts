import {ClaimStatus as PrismaClaimStatus} from '@prisma/client';
export interface Claim {
  id: string;
  claimNumber?: string; // Not in Excel, but we'll generate it
  encounterType: string;
  serviceDate: string;
  nationalId: string;
  memberId: string;
  facilityId: string;
  uniqueId: string;
  diagnosisCodes: string[];
  approvalNumber: string;
  serviceCode: string;
  paidAmount: number;
  status: PrismaClaimStatus;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  validationResult?: ValidationResult;
  [key: string]: any;
}

export interface ExcelClaimInput {
  encounter_type: string;
  service_date: string; // Excel date format "MM/DD/YY"
  national_id: string;
  member_id: string;
  facility_id: string;
  unique_id: string;
  diagnosis_codes: string; // Semicolon-separated string
  approval_number: string;
  service_code: string;
  paid_amount_aed: number | string;
}

export interface CreateClaimInput {
  encounterType: string;
  serviceDate: string | Date;
  nationalId: string;
  memberId: string;
  facilityId: string;
  uniqueId: string;
  diagnosisCodes: string[];
  approvalNumber: string;
  serviceCode: string;
  paidAmount: number;
}

export interface ValidationResult {
  isValid: boolean;
  requiresApproval: boolean;
  errors: string[];
  warnings: string[];
  technicalValidation: TechnicalValidationResult;
  medicalValidation: MedicalValidationResult;
  approvalReasons: string[];
}

export interface TechnicalValidationResult {
  idFormatValid: boolean;
  idFormatErrors: string[];
  serviceApprovalRequired: boolean;
  diagnosisApprovalRequired: boolean;
  amountApprovalRequired: boolean;
  approvedServices: string[];
  approvedDiagnoses: string[];
}

export interface MedicalValidationResult {
  encounterTypeValid: boolean;
  facilityTypeValid: boolean;
  diagnosisRequirementsMet: boolean;
  noMutuallyExclusiveDiagnoses: boolean;
  mutuallyExclusiveErrors: string[];
  facilityServiceErrors: string[];
  diagnosisServiceErrors: string[];
}

export enum ClaimStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REQUIRES_APPROVAL = 'REQUIRES_APPROVAL'
}