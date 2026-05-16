import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN';
}

// DELETE /api/recycle-bin/empty – permanently delete ALL soft-deleted items
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Find all soft-deleted orders
      const deletedOrders = await tx.order.findMany({ where: { deletedAt: { not: null } } });
      const orderIds = deletedOrders.map(o => o.id);
      if (orderIds.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }

      // 2. Find all soft-deleted customers
      const deletedCustomers = await tx.customer.findMany({ where: { deletedAt: { not: null } } });
      const customerIds = deletedCustomers.map(c => c.id);
      if (customerIds.length > 0) {
        // Must delete their orders and items first because Prisma schema lacks cascading drops for customers
        await tx.orderItem.deleteMany({ where: { order: { customerId: { in: customerIds } } } });
        await tx.order.deleteMany({ where: { customerId: { in: customerIds } } });
        await tx.customer.deleteMany({ where: { id: { in: customerIds } } });
      }
    });

    // 3. Try to delete soft-deleted products (ignoring ones in use by non-deleted orders)
    const deletedProducts = await prisma.product.findMany({ where: { deletedAt: { not: null } } });
    for (const p of deletedProducts) {
       try { 
         await prisma.product.delete({ where: { id: p.id } }); 
       } catch (e) { 
         console.warn(`Could not empty product ${p.name} from recycle bin (likely linked to past orders).`);
       }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Empty recycle bin error:', error);
    return NextResponse.json({ error: 'Failed to empty recycle bin' }, { status: 500 });
  }
}
