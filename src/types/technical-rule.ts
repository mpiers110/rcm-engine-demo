export interface TechnicalRuleSet {
  id: string;
  title: string;
  framing?: string;
  type: 'TECHNICAL';
  isActive: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  
  technicalRule?: TechnicalRule;
}

export interface TechnicalRule {
  id?: string;
  title: string;
  framing?: string;
  type: 'TECHNICAL';
  isActive: boolean;
  ownerId: string;
  ruleSetId: string;
  createdAt?: Date;
  updatedAt?: Date;
  
  serviceApprovals: ServiceApproval[];
  diagnosisApprovals: DiagnosisApproval[];
  paidAmountThreshold: PaidAmountThreshold;
  idFormattingRules: IdFormattingRules;
}

export interface ServiceApproval {
  id?: string;
  technicalRuleId?: string;
  serviceID: string;
  description: string;
  approvalRequired: boolean;
  createdAt?: Date;
}

export interface DiagnosisApproval {
  id?: string;
  technicalRuleId?: string;
  code: string;
  diagnosis: string;
  approvalRequired: boolean;
  createdAt?: Date;
}

export interface PaidAmountThreshold {
  id?: string;
  technicalRuleId?: string;
  threshold: number;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IdFormattingRules {
  id?: string;
  technicalRuleId?: string;
  idFormat: string;
  uniqueIdStructure: string;
  requirements: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Input types for creating/updating technical rules
export interface CreateTechnicalRuleInput {
  title: string;
  framing?: string;
  servicesRequiringApproval: Omit<ServiceApproval, 'id' | 'technicalRuleId' | 'createdAt'>[];
  diagnosisCodesRequiringApproval: Omit<DiagnosisApproval, 'id' | 'technicalRuleId' | 'createdAt'>[];
  paidAmountThreshold: Omit<PaidAmountThreshold, 'id' | 'technicalRuleId' | 'createdAt' | 'updatedAt'>;
  idFormattingRules: Omit<IdFormattingRules, 'id' | 'technicalRuleId' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateTechnicalRuleInput {
  title?: string;
  framing?: string;
  isActive?: boolean;
}