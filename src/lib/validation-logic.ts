import type {ClaimRecord} from './types';
import type {RuleSet as MedicalRuleSet} from './pdf-parser';
import type {TechnicalRuleSet} from './technical-parser';
import type {StaticValidationError, StaticValidationResult} from './types';

/**
 * Core static rule validator
 * Accepts claim data and both rule sets in JSON format.
 * Returns structured validation results for each claim.
 */
export function staticValidateClaims(
  claims: ClaimRecord[],
  medicalRules: MedicalRuleSet,
  technicalRules: TechnicalRuleSet
): StaticValidationResult[] {
  const results: StaticValidationResult[] = [];

  const facilityTypeMap = getFacilityTypeMap(medicalRules);

  for (const claim of claims) {
    const errors: StaticValidationError[] = [];

    // --- MEDICAL VALIDATIONS ---
    errors.push(
      ...validateEncounterType(claim, medicalRules),
      ...validateFacilityType(claim, medicalRules, facilityTypeMap),
      ...validateDiagnosisRequirements(claim, medicalRules),
      ...validateMutualExclusions(claim, medicalRules)
    );

    // --- TECHNICAL VALIDATIONS ---
    const approvalReasons: string[] = [];
    if (validateServiceApproval(claim, technicalRules))
      approvalReasons.push(`Service ${claim.service_code}`);
    if (validateDiagnosisApproval(claim, technicalRules))
      approvalReasons.push(`Diagnosis ${claim.diagnosis_codes}`);
    if (validateAmountThreshold(claim, technicalRules))
      approvalReasons.push(`Amount > ${technicalRules.structured.thresholdRules[0]?.amount}`);
    
    if (approvalReasons.length > 0 && !claim.approval_number) {
        errors.push({
            type: "Technical",
            message: `Prior approval required but missing. Reasons: ${approvalReasons.join(', ')}.`
        })
    }

    errors.push(...validateIdFormat(claim, technicalRules));


    // Derive overall status and type
    const hasMedical = errors.some(e => e.type === 'Medical');
    const hasTechnical = errors.some(e => e.type === 'Technical');

    const error_type =
      hasMedical && hasTechnical
        ? 'both'
        : hasMedical
        ? 'Medical error'
        : hasTechnical
        ? 'Technical error'
        : 'No error';

    const status = error_type === 'No error' ? 'Validated' : 'Not validated';

    results.push({
      claim_id: claim.claim_id,
      status,
      error_type,
      errors,
      explanation: errors.map(e => `• ${e.message}`),
      recommended_action: suggestActions(errors),
    });
  }

  return results;
}

/**
 * ======================
 * MEDICAL VALIDATIONS
 * ======================
 */
function validateEncounterType(
  claim: ClaimRecord,
  rules: MedicalRuleSet
): StaticValidationError[] {
  const {encounter_type, service_code} = claim;
  const inpatientRule = rules.structured.encounterRules.find(
    r => r.encounterType === 'INPATIENT'
  );
  const outpatientRule = rules.structured.encounterRules.find(
    r => r.encounterType === 'OUTPATIENT'
  );

  if (
    encounter_type.toUpperCase() === 'OUTPATIENT' &&
    inpatientRule?.services.includes(service_code)
  ) {
    return [
      {
        type: 'Medical',
        message: `Service ${service_code} is inpatient-only but encounter is Outpatient.`,
      },
    ];
  }
  if (
    encounter_type.toUpperCase() === 'INPATIENT' &&
    outpatientRule?.services.includes(service_code)
  ) {
    return [
      {
        type: 'Medical',
        message: `Service ${service_code} is outpatient-only but encounter is Inpatient.`,
      },
    ];
  }
  return [];
}


const getFacilityTypeMap = (medicalRules: MedicalRuleSet): Map<string, string> => {
  const facilityTypeMap = new Map<string, string>();
  const facilityRegistryText = medicalRules.sections['B']?.split('Facility Registry')[1] ?? '';
  const facilityLines = facilityRegistryText.match(/• \w+ [\w_]+/g) ?? [];

  facilityLines.forEach(line => {
      const parts = line.replace('• ', '').trim().split(/\s+/);
      if (parts.length >= 2) {
          facilityTypeMap.set(parts[0], parts[1]);
      }
  });
  return facilityTypeMap;
}


function validateFacilityType(
  claim: ClaimRecord,
  rules: MedicalRuleSet,
  facilityTypeMap: Map<string, string>
): StaticValidationError[] {
    const { facility_id, service_code } = claim;
    const facilityType = facilityTypeMap.get(facility_id.toUpperCase());

    if (facilityType) {
        const allowedServices = rules.structured.facilityRules[facilityType] || [];
        const allGovernedServices = Object.values(rules.structured.facilityRules).flat();
        
        if (allGovernedServices.includes(service_code) && !allowedServices.includes(service_code)) {
            return [{
                type: 'Medical',
                message: `Service ${service_code} not permitted at facility type ${facilityType} (ID: ${facility_id}).`
            }];
        }
    }
    return [];
}

function validateDiagnosisRequirements(
  claim: ClaimRecord,
  rules: MedicalRuleSet
): StaticValidationError[] {
  const {diagnosis_codes, service_code} = claim;
  const errors: StaticValidationError[] = [];
  const claimDiags = diagnosis_codes?.split(',').map(d => d.trim()) || [];

  rules.structured.diagnosisRules.forEach(rule => {
      if (rule.requiredService === service_code && !claimDiags.includes(rule.code)) {
          errors.push({
              type: 'Medical',
              message: `Service ${service_code} requires diagnosis ${rule.code} (${rule.diagnosis}).`
          })
      }
  });

  return errors;
}

function validateMutualExclusions(
  claim: ClaimRecord,
  rules: MedicalRuleSet
): StaticValidationError[] {
  const diagnosisCodes =
    claim.diagnosis_codes?.split(',').map(d => d.trim()) || [];
  const exclusions = rules.structured.exclusionRules.filter(
    r => diagnosisCodes.includes(r.codeA) && diagnosisCodes.includes(r.codeB)
  );

  return exclusions.map(r => ({
    type: 'Medical',
    message: `Invalid coexisting diagnoses: ${r.rule}.`,
  }));
}

/**
 * ======================
 * TECHNICAL VALIDATIONS
 * ======================
 */
function validateServiceApproval(
  claim: ClaimRecord,
  rules: TechnicalRuleSet
): boolean {
  const rule = rules.structured.serviceApprovals.find(
    r => r.serviceCode === claim.service_code
  );
  return !!rule?.approvalRequired;
}

function validateDiagnosisApproval(
  claim: ClaimRecord,
  rules: TechnicalRuleSet
): boolean {
    const claimDiags = claim.diagnosis_codes?.split(',').map(d => d.trim()) || [];
    return claimDiags.some(dx => {
        const rule = rules.structured.diagnosisApprovals.find(r => r.diagnosisCode === dx);
        return !!rule?.approvalRequired;
    });
}

function validateAmountThreshold(
  claim: ClaimRecord,
  rules: TechnicalRuleSet
): boolean {
  const amount = claim.paid_amount_aed || 0;
  const threshold = rules.structured.thresholdRules[0];
  return !!(threshold && amount > threshold.amount);
}

function validateIdFormat(
  claim: ClaimRecord,
  rules: TechnicalRuleSet
): StaticValidationError[] {
  const errors: StaticValidationError[] = [];
  const {national_id, member_id, facility_id, unique_id} = claim;

  const uppercaseRule = rules.structured.idFormatRules.find(r => r.description.includes("UPPERCASE"));
  if (uppercaseRule?.pattern) {
    const regex = new RegExp(uppercaseRule.pattern);
    if (national_id && !regex.test(national_id)) errors.push({type: 'Technical', message: `National ID ${national_id} is not uppercase alphanumeric.`});
    if (member_id && !regex.test(member_id)) errors.push({type: 'Technical', message: `Member ID ${member_id} is not uppercase alphanumeric.`});
    if (facility_id && !regex.test(facility_id)) errors.push({type: 'Technical', message: `Facility ID ${facility_id} is not uppercase alphanumeric.`});
  }

  const uniqueIdStructureRule = rules.structured.idFormatRules.find(r => r.description.includes("unique_id structure"));
  if (uniqueIdStructureRule?.pattern) {
      if (unique_id && !new RegExp(uniqueIdStructureRule.pattern).test(unique_id)) {
          errors.push({
              type: "Technical",
              message: `Unique ID ${unique_id} violates format rule: ${uniqueIdStructureRule.description}`
          });
      } else if (national_id && member_id && facility_id && unique_id) {
          const expectedUniqueId = `${national_id.substring(0, 4)}-${member_id.substring(Math.floor(member_id.length/2) - 2, Math.floor(member_id.length/2) + 2)}-${facility_id.slice(-4)}`.toUpperCase();
          if(unique_id.toUpperCase() !== expectedUniqueId) {
            errors.push({
                type: "Technical",
                message: `Unique ID ${unique_id} does not match constituent parts. Expected ${expectedUniqueId}.`
            })
          }
      }
  }


  return errors;
}

/**
 * ======================
 * RECOMMENDATION ENGINE
 * ======================
 */
function suggestActions(errors: StaticValidationError[]): string[] {
  const actions: string[] = [];
  for (const e of errors) {
    if (e.message.includes('approval'))
      actions.push('Request prior approval before submission.');
    else if (e.message.includes('not permitted'))
      actions.push('Verify service eligibility for facility or encounter.');
    else if (e.message.includes('inpatient-only') || e.message.includes('outpatient-only'))
      actions.push('Correct the encounter type to match the service provided.');
    else if (e.message.includes('requires'))
      actions.push('Update service code to match diagnosis requirement.');
    else if (e.message.includes('exceeds'))
      actions.push('Flag for manual review or approval due to amount threshold.');
    else if (e.message.includes('format') || e.message.includes('ID'))
      actions.push('Correct the ID or unique_id format.');
    else actions.push('Review claim data for compliance.');
  }
  return [...new Set(actions)];
}
