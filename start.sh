#!/bin/sh

echo "=== Starting Catering CMS ===" > startup.log
npx prisma db push --accept-data-loss >> startup.log 2>&1 || echo "WARNING: db push failed, server may not work correctly" >> startup.log

echo "Creating admin user..." >> startup.log
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
async function setup() {
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'admin@catering.com' },
      update: {},
      create: { email: 'admin@catering.com', password: hash, role: 'ADMIN', name: 'Admin' }
    });
    console.log('Admin user ready:', user.email);
    
    // Primary Google Admin Account
    const primaryAdmin = await prisma.user.upsert({
      where: { email: '6705096@gmail.com' },
      update: { role: 'ADMIN' },
      create: { email: '6705096@gmail.com', role: 'ADMIN', name: 'מנהל ראשי' }
    });
    console.log('Primary Google Admin ready:', primaryAdmin.email);
  } catch(e) {
    console.log('Admin setup error:', e.message);
  } finally {
    await prisma.\$disconnect();
  }
}
setup();
" >> startup.log 2>&1 || echo "Admin creation failed" >> startup.log

echo "=== Starting Next.js server ===" >> startup.log
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-3000}"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-generated-fallback-secret-for-railway-12345}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-https://malchut-app-production.up.railway.app}"

# ─── Background Cron Jobs ───────────────────────────────────────────────────
node -e "
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

// Helper: format date as YYYY-MM-DD
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

// Helper: get Sunday-based week start in YYYY-MM-DD
function getWeekStart(date) {
  const dayIndex = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dayIndex);
  start.setHours(0, 0, 0, 0);
  return formatDate(start);
}

// Helper: get current Israel time
function getILDate() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
}

// Create recurring orders for a specific deliveryDay + deliveryWeek
async function createRecurringOrdersForDay(prisma, deliveryDayStr, deliveryWeekStr) {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const createdById = admin ? admin.id : 'SYSTEM';

  const templates = await prisma.orderTemplate.findMany({
    where: { isActive: true, deliveryDay: deliveryDayStr },
    include: { items: true }
  });

  const validTemplates = templates.filter(t => !t.skippedWeeks.includes(deliveryWeekStr));
  let createdCount = 0;

  for (const t of validTemplates) {
    const existingOrder = await prisma.order.findFirst({
      where: { orderTemplateId: t.id, deliveryWeek: deliveryWeekStr, deletedAt: null }
    });
    if (existingOrder) continue;

    // requiresApproval=true  → PENDING_APPROVAL (waits for manual confirmation)
    // requiresApproval=false → PLANNED (auto)
    const orderStatus = t.requiresApproval ? 'PENDING_APPROVAL' : 'PLANNED';

    await prisma.\$transaction(async (tx) => {
      await tx.order.create({
        data: {
          customerId: t.customerId,
          createdById,
          orderTemplateId: t.id,
          deliveryDay: t.deliveryDay,
          deliveryWeek: deliveryWeekStr,
          address: t.address || '',
          city: t.city || '',
          deliveryAreaId: t.deliveryAreaId,
          notes: t.notes || '',
          status: orderStatus,
          totalPrice: t.totalPrice,
          items: {
            create: t.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              variant: item.variant
            }))
          }
        }
      });
      // Only add to customer debt for auto-approved orders
      if (!t.requiresApproval) {
        await tx.customer.update({
          where: { id: t.customerId },
          data: { debt: { increment: t.totalPrice } }
        });
      }
    });
    createdCount++;
  }
  return createdCount;
}

// ─── JOB 1: Auto-complete orders at 22:00 IL (19:00 UTC) ───────────────────
// Marks all PLANNED/PAID orders of today as EXECUTED
cron.schedule('0 19 * * *', async () => {
  const prisma = new PrismaClient();
  try {
    const todayIL = getILDate();
    const dayIndex = todayIL.getDay();
    const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat'];
    const deliveryDayStr = daysArr[dayIndex];
    const weekStartStr = getWeekStart(todayIL);

    const result = await prisma.order.updateMany({
      where: {
        deliveryWeek: weekStartStr,
        deliveryDay: deliveryDayStr,
        status: { in: ['PLANNED', 'PAID'] },
        deletedAt: null
      },
      data: { status: 'EXECUTED' }
    });
    console.log('[CRON] Auto-completed ' + result.count + ' orders for ' + deliveryDayStr + ' (' + weekStartStr + ')');
  } catch(e) {
    console.error('[CRON] Auto-complete error:', e.message);
  } finally {
    await prisma.\$disconnect();
  }
}, { timezone: 'UTC' });

// ─── JOB 2: Generate recurring orders at 08:00 IL (05:00 UTC) daily ────────
// Creates orders 2 days before delivery. Shabbat is always created on Wednesday (3 days ahead).
// On Thursday (+2 = Shabbat), skips since Shabbat was already handled on Wednesday.
cron.schedule('0 5 * * *', async () => {
  const prisma = new PrismaClient();
  try {
    const todayIL = getILDate();
    const todayDayIndex = todayIL.getDay(); // 0=Sun...6=Sat
    const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat'];
    let totalCreated = 0;

    // Target day: today + 2
    const targetDate = new Date(todayIL);
    targetDate.setDate(todayIL.getDate() + 2);
    const targetDayIndex = targetDate.getDay();
    const targetDayStr = daysArr[targetDayIndex];
    const targetWeekStr = getWeekStart(targetDate);

    // Thursday: +2 = Shabbat, but Shabbat was already done on Wednesday — skip
    if (todayDayIndex === 4 && targetDayIndex === 6) {
      console.log('[CRON] Thursday: Shabbat already handled on Wednesday, skipping');
    } else {
      const n = await createRecurringOrdersForDay(prisma, targetDayStr, targetWeekStr);
      totalCreated += n;
      if (n > 0) console.log('[CRON] +' + n + ' orders for ' + targetDayStr + ' (' + targetWeekStr + ')');
    }

    // Wednesday special: also create Shabbat orders (+3 days = Saturday)
    if (todayDayIndex === 3) {
      const shabbatDate = new Date(todayIL);
      shabbatDate.setDate(todayIL.getDate() + 3);
      const shabbatWeekStr = getWeekStart(shabbatDate);
      const n = await createRecurringOrdersForDay(prisma, 'Shabbat', shabbatWeekStr);
      totalCreated += n;
      if (n > 0) console.log('[CRON] +' + n + ' Shabbat orders (' + shabbatWeekStr + ')');
    }

    if (totalCreated === 0) console.log('[CRON] Recurring: no new orders needed today');
  } catch(e) {
    console.error('[CRON] Recurring orders error:', e.message);
  } finally {
    await prisma.\$disconnect();
  }
}, { timezone: 'UTC' });

console.log('[CRON] Started: auto-complete@22:00IL | recurring@08:00IL-daily(2-days-ahead, Shabbat-on-Wednesday)');
" &

exec npx next start
