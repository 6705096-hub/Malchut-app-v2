import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const userId = (session as any).user?.id || 'unknown';

  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      }
    });
    
    // Map to timestamp for frontend compatibility
    const formatted = sessions.map(s => ({
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt.getTime()
    }));
    
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching chat sessions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
