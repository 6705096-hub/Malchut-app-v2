import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN';
}

// POST /api/recycle-bin/restore
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { type, id } = await req.json();

  if (type === 'customer') {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (customer) {
      const originalPhone = customer.phone.split('_DEL_')[0];
      
      // Check if original phone is already taken by an active customer
      const existingActive = await prisma.customer.findUnique({
        where: { phone: originalPhone }
      });
      
      if (existingActive) {
        return NextResponse.json({ error: 'לא ניתן לשחזר את הלקוח מכיוון שמספר הטלפון שלו נמצא כבר בשימוש על ידי לקוח פעיל אחר.' }, { status: 409 });
      }

      await prisma.customer.update({
        where: { id },
        data: { deletedAt: null, deletedBy: null, phone: originalPhone },
      });
    }
  } else if (type === 'order') {
    await prisma.$transaction(async (tx) => {
      const orderToRestore = await tx.order.findUnique({ where: { id } })
      if (orderToRestore) {
        await tx.order.update({
          where: { id },
          data: { deletedAt: null, deletedBy: null },
        });
        const updatedCustomer = await tx.customer.update({
          where: { id: orderToRestore.customerId },
          data: { debt: { increment: orderToRestore.totalPrice } }
        });
        const { syncCustomerOrderPayments } = await import('@/lib/payments')
        await syncCustomerOrderPayments(orderToRestore.customerId, tx, updatedCustomer)
      }
    })
  } else if (type === 'product') {
    await prisma.product.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
