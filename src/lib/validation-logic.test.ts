import { staticValidateClaims } from './validation-logic';
import type { ClaimRecord } from './types';
import type { RuleSet as MedicalRuleSet } from './pdf-parser';
import type { TechnicalRuleSet } from './technical-parser';

// Mock data based on the provided rules

const mockMedicalRules: MedicalRuleSet = {
    rawText: "...",
    sections: {
        'B': `Facility Registry
             • 96GUDLMT GENERAL_HOSPITAL
             • 2XKSZK4T MATERNITY_HOSPITAL`
    },
    structured: {
        encounterRules: [
            { encounterType: 'INPATIENT', services: ['SRV1001'] },
            { encounterType: 'OUTPATIENT', services: ['SRV2001', 'SRV2008'] }
        ],
        facilityRules: {
            'MATERNITY_HOSPITAL': ['SRV2008'],
            'GENERAL_HOSPITAL': ['SRV1001', 'SRV2001', 'SRV2008']
        },
        diagnosisRules: [
            { code: 'E11.9', diagnosis: 'Diabetes', requiredService: 'SRV2007' }
        ],
        exclusionRules: [
            { codeA: 'R73.03', codeB: 'E11.9', rule: 'Prediabetes cannot coexist with Diabetes' }
        ]
    }
};

const mockTechnicalRules: TechnicalRuleSet = {
    rawText: "...",
    sections: {},
    structured: {
        serviceApprovals: [
            { serviceCode: 'SRV1001', description: 'Major Surgery', approvalRequired: true }
        ],
        diagnosisApprovals: [
            { diagnosisCode: 'Z34.0', diagnosis: 'Pregnancy', approvalRequired: true }
        ],
        thresholdRules: [
            { field: 'paid_amount_aed', currency: 'AED', amount: 250, condition: '> 250' }
        ],
        idFormatRules: [
            { description: 'All IDs must be UPPERCASE alphanumeric (A–Z, 0–9).', pattern: '^[A-Z0-9]+$' },
            { description: 'unique_id structure: first4(National ID) – middle4(Member ID) – last4(Facility ID).', pattern: '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$' }
        ]
    }
};


const baseClaim: ClaimRecord = {
    claim_id: 'CLM001',
    encounter_type: 'Outpatient',
    service_date: '2024-05-01',
    national_id: 'NATL',
    member_id: 'MEMB',
    facility_id: '96GUDLMT',
    unique_id: 'NATL-MEMB-DLMT',
    diagnosis_codes: 'R07.9',
    service_code: 'SRV2001',
    paid_amount_aed: 150,
};

describe('Static Claim Validation Logic', () => {

    it('should pass a perfectly valid claim', () => {
        const claims = [baseClaim];
        const results = staticValidateClaims(claims, mockMedicalRules, mockTechnicalRules);
        expect(results[0].status).toBe('Validated');
        expect(results[0].errors).toHaveLength(0);
    });

    it('should fail for inpatient service in outpatient encounter', () => {
        const claims = [{ ...baseClaim, service_code: 'SRV1001', encounter_type: 'Outpatient' }];
        const results = staticValidateClaims(claims, mockMedicalRules, mockTechnicalRules);
        expect(results[0].status).toBe('Not validated');
        expect(results[0].errors[0].message).toContain('Service SRV1001 is inpatient-only');
    });

    it('should fail for a service not permitted at a facility type', () => {
        const claims = [{ ...baseClaim, facility_id: '2XKSZK4T', service_code: 'SRV2001' }]; // SRV2001 not in MATERNITY_HOSPITAL
        const results = staticValidateClaims(claims, mockMedicalRules, mockTechnicalRules);
        expect(results[0].status).toBe('Not validated');
        expect(results[0].errors[0].message).toContain('Service SRV2001 not permitted at facility type MATERNITY_HOSPITAL');
    });

    it('should fail if a required diagnosis is missing', () => {
        const claims = [{ ...baseClaim, service_code: 'SRV2007', diagnosis_codes: 'I10' }];
        const results = staticValidateClaims(claims, mockMedicalRules, mockTechnicalRules);
        expect(results[0].status).toBe('Not validated');
        expect(results[0].errors[0].message).toContain('Service SRV2007 requires diagnosis E11.9');
    });

    it('should fail for mutually exclusive diagnoses', () => {
        const claims = [{ ...baseClaim, diagnosis_codes: 'E11.9,R73.03' }];
        const results = staticValidateClaims(claims, mockMedicalRules, mockTechnicalRules);
        expect(results[0].status).toBe('Not validated');
        expect(results[0].errors[0].message).toContain('Invalid coexisting diagnoses');
    });

    it('should fail if approval is needed for amount and is missing', () => {
        const claims = [{ ...baseClaim, paid_amount_aed: 300, approval_number: undefined }];
        const results = staticValidateClaims(claims, mockMedicalRules, mockTechnicalRules);
        expect(results[0].status).toBe('Not validated');
        expect(results[0].errors.some(e => e.message.includes('Prior approval required but missing'))).toBe(true);
        expect(results[0].errors.some(e => e.message.includes('Amount > 250'))).toBe(true);
    });
    
    it('should fail for lowercase ID', () => {
        const claims = [{ ...baseClaim, member_id: 'memb001' }];
        const results = staticValidateClaims(claims, mockMedicalRules, mockTechnicalRules);
        expect(results[0].status).toBe('Not validated');
        expect(results[0].errors.some(e => e.message.includes('Member ID memb001 is not uppercase alphanumeric'))).toBe(true);
    });

    it('should fail for incorrect unique_id structure', () => {
        const claims = [{ ...baseClaim, national_id: "NATL", member_id: "MEMB", facility_id: "FAIL", unique_id: 'NATL-MEMB-XXXX' }];
        const results = staticValidateClaims(claims, mockMedicalRules, mockTechnicalRules);
        expect(results[0].status).toBe('Not validated');
        expect(results[0].errors.some(e => e.message.includes('does not match constituent parts'))).toBe(true);
    });
});
