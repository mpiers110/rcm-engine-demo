import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAuditLog } from '@/lib/audit-log';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const logs = await getAuditLog(userId);
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('Failed to retrieve audit log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve audit log.' },
      { status: 500 }
    );
  }
}
