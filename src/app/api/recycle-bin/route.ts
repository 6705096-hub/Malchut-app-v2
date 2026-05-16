import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN';
}

// GET /api/recycle-bin – list soft-deleted customers and orders
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [customers, orders, products] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.order.findMany({
      where: { deletedAt: { not: null } },
      include: {
        customer: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' }
    })
  ]);

  return NextResponse.json({ customers, orders, products });
}
