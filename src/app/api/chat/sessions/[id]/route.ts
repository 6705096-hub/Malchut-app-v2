import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const userId = (session as any).user?.id || 'unknown';
  const { id } = params;

  try {
    const chatSession = await prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!chatSession) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Format messages for Vercel AI SDK
    const formattedMessages = chatSession.messages.map(m => {
      const msg: any = {
        id: m.id,
        role: m.role,
        content: m.content || '',
      };
      
      if (m.toolCalls && Array.isArray(m.toolCalls) && m.toolCalls.length > 0) {
         // Vercel AI SDK expects toolInvocations array for rendering
         // In reality, it's complex, but we can pass it as toolInvocations
         msg.toolInvocations = m.toolCalls;
      }
      return msg;
    });

    return NextResponse.json({
      id: chatSession.id,
      title: chatSession.title,
      messages: formattedMessages,
      updatedAt: chatSession.updatedAt.getTime()
    });
    
  } catch (error: any) {
    console.error('Error fetching chat session details:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
