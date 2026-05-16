import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfWeek, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get today's IL time
    const now = new Date();
    const ilDateStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
    const todayIL = new Date(ilDateStr);

    // Week boundaries calculation (Sunday-based)
    const currentWeekStart = startOfWeek(todayIL, { weekStartsOn: 0 });
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

    const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat'];
    const deliveryDayStr = daysArr[todayIL.getDay()];

    const updated = await prisma.order.updateMany({
      where: {
        deliveryWeek: weekStartStr,
        deliveryDay: deliveryDayStr,
        status: { in: ['PLANNED', 'PAID'] },
        deletedAt: null
      },
      data: {
        status: 'EXECUTED'
      }
    });

    console.log(`Auto-completed ${updated.count} orders for ${deliveryDayStr} (${weekStartStr})`);

    return NextResponse.json({ success: true, updatedCount: updated.count })
  } catch (error: any) {
    console.error('Auto-complete cron failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
