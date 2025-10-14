import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { parseTechnicalRulesFromPdf } from '@/lib/technical-parser';
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

    const rules = await parseTechnicalRulesFromPdf(file);
    const ruleSetName = file.name;

    await prisma.$transaction(async (tx) => {
      // Deactivate all other rule sets for this user
      await tx.technicalRuleSet.updateMany({
        where: { ownerId: userId, isActive: true },
        data: { isActive: false },
      });

      // Create the new active rule set
      await tx.technicalRuleSet.create({
        data: {
          name: ruleSetName,
          isActive: true,
          rawText: rules.rawText,
          ownerId: userId,
          serviceApprovals: {
            create: rules.structured.serviceApprovals
          },
          diagnosisApprovals: {
            create: rules.structured.diagnosisApprovals
          },
          thresholdRules: {
            create: rules.structured.thresholdRules
          },
          idFormatRules: {
            create: rules.structured.idFormatRules
          }
        },
      });
    });

    addToAuditLog({
      action: 'Technical Rules Ingested',
      timestamp: new Date().toISOString(),
      details: `Successfully parsed and saved technical rules from ${ruleSetName}. The rules are now active.`,
      userId,
    });

    return NextResponse.json({ success: true, message: 'Technical rules saved.', data: rules });

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
