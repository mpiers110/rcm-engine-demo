import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { addToAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { ExcelClaimInput, CreateClaimInput } from '@/types/claim';

export async function POST(request: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
    const body = await request.json();
    const { claims } = body;

    // Validate input
    if (!claims || !Array.isArray(claims) || claims.length === 0) {
      return NextResponse.json(
        { error: 'Claims data is required and must be a non-empty array' },
        { status: 400 }
      );
    }


    // upload claims data to database
    const claimsData = await prisma.claim.createManyAndReturn({
      data: claims.map((claim) => ({
        claimId: claim.claimId,
        encounterType: claim.encounter_type,
        serviceDate: new Date(claim.service_date),
        nationalId: claim.national_id,
        memberId: claim.member_id,
        facilityId: claim.facilityId,
        uniqueId: claim.unique_id,
        diagnosisCodes: [claim.diagnosis_codes],
        serviceCode: claim.service_code,
        paidAmount: claim.paid_amount_aed,
        approvalNumber: claim.approvalNumber,
        ownerId: userId
      })),
    })
    // Add to audit log
    addToAuditLog({
      action: 'Claims Batch Submitted',
      timestamp: new Date().toISOString(),
      details: `Processed ${claimsData.length} claims`,
      userId,
    });



    return NextResponse.json({
      success: true,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Validation API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Transform Excel data to our internal format
function transformExcelClaim(excelClaim: ExcelClaimInput): CreateClaimInput {
  // Parse service date from Excel format "MM/DD/YY" to Date object
  const [month, day, year] = excelClaim.service_date.split('/');
  const fullYear = `20${year}`; // Convert YY to YYYY
  const serviceDate = new Date(`${fullYear}-${month}-${day}`);
  
  // Parse diagnosis codes from semicolon-separated string to array
  const diagnosisCodes = excelClaim.diagnosis_codes 
    ? excelClaim.diagnosis_codes.split(';').map(code => code.trim())
    : [];
  
  // Convert paid amount to number
  const paidAmount = typeof excelClaim.paid_amount_aed === 'string' 
    ? parseFloat(excelClaim.paid_amount_aed) 
    : excelClaim.paid_amount_aed;

  return {
    encounterType: excelClaim.encounter_type,
    serviceDate: serviceDate,
    nationalId: excelClaim.national_id,
    memberId: excelClaim.member_id,
    facilityId: excelClaim.facility_id,
    uniqueId: excelClaim.unique_id,
    diagnosisCodes: diagnosisCodes,
    approvalNumber: excelClaim.approval_number,
    serviceCode: excelClaim.service_code,
    paidAmount: paidAmount
  };
}

// Generate unique claim number
function generateClaimNumber(index: number): string {
  const timestamp = new Date().getTime();
  return `CLM-${timestamp}-${String(index + 1).padStart(4, '0')}`;
}

// Utility function to validate claim (commented as requested)
async function validateClaim(
  claimData: CreateClaimInput,
  technicalRule: any,
  medicalRule: any
): Promise<any> {
  const validationResult = {
    isValid: true,
    requiresApproval: false,
    errors: [] as string[],
    warnings: [] as string[],
    approvalReasons: [] as string[],
    technicalValidation: {
      idFormatValid: true,
      idFormatErrors: [] as string[],
      serviceApprovalRequired: false,
      diagnosisApprovalRequired: false,
      amountApprovalRequired: false,
      approvedServices: [] as string[],
      approvedDiagnoses: [] as string[]
    },
    medicalValidation: {
      encounterTypeValid: true,
      facilityTypeValid: true,
      diagnosisRequirementsMet: true,
      noMutuallyExclusiveDiagnoses: true,
      mutuallyExclusiveErrors: [] as string[],
      facilityServiceErrors: [] as string[],
      diagnosisServiceErrors: [] as string[]
    }
  };

  // TODO: Implement validation logic based on your rules
  
  // Example placeholder validations:
  
  // Technical validations
  // if (claimData.paidAmount > technicalRule.technicalRule?.paidAmountThreshold?.threshold) {
  //   validationResult.requiresApproval = true;
  //   validationResult.technicalValidation.amountApprovalRequired = true;
  //   validationResult.approvalReasons.push(`Amount exceeds threshold: ${claimData.paidAmount} > ${technicalRule.technicalRule?.paidAmountThreshold?.threshold}`);
  // }
  
  // Check service approval requirements
  // const serviceApproval = technicalRule.technicalRule?.serviceApprovals?.find(
  //   (s: any) => s.serviceID === claimData.serviceCode
  // );
  // if (serviceApproval?.approvalRequired) {
  //   validationResult.requiresApproval = true;
  //   validationResult.technicalValidation.serviceApprovalRequired = true;
  //   validationResult.approvalReasons.push(`Service ${claimData.serviceCode} requires approval`);
  // }
  
  // Medical validations
  // Check if service is allowed for encounter type
  // Check if facility is authorized for service
  // Check diagnosis requirements
  // Check mutually exclusive diagnoses

  return validationResult;
}

// GET - Get claims for current user (supports filtering)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const serviceCode = searchParams.get('serviceCode');
    const facilityId = searchParams.get('facilityId');
    
    const skip = (page - 1) * limit;

    const whereClause: any = {
      ownerId: session.user.id
    };

    if (status) whereClause.status = status;
    if (serviceCode) whereClause.serviceCode = serviceCode;
    if (facilityId) whereClause.facilityId = facilityId;

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.claim.count({
        where: whereClause
      })
    ]);

    return NextResponse.json({
      data: claims,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching claims:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}