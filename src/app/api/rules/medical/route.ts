import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { parseMedicalRulesFromPdf } from '@/lib/pdf-parser';
import { addToAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    const rules = await parseMedicalRulesFromPdf(file);
    const ruleSetName = file.name;

    await prisma.$transaction(async (tx) => {
      // Deactivate all other rule sets for this user
      await tx.medicalRuleSet.updateMany({
        where: { ownerId: userId, isActive: true },
        data: { isActive: false },
      });

      // Create the new active rule set
      await tx.medicalRuleSet.create({
        data: {
          name: ruleSetName,
          isActive: true,
          rawText: rules.rawText,
          ownerId: userId,
          encounterRules: {
            create: rules.structured.encounterRules.map(r => ({
              encounterType: r.encounterType,
              services: r.services
            }))
          },
          facilityRules: {
            create: Object.entries(rules.structured.facilityRules).map(([type, services]) => ({
              facilityType: type,
              services: services
            }))
          },
          diagnosisRules: {
            create: rules.structured.diagnosisRules
          },
          exclusionRules: {
            create: rules.structured.exclusionRules
          }
        },
      });
    });

    addToAuditLog({
      action: 'Medical Rules Ingested',
      timestamp: new Date().toISOString(),
      details: `Successfully parsed and saved medical rules from ${ruleSetName}. The rules are now active.`,
      userId,
    });

    return NextResponse.json({ success: true, message: 'Medical rules saved.', data: rules });

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
