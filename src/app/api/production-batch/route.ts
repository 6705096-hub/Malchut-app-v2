import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// PATCH /api/production-batch
// Updates or creates a ProductionBatch record for a specific product and date
export async function PATCH(request: Request) {
  try {
    const { productId, targetDateString, producedQuantity } = await request.json()

    if (!productId || !targetDateString || typeof producedQuantity !== 'number') {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const batch = await prisma.productionBatch.upsert({
      where: {
        productId_targetDateString: {
          productId,
          targetDateString
        }
      },
      update: {
        producedQuantity: Math.max(0, producedQuantity)
      },
      create: {
        productId,
        targetDateString,
        producedQuantity: Math.max(0, producedQuantity)
      }
    })

    return NextResponse.json({ success: true, batch })
  } catch (error: any) {
    console.error('Failed to update production batch:', error)
    return NextResponse.json({ success: false, error: 'Failed to update production batch' }, { status: 500 })
  }
}

// GET /api/production-batch
// Fetches all ProductionBatch records for a specific date
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetDateString = searchParams.get('targetDateString')

    if (!targetDateString) {
      return NextResponse.json({ success: false, error: 'targetDateString is required' }, { status: 400 })
    }

    const batches = await prisma.productionBatch.findMany({
      where: { targetDateString }
    })

    return NextResponse.json({ success: true, batches })
  } catch (error: any) {
    console.error('Failed to fetch production batches:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch production batches' }, { status: 500 })
  }
}
