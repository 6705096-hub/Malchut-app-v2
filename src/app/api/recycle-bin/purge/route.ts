import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN';
}

// DELETE /api/recycle-bin/purge – permanently delete a soft-deleted item
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { type, id } = await req.json();

  if (type === 'customer') {
    await prisma.customer.delete({ where: { id } });
  } else if (type === 'order') {
    await prisma.order.delete({ where: { id } });
  } else if (type === 'product') {
    try {
      await prisma.product.delete({ where: { id } })
    } catch (error: any) {
      if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Cannot delete product permanently because it exists in past orders.' }, { status: 400 })
      }
      throw error;
    }
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
