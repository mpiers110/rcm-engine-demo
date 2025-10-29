import { MedicalRule, EncounterType, FacilityType, FacilityRegistry, DiagnosisRequirement, MutuallyExclusiveDiagnosis, MedicalError } from "@/types/medical-rule";
import { ServiceApproval, TechnicalRule, IdFormattingRules, DiagnosisApproval, PaidAmountThreshold } from "@/types/technical-rule";
import { Claim } from "@/types/claim";

/**
 * Main validation engine that validates claims against medical and technical rules
 * @param {Array} claimsData - Array of claim objects
 * @param {Object} medicalRules - Medical adjudication rules
 * @param {Object} technicalRules - Technical adjudication rules
 * @returns {Object} Validation results with statistics and detailed errors
 */
export const validateClaims = (claimsData: Claim[], medicalRules: MedicalRule, technicalRules: TechnicalRule) => {
  if (!claimsData || claimsData.length === 0) {
    throw new Error('Claims data is required');
  }

  const results = claimsData.map((claim) => validateSingleClaim(claim, medicalRules, technicalRules));
  
  return {
    results,
    summary: generateSummary(results),
    chartData: generateChartData(results)
  };
};

/**
 * Validates a single claim against all rules
 */
const validateSingleClaim = (claim: Claim, medicalRules: MedicalRule, technicalRules: TechnicalRule) => {
  const errors = [];
  let medicalError = false;
  let technicalError = false;

  // Medical validations
  if (medicalRules) {
    const medicalErrors = runMedicalValidations(claim, medicalRules);
    if (medicalErrors.length > 0) {
      medicalError = true;
      errors.push(...medicalErrors);
    }
  }

  // Technical validations
  if (technicalRules) {
    const techErrors = runTechnicalValidations(claim, technicalRules);
    if (techErrors.length > 0) {
      technicalError = true;
      errors.push(...techErrors);
    }
  }

  const errorType = medicalError && technicalError ? 'Both' : 
                   medicalError ? 'Medical Error' : 
                   technicalError ? 'Technical Error' : 'No Error';

  return {
    ...claim,
    status: errors.length === 0 ? 'Validated' : 'Not Validated',
    errorType,
    errors,
    errorCount: errors.length,
    explanation: errors.length > 0 ? errors.map(e => `• ${e.message}`).join('\n') : 'No errors found',
    recommendedAction: errors.length > 0 ? errors.map(e => e.action).join('; ') : 'None required'
  };
};

/**
 * Run all medical rule validations
 */
const runMedicalValidations = (claim: Claim, medicalRules: MedicalRule) => {
  const errors = [];

  // 1. Validate encounter type
  const encounterErrors = validateEncounterType(claim, medicalRules.encounterTypes);
  errors.push(...encounterErrors);

  // 2. Validate facility type
  if (medicalRules.facilityTypes) {
    const facilityErrors = validateFacilityType(claim, medicalRules.facilityTypes, medicalRules.facilityRegistry);
    errors.push(...facilityErrors);
  }

  // 3. Validate diagnosis-service requirements
  if (medicalRules.diagnosisRequirements) {
    const diagnosisErrors = validateDiagnosisRequirements(claim, medicalRules.diagnosisRequirements);
    errors.push(...diagnosisErrors);
  }

  // 4. Validate mutually exclusive diagnoses
  if (medicalRules.mutuallyExclusiveDiagnoses) {
    const exclusiveErrors = validateMutuallyExclusive(claim, medicalRules.mutuallyExclusiveDiagnoses);
    errors.push(...exclusiveErrors);
  }

  return errors;
};

/**
 * Validate encounter type rules
 */
const validateEncounterType = (claim: Claim, encounterTypes: EncounterType) => {
  const errors: MedicalError[] = [];
  
  if (!encounterTypes) return errors;

  const encounterType = claim.encounterType?.toUpperCase();
  
  if (encounterType === 'INPATIENT' && encounterTypes.inpatient) {
    const allowedServices = encounterTypes.inpatient.map(s => s.code);
    if (!allowedServices.includes(claim.serviceCode)) {
      errors.push({
        type: 'Medical',
        category: 'Encounter Type Mismatch',
        message: `Service ${claim.serviceCode} is not allowed for INPATIENT encounters. Allowed: ${allowedServices.join(', ')}`,
        action: 'Change service code to an inpatient-allowed service or update encounter type to OUTPATIENT'
      });
    }
  } else if (encounterType === 'OUTPATIENT' && encounterTypes.outpatient) {
    const allowedServices = encounterTypes.outpatient.map(s => s.code);
    if (!allowedServices.includes(claim.serviceCode)) {
      errors.push({
        type: 'Medical',
        category: 'Encounter Type Mismatch',
        message: `Service ${claim.serviceCode} is not allowed for OUTPATIENT encounters. Allowed: ${allowedServices.join(', ')}`,
        action: 'Change service code to an outpatient-allowed service or update encounter type to INPATIENT'
      });
    }
  }

  return errors;
};

/**
 * Validate facility type rules
 */
const validateFacilityType = (claim: Claim, facilityTypes: FacilityType[], facilityRegistry: FacilityRegistry[]) => {
  const errors: MedicalError[] = [];
  
  if (!facilityRegistry) return errors;

  // Find facility type from registry
  const facilityInfo = facilityRegistry.find(f => f.id === claim.facilityId);
  if (!facilityInfo) {
    errors.push({
      type: 'Medical',
      category: 'Facility Not Found',
      message: `Facility ID ${claim.facilityId} not found in facility registry`,
      action: 'Verify facility ID or register the facility in the system'
    });
    return errors;
  }

  // Check if service is allowed at this facility type
  const facilityTypeRule = facilityTypes.find(ft => 
    ft.facilityType.toUpperCase() === facilityInfo.type.toUpperCase()
  );

  if (facilityTypeRule && !facilityTypeRule.allowedServices.includes(claim.serviceCode)) {
    errors.push({
      type: 'Medical',
      category: 'Facility Type Restriction',
      message: `Service ${claim.serviceCode} is not allowed at ${facilityInfo.type}. Allowed services: ${facilityTypeRule.allowedServices.join(', ')}`,
      action: `Change service code or transfer claim to appropriate facility type`
    });
  }

  return errors;
};

/**
 * Validate diagnosis requirements
 */
const validateDiagnosisRequirements = (claim: Claim, diagnosisRequirements: DiagnosisRequirement[]) => {
  const errors: MedicalError[] = [];
  
  if (!claim.diagnosisCodes) return errors;

  const diagCodes = claim.diagnosisCodes.toString().split(';').map(c => c.trim());

  diagnosisRequirements.forEach(rule => {
    if (diagCodes.includes(rule.diagnosisCode)) {
      if (claim.serviceCode !== rule.serviceID) {
        errors.push({
          type: 'Medical',
          category: 'Diagnosis-Service Mismatch',
          message: `Diagnosis ${rule.diagnosisCode} (${rule.diagnosisName}) requires service ${rule.serviceID} (${rule.serviceName}), but ${claim.serviceCode} was provided`,
          action: `Update service code to ${rule.serviceID} or remove diagnosis code ${rule.diagnosisCode}`
        });
      }
    }
  });

  return errors;
};

/**
 * Validate mutually exclusive diagnoses
 */
const validateMutuallyExclusive = (claim: Claim, exclusiveRules: MutuallyExclusiveDiagnosis[]) => {
  const errors: MedicalError[] = [];
  
  if (!claim.diagnosisCodes) return errors;

  const diagCodes = claim.diagnosisCodes.toString().split(';').map(c => c.trim());

  exclusiveRules.forEach(rule => {
    if (diagCodes.includes(rule.diagnosis1Code) && diagCodes.includes(rule.diagnosis2Code)) {
      errors.push({
        type: 'Medical',
        category: 'Mutually Exclusive Diagnoses',
        message: `${rule.diagnosis1Name} (${rule.diagnosis1Code}) cannot coexist with ${rule.diagnosis2Name} (${rule.diagnosis2Code}) on the same claim`,
        action: `Remove either ${rule.diagnosis1Code} or ${rule.diagnosis2Code} from the claim`
      });
    }
  });

  return errors;
};

/**
 * Run all technical rule validations
 */
const runTechnicalValidations = (claim: Claim, technicalRules: TechnicalRule) => {
  const errors = [];

  // 1. Validate service prior approval
  if (technicalRules.serviceApprovals) {
    const serviceApprovalErrors = validateServiceApproval(claim, technicalRules.serviceApprovals);
    errors.push(...serviceApprovalErrors);
  }

  // 2. Validate diagnosis prior approval
  if (technicalRules.diagnosisApprovals) {
    const diagnosisApprovalErrors = validateDiagnosisApproval(claim, technicalRules.diagnosisApprovals);
    errors.push(...diagnosisApprovalErrors);
  }

  // 3. Validate paid amount threshold
  if (technicalRules.paidAmountThreshold) {
    const thresholdErrors = validatePaidAmountThreshold(claim, technicalRules.paidAmountThreshold);
    errors.push(...thresholdErrors);
  }

  // 4. Validate ID formatting
  if (technicalRules.idFormattingRules) {
    const idErrors = validateIdFormatting(claim, technicalRules.idFormattingRules);
    errors.push(...idErrors);
  }

  return errors;
};

/**
 * Validate service approval requirements
 */
const validateServiceApproval = (claim: Claim, serviceApprovalRules: ServiceApproval[]) => {
  const errors: MedicalError[] = [];
  
  const serviceRule = serviceApprovalRules.find(s => s.serviceID === claim.serviceCode);
  
  if (serviceRule && serviceRule.approvalRequired) {
    if (!claim.approvalNumber || claim.approvalNumber === 'NA') {
      errors.push({
        type: 'Technical',
        category: 'Missing Prior Approval',
        message: `Service ${claim.serviceCode} (${serviceRule.description}) requires prior approval, but no approval number was provided`,
        action: 'Obtain prior approval and update approvalNumber field with valid approval reference'
      });
    }
  }

  return errors;
};

/**
 * Validate diagnosis approval requirements
 */
const validateDiagnosisApproval = (claim: Claim, diagnosisApprovalRules: DiagnosisApproval[]) => {
  const errors: MedicalError[] = [];
  
  if (!claim.diagnosisCodes) return errors;

  const diagCodes = claim.diagnosisCodes.toString().split(';').map(c => c.trim());

  diagnosisApprovalRules.forEach(rule => {
    if (rule.approvalRequired && diagCodes.includes(rule.code)) {
      if (!claim.approvalNumber || claim.approvalNumber === 'NA') {
        errors.push({
          type: 'Technical',
          category: 'Missing Prior Approval',
          message: `Diagnosis ${rule.code} (${rule.diagnosis}) requires prior approval, but no approval number was provided`,
          action: `Obtain prior approval for diagnosis ${rule.code} and update approvalNumber field`
        });
      }
    }
  });

  return errors;
};

/**
 * Validate paid amount threshold
 */
const validatePaidAmountThreshold = (claim: Claim, thresholdRule: PaidAmountThreshold) => {
  const errors: MedicalError[] = [];
  
  if (!thresholdRule.threshold) return errors;

  if (claim.paidAmount > thresholdRule.threshold) {
    if (!claim.approvalNumber || claim.approvalNumber === 'NA') {
      errors.push({
        type: 'Technical',
        category: 'Threshold Exceeded',
        message: `Paid amount (${claim.paidAmount} AED) exceeds threshold of ${thresholdRule.threshold} AED and requires prior approval`,
        action: 'Obtain prior approval for high-value claim before processing'
      });
    }
  }

  return errors;
};

/**
 * Validate ID formatting rules
 */
const validateIdFormatting = (claim: Claim, idRules: IdFormattingRules) => {
  const errors: MedicalError[] = [];

  // Validate uniqueId format
  if (claim.uniqueId) {
    const uniqueIdPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!uniqueIdPattern.test(claim.uniqueId)) {
      errors.push({
        type: 'Technical',
        category: 'Invalid ID Format',
        message: `Unique ID format invalid. Expected: XXXX-XXXX-XXXX (uppercase alphanumeric). Got: ${claim.uniqueId}`,
        action: 'Reformat uniqueId to match pattern XXXX-XXXX-XXXX with uppercase alphanumeric characters only'
      });
    }
  }

  // Validate other ID fields
  const idFields = ['nationalId', 'memberId', 'facilityId'];
  idFields.forEach(field => {
    if (claim[field]) {
      const idPattern = /^[A-Z0-9]+$/;
      if (!idPattern.test(claim[field])) {
        errors.push({
          type: 'Technical',
          category: 'Invalid ID Format',
          message: `${field} contains invalid characters. Must be uppercase alphanumeric only. Got: ${claim[field]}`,
          action: `Update ${field} to contain only uppercase letters (A-Z) and numbers (0-9)`
        });
      }
    }
  });

  return errors;
};

/**
 * Generate summary statistics
 */
const generateSummary = (results: any) => {
  const summary: any = {
    totalClaims: results.length,
    validatedClaims: results.filter((r: any) => r.status === 'Validated').length,
    notValidatedClaims: results.filter((r: any) => r.status === 'Not Validated').length,
    noErrors: results.filter((r: any) => r.errorType === 'No Error').length,
    medicalErrors: results.filter((r: any) => r.errorType === 'Medical Error').length,
    technicalErrors: results.filter((r: any) => r.errorType === 'Technical Error').length,
    bothErrors: results.filter((r: any) => r.errorType === 'Both').length,
    totalPaidAmount: results.reduce((sum: any, r: any) => sum + (r.paidAmountAed || 0), 0),
    validatedPaidAmount: results.filter((r: any) => r.status === 'Validated').reduce((sum: any, r: any) => sum + (r.paidAmountAed || 0), 0),
    errorPaidAmount: results.filter((r: any) => r.status === 'Not Validated').reduce((sum: any, r: any) => sum + (r.paidAmountAed || 0), 0)
  };

  summary.validationRate = ((summary.validatedClaims / summary.totalClaims) * 100).toFixed(2);

  return summary;
};

/**
 * Generate chart data for visualization
 */
const generateChartData = (results: any) => {
  const errorCounts = {
    'No Error': 0,
    'Medical Error': 0,
    'Technical Error': 0,
    'Both': 0
  };

  const errorAmounts = {
    'No Error': 0,
    'Medical Error': 0,
    'Technical Error': 0,
    'Both': 0
  };

  const categoryBreakdown = {};

  results.forEach((result: any) => {
    errorCounts[result.errorType as string]++;
    errorAmounts[result.errorType] += result.paidAmountAed || 0;

    // Category breakdown
    result.errors.forEach(error => {
      if (!categoryBreakdown[error.category]) {
        categoryBreakdown[error.category] = { count: 0, amount: 0 };
      }
      categoryBreakdown[error.category].count++;
      categoryBreakdown[error.category].amount += result.paidAmountAed || 0;
    });
  });

  const countData = Object.entries(errorCounts).map(([name, value]) => ({ name, value }));
  const amountData = Object.entries(errorAmounts).map(([name, value]) => ({ 
    name, 
    value: Math.round(value) 
  }));

  const categoryData = Object.entries(categoryBreakdown).map(([name, data]) => ({
    name,
    count: data.count,
    amount: Math.round(data.amount)
  }));

  return {
    countData,
    amountData,
    categoryData
  };
};

/**
 * Export results to downloadable format
 */
export const formatResultsForExport = (results: any) => {
  return results.map((r: any) => ({
    uniqueId: r.uniqueId,
    encounter_type: r.encounter_type,
    serviceDate: r.serviceDate,
    nationalId: r.nationalId,
    memberId: r.memberId,
    facilityId: r.facilityId,
    diagnosisCodes: r.diagnosisCodes,
    approvalNumber: r.approvalNumber,
    serviceCode: r.serviceCode,
    paidAmountAed: r.paidAmountAed,
    status: r.status,
    error_type: r.errorType,
    errorCount: r.errorCount,
    explanation: r.explanation,
    recommendedAction: r.recommendedAction
  }));
};