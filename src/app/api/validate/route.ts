import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Result, validateClaims } from '@/lib/extract';
import { explainAndRecommendAction, validateClaimLLM } from '@/ai/flows';
import { addToAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { TechnicalRuleSet } from '@/types/technical-rule';
import { MedicalRuleSet } from '@/types/medical-rule';
import { Claim as ClaimRecord, ValidationResult } from '@/types/claim';
import { ClaimStatus } from '@prisma/client';


async function getActiveRulesFromDb(userId: string): Promise<{ medicalRules: MedicalRuleSet, technicalRules: TechnicalRuleSet }> {

    const activeMedicalRuleSet = await prisma.ruleSet.findFirst({
        where: { ownerId: userId, isActive: true, type: 'MEDICAL' },
      include: {
        medicalRule: {
          include: {
            encounterTypes: true,
            facilityTypes: true,
            facilityRegistry: true,
            diagnosisRequirements: true,
            mutuallyExclusiveDiagnoses: true
          }
        }
      }
    });

    const activeTechnicalRuleSet = await prisma.ruleSet.findFirst({
        where: { ownerId: userId, isActive: true, type: 'TECHNICAL' },
      include: {
        technicalRule: {
          include: {
            serviceApprovals: true,
            diagnosisApprovals: true,
            paidAmountThreshold: true,
            idFormattingRules: true
          }
        }
      }
    });

    if (!activeMedicalRuleSet || !activeTechnicalRuleSet) {
        throw new Error('No active rule sets found in the database. Please upload rule files.');
    }
  
    
    return { medicalRules: {
      ...activeMedicalRuleSet,
      type: 'MEDICAL',
      framing: activeMedicalRuleSet?.framing ?? '',
      medicalRule: {
        ...activeMedicalRuleSet.medicalRule,
        title: activeMedicalRuleSet?.title || '',
        type: 'MEDICAL',
        isActive: true,
        ownerId: userId,

      }
    }, technicalRules: {
      ...activeTechnicalRuleSet.technicalRule,
      id: activeTechnicalRuleSet.id,
      type: 'TECHNICAL',
      framing: activeTechnicalRuleSet?.framing ?? '',
      title: activeTechnicalRuleSet?.title || '',
      isActive: true,
      ownerId: userId
    } };
}


async function processRuleBasedValidation(claims: ClaimRecord[], medicalRules: MedicalRuleSet, technicalRules: TechnicalRuleSet, userId: string) {
      try {
        if (!medicalRules.medicalRule || !technicalRules.technicalRule) {
            throw new Error('No active rule sets found in the database. Please upload rule files.');
        }
        
    // Run validation
    const validationResult = validateClaims(claims, medicalRules.medicalRule, technicalRules.technicalRule);

    // Log validation results
    addToAuditLog({
      action: 'Claims Validated',
      timestamp: new Date().toISOString(),
      details: `Processed ${claims.length} claims`,
      userId,
    })
        return validationResult;
      } catch (error) {
        console.error(`Error validating claims:`, error);
        // Keep the static explanation as a fallback
      }
}

async function processLLMValidation(claims: ClaimRecord[], medicalRules: MedicalRuleSet, technicalRules: TechnicalRuleSet, userId: string) {
  try {
        if (!medicalRules.medicalRule || !technicalRules.technicalRule) {
            throw new Error('No active rule sets found in the database. Please upload rule files.');
        }
        
    // Run validation
    const validationResult = validateClaims(claims, medicalRules.medicalRule, technicalRules.technicalRule);

    // Log validation results
    addToAuditLog({
      action: 'Claims Validated',
      timestamp: new Date().toISOString(),
      details: `Processed ${claims.length} claims`,
      userId,
    })
        const aiRecommendation = await explainAndRecommendAction({
          claimData: validationResult.results.map((claim) => ({...claim, claimNumber: claim.claimNumber ?? 'NA'})),
          adjudicationRules: JSON.stringify({...medicalRules, ...technicalRules}),
        });
        return {
          ...validationResult,
          aiRecommendation
        };
      } catch (error) {
        console.error(`Error validating claims:`, error);
        // Keep the static explanation as a fallback
      }
}


export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { mode } = await request.json();

    if (!mode) {
      return NextResponse.json({ success: false, error: 'Missing validation mode.' }, { status: 400 });
    }

    const claims = await prisma.claim.findMany({ where: { ownerId: userId } });

    if (!claims || claims.length === 0) {
        return NextResponse.json({ success: false, error: 'No claims found for this user. Please upload a claims file.'}, { status: 404 });
    }

    addToAuditLog({
      action: `Validation Started (${mode})`,
      timestamp: new Date().toISOString(),
      details: `Starting validation for ${claims.length} claims.`,
      userId,
    });

    const { medicalRules, technicalRules } = await getActiveRulesFromDb(userId);
    const claimsData = claims.map((claim) => ({...claim, serviceDate: claim.serviceDate.toISOString(), createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
      approvalNumber: claim.approvalNumber ?? 'NA',
      validationResult: claim.validationResult as unknown as ValidationResult | undefined
    }));

    let processedClaims;
    if (mode === 'llm') {
        processedClaims = await processLLMValidation(claimsData, medicalRules, technicalRules, userId);
    } else {
        processedClaims = await processRuleBasedValidation(claimsData, medicalRules, technicalRules, userId);
    }

    try {
      if (processedClaims && processedClaims.results.length > 0) {

      for (const claim of processedClaims.results) {
        // Convert date strings to Date objects for any date fields
    const processedData = Object.entries(claim).reduce(
      (acc, [key, value]) => {
        // Handle date fields
        if (
          typeof value === "string" &&
          (key.includes("Date") ||
            key.includes("date") ||
            key === "createdDate" ||
            key === "updatedDate" ||
            key === "lastUpdated")
        ) {
          acc[key] = value ? new Date(value) : null;
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>
    );
        await prisma.claim.update({
          where: { claimId: claim.id },
          data: processedData
          //   status: claim.status as ClaimStatus,
          //   errorType: claim.errorType,
          //   rawErrors: claim.errors || [],
          //   errorExplanation: claim.explanation,
          //   recommendedAction: claim.recommendedAction,
          // },
        });
      }
      addToAuditLog({
        action: 'Claims Persisted',
        timestamp: new Date().toISOString(),
        details: `Successfully updated ${processedClaims.results.length} claims in the database.`,
        userId,
      });
    }
    } catch (dbError: any) {
      console.error('Failed to save claims to database:', dbError);
      addToAuditLog({
        action: 'Claims Persistence Failed',
        timestamp: new Date().toISOString(),
        details: `Error saving claims to the database: ${dbError.message}`,
        userId,
      });
      // We don't re-throw the error, as the validation itself was successful.
      // The user should still see the results, but be aware of the persistence failure.
    }

    addToAuditLog({
      action: `Validation Completed (${mode})`,
      timestamp: new Date().toISOString(),
      details: `Successfully validated ${claims.length} claims.`,
      userId,
    });
    
    return NextResponse.json({ success: true, data: processedClaims });

  } catch (error: any) {
    console.error('Validation failed:', error);
    addToAuditLog({
      action: 'Validation Failed',
      timestamp: new Date().toISOString(),
      details: `An unexpected error occurred during validation: ${error.message}`,
      userId,
    });
    return NextResponse.json({ success: false, error: `An unexpected error occurred during validation: ${error.message}` }, { status: 500 });
  }
}
