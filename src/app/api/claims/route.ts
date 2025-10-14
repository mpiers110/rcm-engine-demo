import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const claims = await prisma.claim.findMany({ 
        where: { ownerId: userId },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: claims });
  } catch (error) {
    console.error('Failed to retrieve claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve claims.' },
      { status: 500 }
    );
  }
}
