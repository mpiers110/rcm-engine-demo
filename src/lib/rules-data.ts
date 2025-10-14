export const medicalRulesText = `
Medical Adjudication Guide (Ideal State)

Framing: Service eligibility is constrained by (A) encounter type, (B) facility type (by facility ID), (C) presence of
specific diagnoses, and (D) mutually exclusive diagnoses that must not co-exist on a claim. Your engine must parse
and apply these rules to the provided claims file.

A. Services limited by Encounter Type
• Inpatient-only services:
• SRV1001 Major Surgery
• SRV1002 ICU Stay
• SRV1003 Inpatient Dialysis
• Outpatient-only services:
• SRV2001 ECG
• SRV2002 Flu Vaccine
• SRV2003 Routine Lab Panel
• SRV2004 X-Ray
• SRV2006 Pulmonary Function Test
• SRV2007 HbA1c Test
• SRV2008 Ultrasonogram – Pregnancy Check
• SRV2010 Outpatient Dialysis
• SRV2011 Cardiac Stress Test

B. Services limited by Facility Type
• MATERNITY_HOSPITAL: SRV2008
• DIALYSIS_CENTER: SRV1003, SRV2010
• CARDIOLOGY_CENTER: SRV2001, SRV2011
• GENERAL_HOSPITAL: SRV1001, SRV1002, SRV1003, SRV2001, SRV2002, SRV2003, SRV2004, SRV2006,
SRV2007, SRV2008, SRV2010, SRV2011

Facility Registry (IDs present in claims)
• 0DBYE6KP DIALYSIS_CENTER
• 2XKSZK4T MATERNITY_HOSPITAL
• 7R1VMIGX CARDIOLOGY_CENTER
• 96GUDLMT GENERAL_HOSPITAL
• 9V7HTI6E GENERAL_HOSPITAL
• EGVP0QAQ GENERAL_HOSPITAL
• EPRETQTL DIALYSIS_CENTER
• FLXFBIMD GENERAL_Hospital
• GLCTDQAJ MATERNITY_HOSPITAL
• GY0GUI8G GENERAL_HOSPITAL
• I2MFYKYM GENERAL_HOSPITAL
• LB7I54Z7 CARDIOLOGY_CENTER
• M1XCZVQD CARDIOLOGY_CENTER
• M7DJYNG5 GENERAL_HOSPITAL
• MT5W4HIR MATERNITY_HOSPITAL
• OCQUMGDW GENERAL_HOSPITAL
• OIAP2DTP CARDIOLOGY_CENTER
• Q3G9N34N GENERAL_HOSPITAL
• Q8OZ5Z7C GENERAL_HOSPITAL
• RNPGDXCU MATERNITY_HOSPITAL
• S174K5QK GENERAL_HOSPITAL
• SKH7D31V CARDIOLOGY_CENTER
• SZC62NTW GENERAL_HOSPITAL
• VV1GS6P0 MATERNITY_HOSPITAL
• ZDE6M6NJ GENERAL_HOSPITAL

C. Services requiring specific Diagnoses
• E11.9 Diabetes Mellitus: SRV2007 HbA1c Test
• J45.909 Asthma: SRV2006 Pulmonary Function Test
• R07.9 Chest Pain: SRV2001 ECG
• Z34.0 Pregnancy: SRV2008 Ultrasonogram – Pregnancy Check
• N39.0 Urinary Tract Infection: SRV2005 Urine Culture

D. Mutually Exclusive Diagnoses (Error if co-present)
• R73.03 Prediabetes cannot coexist with E11.9 Diabetes Mellitus
• E66.9 Obesity cannot coexist with E66.3 Overweight
• R51 Headache cannot coexist with G43.9 Migraine
`;

export const technicalRulesText = `
Technical Adjudication & Submission Guide (Ideal State)

Framing: Approval may be required based on (1) the service code, (2) the diagnosis code, and (3) the paid amount
threshold. In addition, all IDs must follow strict formatting.

1) Services Requiring Prior Approval
Service Code Description Approval Required?
SRV1001 Major Surgery YES
SRV1002 ICU Stay YES
SRV1003 Inpatient Dialysis NO
SRV2001 ECG NO
SRV2002 Flu Vaccine NO
SRV2003 Routine Lab Panel NO
SRV2004 X-Ray NO
SRV2006 Pulmonary Function Test NO
SRV2007 HbA1c Test NO
SRV2008 Ultrasonogram – Pregnancy Check YES
SRV2010 Outpatient Dialysis NO
SRV2011 Cardiac Stress Test NO

2) Diagnosis Codes Requiring Approval
Diagnosis Code Diagnosis Approval Required?
E11.9 Diabetes Mellitus YES
E66.3 Overweight NO
E66.9 Obesity NO
E88.9 Metabolic Disorder NO
G43.9 Migraine NO
J45.909 Asthma NO
N39.0 Urinary Tract Infection NO
R07.9 Chest Pain YES
R51 Headache NO
R73.03 Prediabetes NO
Z34.0 Pregnancy YES

3) Paid Amount Threshold (in addition to the above)
Any claim with paid_amount_aed > AED 250 requires prior approval, in addition to any approval needs arising from
service code or diagnosis code.

4) ID & Unique ID Formatting
• All IDs must be UPPERCASE alphanumeric (A–Z, 0–9).
• unique_id structure: first4(National ID) – middle4(Member ID) – last4(Facility ID).
• Segments must be hyphen-separated (e.g., AB12-34CD-9XYZ).
• The rule engine must verify segment sources and casing.
`;
