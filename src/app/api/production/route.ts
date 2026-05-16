import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const targetDateString = searchParams.get('targetDateString')

    if (!targetDateString) {
      return NextResponse.json({ error: 'targetDateString is required' }, { status: 400 })
    }

    const batches = await prisma.productionBatch.findMany({
      where: { targetDateString }
    })

    const productionMap = batches.reduce((acc, batch) => {
      acc[batch.productId] = batch.producedQuantity
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({ productionMap })
  } catch (error) {
    console.error('Failed to fetch production batches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role === 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, targetDateString, producedQuantity } = await req.json()

    if (!productId || !targetDateString || producedQuantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const batch = await prisma.productionBatch.upsert({
      where: {
        productId_targetDateString: {
          productId,
          targetDateString
        }
      },
      update: {
        producedQuantity
      },
      create: {
        productId,
        targetDateString,
        producedQuantity
      }
    })

    return NextResponse.json({ batch }, { status: 200 })
  } catch (error) {
    console.error('Failed to update production batch:', error)
    return NextResponse.json({ error: 'Failed to update production batch' }, { status: 500 })
  }
}
