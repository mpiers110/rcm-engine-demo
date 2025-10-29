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
      encounterTypes,
      facilityTypes,
      facilityRegistry,
      diagnosisRequirements,
      mutuallyExclusive
    } = body

    const result = await prisma.$transaction(async (tx) => {
      // Deactivate all other rule sets for this user
      await tx.ruleSet.updateMany({
        where: { ownerId: userId, isActive: true, type: 'MEDICAL' },
        data: { isActive: false },
      });

      // Create the new active rule set and return the result
      const newRuleSet = await tx.ruleSet.create({
        data: {
          title,
          framing,
          ownerId: userId, // Use the authenticated user's ID
          type: 'MEDICAL',
          isActive: true, // Ensure the new rule set is active
          medicalRule: {
            create: {
              encounterTypes: {
                create: encounterTypes?.map((encounter: any) => ({
                  code: encounter.code,
                  description: encounter.description
                })) || []
              },
              facilityTypes: {
                create: facilityTypes?.map((facilityType: any) => ({
                  facilityType: facilityType.facilityType,
                  allowedServices: facilityType.allowedServices
                })) || []
              },
              facilityRegistry: {
                create: facilityRegistry?.map((facility: any) => ({
                  facilityId: facility.id,
                  type: facility.type
                })) || []
              },
              diagnosisRequirements: {
                create: diagnosisRequirements?.map((req: any) => ({
                  diagnosisCode: req.diagnosisCode,
                  diagnosisName: req.diagnosisName,
                  serviceID: req.serviceID,
                  serviceName: req.serviceName
                })) || []
              },
              mutuallyExclusiveDiagnoses: {
                create: mutuallyExclusive?.map((exclusive: any) => ({
                  diagnosis1Code: exclusive.diagnosis1.code,
                  diagnosis1Name: exclusive.diagnosis1.name,
                  diagnosis2Code: exclusive.diagnosis2.code,
                  diagnosis2Name: exclusive.diagnosis2.name
                })) || []
              }
            }
          }
        },
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

      return newRuleSet;
    });

    addToAuditLog({
      action: 'Medical Rules Ingested',
      timestamp: new Date().toISOString(),
      details: `Successfully parsed and saved medical rules from ${title}. The rules are now active.`,
      userId,
    });

    return NextResponse.json({ success: true, message: 'Medical rules saved.', rule: result.id }, { status: 200 });

  } catch (error: any) {
    console.error('Medical rules ingestion failed:', error);
    addToAuditLog({
      action: 'Medical Rules Ingestion Failed',
      timestamp: new Date().toISOString(),
      details: `Error processing medical rules file: ${error.message}`,
      userId,
    });
    return NextResponse.json({ success: false, error: error.message || 'Failed to process file.' }, { status: 500 });
  }
}

// GET - Get all medical rules for an owner
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

    const medicalRules = await prisma.ruleSet.findMany({
      where: {
        ownerId,
        type: 'MEDICAL'
      },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(medicalRules)
  } catch (error) {
    console.error('Error fetching medical rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medical rules' },
      { status: 500 }
    )
  }
}