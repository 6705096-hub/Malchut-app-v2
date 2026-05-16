import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { subWeeks, differenceInHours } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const weekDateStr = searchParams.get('weekDate')
    if (!weekDateStr) return NextResponse.json({ error: 'weekDate required' }, { status: 400 })

    const targetDate = new Date(weekDateStr + 'T12:00:00Z')
    const now = new Date()
    
    // How many hours from "now" until the target Saturday noon?
    const hoursToTarget = Math.max(0, differenceInHours(targetDate, now))

    // Fetch vehicles and their areas for this week
    const vehicles = await prisma.vehicleRun.findMany({
      where: { weekDate: weekDateStr },
      include: { areas: true }
    })

    const predictionsByVehicle: Record<string, Record<string, { recommendedLoad: number, spare: number }>> = {}

    for (const vehicle of vehicles) {
      const areaIds = vehicle.areas.map(a => a.deliveryAreaId)
      if (areaIds.length === 0) continue
      
      predictionsByVehicle[vehicle.id] = {}

      // 1. Current Orders for these areas
      const currentOrders = await prisma.order.findMany({
        where: {
          deletedAt: null,
          deliveryAreaId: { in: areaIds },
          deliveryDay: { in: ['Shabbat', 'שבת', 'Friday', 'שישי'] },
          createdAt: { lte: now } // created up to now
        },
        include: { items: true }
      })

      const currentTotals: Record<string, number> = {}
      for (const order of currentOrders) {
        // filter out orders that belong to NEXT week (simplification: we assume orders without special logic are for the nearest weekend)
        for (const item of order.items) {
          currentTotals[item.productId] = (currentTotals[item.productId] || 0) + item.quantity
        }
      }

      // 2. Look at past 4 weeks to see "late orders" (orders placed within `hoursToTarget` of Saturday noon)
      const pastWeeksLateOrders: Record<string, number[]> = {}

      for (let i = 1; i <= 4; i++) {
        const pastSat = subWeeks(targetDate, i)
        const pastCutoff = new Date(pastSat.getTime() - hoursToTarget * 60 * 60 * 1000)

        const pastOrders = await prisma.order.findMany({
          where: {
            deletedAt: null,
            deliveryAreaId: { in: areaIds },
            deliveryDay: { in: ['Shabbat', 'שבת', 'Friday', 'שישי'] },
            // Simplistic way to match orders for THAT week:
            // Assuming orders for a weekend are created in the 6 days prior
            createdAt: { 
              gte: new Date(pastSat.getTime() - 7 * 24 * 60 * 60 * 1000),
              lte: pastSat 
            }
          },
          include: { items: true }
        })

        const productLateTotals: Record<string, number> = {}
        
        for (const order of pastOrders) {
          // If the order was created AFTER the cutoff (i.e. late), it contributes to late orders
          if (order.createdAt > pastCutoff) {
             for (const item of order.items) {
               productLateTotals[item.productId] = (productLateTotals[item.productId] || 0) + item.quantity
             }
          }
        }

        for (const pid of Object.keys(currentTotals)) {
          if (!pastWeeksLateOrders[pid]) pastWeeksLateOrders[pid] = []
          pastWeeksLateOrders[pid].push(productLateTotals[pid] || 0)
        }
      }

      // 3. Calculate Prediction
      for (const pid of Object.keys(currentTotals)) {
        const currentQty = currentTotals[pid]
        const lateHistory = pastWeeksLateOrders[pid] || []
        
        const avgLate = lateHistory.length > 0 
          ? lateHistory.reduce((a, b) => a + b, 0) / lateHistory.length 
          : 0

        // Predicted final demand = what we have now + what usually comes later
        const predictedFinal = currentQty + avgLate
        
        // Add a spare logic (e.g. 5% or min 2 items, + dynamically adjust if variance is high)
        // If variance between past weeks is high, add more spare. We'll use a simple 10% or +3 for now as "Adaptive Spare"
        const spare = Math.max(2, Math.ceil(predictedFinal * 0.05))
        
        const recommendedLoad = Math.ceil(predictedFinal + spare)

        // Only add if we actually have some orders or predictions
        if (recommendedLoad > 0) {
          predictionsByVehicle[vehicle.id][pid] = {
            recommendedLoad,
            spare
          }
        }
      }
    }

    return NextResponse.json({ predictions: predictionsByVehicle })
  } catch (err: any) {
    console.error('GET /api/drivers/vehicles/prediction error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
