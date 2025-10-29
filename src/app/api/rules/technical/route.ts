import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { addToAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await request.json()
    
    const {
      title,
      framing,
      serviceApprovals,
      diagnosisApprovals,
      paidAmountThreshold,
      idFormattingRules
    } = body
    

    const result = await prisma.$transaction(async (tx) => {
      // Deactivate all other rule sets for this user
      await tx.ruleSet.updateMany({
        where: { ownerId: userId, isActive: true, type: 'TECHNICAL' },
        data: { isActive: false },
      });

      // Create the new active rule set
      const newRuleSet = await tx.ruleSet.create({
      data: {
        title,
        framing,
        ownerId: userId,
        type: 'TECHNICAL',
        technicalRule: {
          create: {
            serviceApprovals: {
              create: serviceApprovals.map((service: any) => ({
                serviceID: service.serviceID,
                description: service.description,
                approvalRequired: service.approvalRequired
              }))
            },
            diagnosisApprovals: {
              create: diagnosisApprovals.map((diagnosis: any) => ({
                code: diagnosis.code,
                diagnosis: diagnosis.diagnosis,
                approvalRequired: diagnosis.approvalRequired
              }))
            },
            paidAmountThreshold: {
              create: {
                threshold: paidAmountThreshold.threshold,
                description: paidAmountThreshold.description
              }
            },
            idFormattingRules: {
              create: {
                idFormat: idFormattingRules.idFormat,
                uniqueIdStructure: idFormattingRules.uniqueIdStructure,
                requirements: idFormattingRules.requirements
              }
            }
          }
        }
      },
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
    })
      return newRuleSet;
    });

    addToAuditLog({
      action: 'Technical Rules Ingested',
      timestamp: new Date().toISOString(),
      details: `Successfully parsed and saved technical rules from ${title}. The rules are now active.`,
      userId,
    });

    return NextResponse.json({ success: true, message: 'Technical rules saved.', rule: result.id }, { status: 200 });

  } catch (error: any) {
    console.error('Technical rules ingestion failed:', error);
    addToAuditLog({
      action: 'Technical Rules Ingestion Failed',
      timestamp: new Date().toISOString(),
      details: `Error processing technical rules file: ${error.message}`,
      userId,
    });
    return NextResponse.json({ success: false, error: error.message || 'Failed to process file.' }, { status: 500 });
  }
}

// GET - Get all technical rules for an owner
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get('ownerId')

    if (!ownerId) {
      return NextResponse.json(
        { error: 'ownerId is required' },
        { status: 400 }
      )
    }

    const technicalRules = await prisma.ruleSet.findMany({
      where: {
        ownerId,
        type: 'TECHNICAL'
      },
      include: {
        technicalRule: {
          include: {
            serviceApprovals: true,
            diagnosisApprovals: true,
            paidAmountThreshold: true,
            idFormattingRules: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({rules: technicalRules[0]}, { status: 200 })
  } catch (error) {
    console.error('Error fetching technical rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch technical rules' },
      { status: 500 }
    )
  }
}