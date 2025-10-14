import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { addToAuditLog } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import type { ClaimRecord } from '@/lib/types';
import { parseClaimsExcel } from '@/lib/claims-excel-parser';

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

    // Since this is a general ingest, we assume it's for claims. Rules have their own endpoints.
    const { claims } = await parseClaimsExcel(file);

    // Batch create claims
    const claimData = claims.map((claim: ClaimRecord) => ({
      claim_id: claim.claim_id,
      encounter_type: claim.encounter_type,
      service_date: new Date(claim.service_date),
      national_id: claim.national_id,
      member_id: claim.member_id,
      facility_id: claim.facility_id,
      unique_id: claim.unique_id,
      diagnosis_codes: claim.diagnosis_codes,
      service_code: claim.service_code,
      paid_amount_aed: claim.paid_amount_aed,
      approval_number: claim.approval_number,
      // Default values to be updated by validation
      status: 'Pending',
      error_type: 'No error',
      ownerId: userId,
    }));
    
    // Using transaction to delete old claims and add new ones
    await prisma.$transaction([
      prisma.claim.deleteMany({ where: { ownerId: userId } }),
      prisma.claim.createMany({ data: claimData, skipDuplicates: true }),
    ]);

    addToAuditLog({
      action: 'Claims Ingested',
      timestamp: new Date().toISOString(),
      details: `Successfully parsed and saved ${claims.length} claims from ${file.name}.`,
      userId,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${claims.length} claims from ${file.name}.`,
    });
  } catch (error: any) {
    console.error('File ingestion failed:', error);
    addToAuditLog({
      action: 'File Ingestion Failed',
      timestamp: new  Date().toISOString(),
      details: `Error during file ingestion: ${error.message}`,
      userId,
    });
    return NextResponse.json(
      { success: false, error: error.message || 'File ingestion failed.' },
      { status: 500 }
    );
  }
}
