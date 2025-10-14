import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { staticValidateClaims } from '@/lib/validation-logic';
import { explainAndRecommendAction, validateClaimLLM } from '@/ai/flows';
import type { Claim, ClaimRecord } from '@/lib/types';
import { addToAuditLog } from '@/lib/audit-log';
import type { RuleSet } from '@/lib/pdf-parser';
import type { TechnicalRuleSet } from '@/lib/technical-parser';
import { prisma } from '@/lib/prisma';


async function getActiveRulesFromDb(userId: string): Promise<{ medicalRules: RuleSet, technicalRules: TechnicalRuleSet }> {

    const activeMedicalRuleSet = await prisma.medicalRuleSet.findFirst({
        where: { ownerId: userId, isActive: true },
        include: {
            encounterRules: true,
            facilityRules: true,
            diagnosisRules: true,
            exclusionRules: true,
        },
    });

    const activeTechnicalRuleSet = await prisma.technicalRuleSet.findFirst({
        where: { ownerId: userId, isActive: true },
        include: {
            serviceApprovals: true,
            diagnosisApprovals: true,
            thresholdRules: true,
            idFormatRules: true,
        },
    });

    if (!activeMedicalRuleSet || !activeTechnicalRuleSet) {
        throw new Error('No active rule sets found in the database. Please upload rule files.');
    }
    
    // Reconstruct the RuleSet shape expected by the validation engine
    const medicalRules: RuleSet = {
        rawText: activeMedicalRuleSet.rawText,
        sections: {}, // Sections are not stored in DB, rawText is available if needed
        structured: {
            encounterRules: activeMedicalRuleSet.encounterRules,
            facilityRules: activeMedicalRuleSet.facilityRules.reduce((acc, rule) => {
                acc[rule.facilityType] = rule.services;
                return acc;
            }, {} as Record<string, string[]>),
            diagnosisRules: activeMedicalRuleSet.diagnosisRules,
            exclusionRules: activeMedicalRuleSet.exclusionRules,
        }
    };
    
    const technicalRules: TechnicalRuleSet = {
        rawText: activeTechnicalRuleSet.rawText,
        sections: {},
        structured: {
            serviceApprovals: activeTechnicalRuleSet.serviceApprovals,
            diagnosisApprovals: activeTechnicalRuleSet.diagnosisApprovals,
            thresholdRules: activeTechnicalRuleSet.thresholdRules,
            idFormatRules: activeTechnicalRuleSet.idFormatRules,
        }
    };
    
    return { medicalRules, technicalRules };
}


async function processRuleBasedValidation(claims: ClaimRecord[], medicalRules: RuleSet, technicalRules: TechnicalRuleSet): Promise<Claim[]> {
  const validationResults = staticValidateClaims(claims, medicalRules, technicalRules);

  const processedClaims: Claim[] = [];
  for (const result of validationResults) {
    const originalClaim = claims.find(c => c.claim_id === result.claim_id);
    if (!originalClaim) continue;

    let processedClaim: Claim = { 
        ...(originalClaim as unknown as Claim),
        status: result.status,
        error_type: result.error_type,
        raw_errors: result.errors.map(e => e.message),
        error_explanation: result.explanation.join(' '),
        recommended_action: result.recommended_action.join(' ')
    };

    if (result.status === 'Not validated') {
      try {
        const aiResponse = await explainAndRecommendAction({
          claimData: JSON.stringify(originalClaim),
          errorType: result.error_type,
          adjudicationRules: `Violations: ${result.errors.map(e => e.message).join(', ')}`,
        });
        processedClaim.error_explanation = aiResponse.errorExplanation;
        processedClaim.recommended_action = aiResponse.recommendedAction;
      } catch (aiError) {
        console.error(`AI explanation failed for claim ${result.claim_id}:`, aiError);
        // Keep the static explanation as a fallback
      }
    }
    processedClaims.push(processedClaim);
  }
  return processedClaims;
}

async function processLLMValidation(claims: ClaimRecord[], medicalRules: RuleSet, technicalRules: TechnicalRuleSet): Promise<Claim[]> {
    const processedClaims: Claim[] = [];
    for (const claim of claims) {
      let processedClaim: Claim = { ...(claim as unknown as Claim) };
      try {
        const validationResult = await validateClaimLLM({
          claimData: JSON.stringify(claim),
          medicalRules: medicalRules.rawText,
          technicalRules: technicalRules.rawText,
        });

        processedClaim.raw_errors = validationResult.errors;

        if (!validationResult.isValid) {
          processedClaim.status = 'Not validated';
          processedClaim.error_type = validationResult.errorType;

          const aiExplanationResponse = await explainAndRecommendAction({
            claimData: JSON.stringify(claim),
            errorType: validationResult.errorType,
            adjudicationRules: `Technical Rules:\n${technicalRules.rawText}\n\nMedical Rules:\n${medicalRules.rawText}`,
          });

          processedClaim.error_explanation = aiExplanationResponse.errorExplanation;
          processedClaim.recommended_action = aiExplanationResponse.recommendedAction;
        } else {
          processedClaim.status = 'Validated';
          processedClaim.error_type = 'No error';
          processedClaim.error_explanation = '';
          processedClaim.recommended_action = '';
        }
      } catch (llmError) {
         console.error(`LLM validation failed for claim ${claim.claim_id}:`, llmError);
         processedClaim.status = 'Not validated';
         processedClaim.error_type = 'Technical error';
         processedClaim.raw_errors = ['LLM validation failed.'];
         processedClaim.error_explanation = 'AI-powered validation is currently unavailable.';
         processedClaim.recommended_action = 'Manually review claim. Please try again later.';
      }
      processedClaims.push(processedClaim);
    }
    return processedClaims;
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

    let processedClaims: Claim[];
    if (mode === 'llm') {
        processedClaims = await processLLMValidation(claims, medicalRules, technicalRules);
    } else {
        processedClaims = await processRuleBasedValidation(claims, medicalRules, technicalRules);
    }

    try {
      for (const claim of processedClaims) {
        await prisma.claim.update({
          where: { claim_id: claim.claim_id },
          data: {
            status: claim.status,
            error_type: claim.error_type,
            raw_errors: claim.raw_errors || [],
            error_explanation: claim.error_explanation,
            recommended_action: claim.recommended_action,
          },
        });
      }
      addToAuditLog({
        action: 'Claims Persisted',
        timestamp: new Date().toISOString(),
        details: `Successfully updated ${processedClaims.length} claims in the database.`,
        userId,
      });
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
      details: `Successfully validated ${claims.length} claims. Found ${processedClaims.filter(c => c.status === 'Not validated').length} errors.`,
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
