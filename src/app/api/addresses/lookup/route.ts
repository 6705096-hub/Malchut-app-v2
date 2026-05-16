import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const street = searchParams.get('street')

    if (!street) {
      return NextResponse.json({ error: 'Street parameter is required' }, { status: 400 })
    }

    // Clean up street string for matching (remove house numbers etc)
    // e.g. "רשבי 10" -> "רשבי"
    const normalizedStreet = street.split(/\d/)[0].trim()

    // Query finding the exact street match
    const savedAddress = await prisma.savedAddress.findUnique({
      where: {
        street: normalizedStreet
      }
    })

    if (!savedAddress) {
      return NextResponse.json({ city: null }) // Not found
    }

    return NextResponse.json({ 
      city: savedAddress.city,
      deliveryAreaId: savedAddress.deliveryAreaId 
    })
  } catch (error) {
    console.error('Error looking up address:', error)
    return NextResponse.json({ error: 'Failed to lookup address' }, { status: 500 })
  }
}
