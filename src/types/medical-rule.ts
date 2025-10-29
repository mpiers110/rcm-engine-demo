export interface MedicalRuleSet {
  id: string;
  title: string;
  framing?: string;
  type: 'MEDICAL';
  isActive: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  
  medicalRule?: MedicalRule;
}

export interface MedicalRule {
  id?: string;
  title: string;
  framing?: string;
  type: 'MEDICAL';
  isActive: boolean;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;
  
  encounterTypes?: EncounterType[];
  facilityTypes?: FacilityType[];
  facilityRegistry?: FacilityRegistry[];
  diagnosisRequirements?: DiagnosisRequirement[];
  mutuallyExclusiveDiagnoses?: MutuallyExclusiveDiagnosis[];
}

export interface EncounterType {
  id?: string;
  medicalRuleId?: string;
  type: string;
  code: string;
  description: string;
  createdAt?: Date;
  }

export interface FacilityType {
  id?: string;
  medicalRuleId?: string;
  facilityType: string;
  allowedServices: string[];
  createdAt?: Date;
}

export interface FacilityRegistry {
  id?: string;
  medicalRuleId?: string;
  facilityId?: string;
  type: string;
  createdAt?: Date;
}

export interface DiagnosisRequirement {
  id?: string;
  medicalRuleId?: string;
  diagnosisCode: string;
  diagnosisName: string;
  serviceID: string;
  serviceName: string;
  createdAt?: Date;
}

export interface MutuallyExclusiveDiagnosis {
  id?: string;
  medicalRuleId?: string;
  diagnosis1Code: string;
  diagnosis1Name: string;
  diagnosis2Code: string;
  diagnosis2Name: string;
  createdAt?: Date;
}


export interface MedicalError {
  type: string;
          category: string
          message: string
          action: string
}

// Input types for creating/updating medical rules
export interface CreateMedicalRuleInput {
  title: string;
  framing?: string;
  encounterTypes: Omit<EncounterType, 'id' | 'medicalRuleId' | 'createdAt'>[];
  facilityTypes: Omit<FacilityType, 'id' | 'medicalRuleId' | 'createdAt'>[];
  facilityRegistry: Omit<FacilityRegistry, 'id' | 'medicalRuleId' | 'createdAt'>[];
  diagnosisRequirements: Omit<DiagnosisRequirement, 'id' | 'medicalRuleId' | 'createdAt'>[];
  mutuallyExclusive: Array<{
    diagnosis1: {
      code: string;
      name: string;
    };
    diagnosis2: {
      code: string;
      name: string;
    };
  }>;
}

export interface UpdateMedicalRuleInput {
  title?: string;
  framing?: string;
  isActive?: boolean;
}