import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ORDERS_MANAGER', 'KITCHEN_MANAGER'].includes((session.user as any)?.role || '')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { dateString, logs } = await req.json()
    // logs: { productId: string, quantityProduced: number }[]

    if (!dateString || !Array.isArray(logs)) {
      return new NextResponse('Bad Request', { status: 400 })
    }
    
    const userId = (session.user as any)?.id

    // Use a transaction
    await prisma.$transaction(async (tx) => {
      for (const log of logs) {
        if (typeof log.quantityProduced !== 'number') continue

        // Update inStock if provided
        if (typeof log.inStock === 'number') {
          await tx.product.update({
            where: { id: log.productId },
            data: { inStock: log.inStock }
          })
        }

        if (log.quantityProduced === 0) {
          try {
            await tx.productionLog.delete({
              where: {
                productId_dateString: {
                  productId: log.productId,
                  dateString: dateString
                }
              }
            })
          } catch (e) {
            // Ignore if it doesn't exist
          }
        } else {
          // Upsert with overwrite
          await tx.productionLog.upsert({
            where: {
              productId_dateString: {
                productId: log.productId,
                dateString: dateString
              }
            },
            create: {
              productId: log.productId,
              dateString: dateString,
              quantityProduced: log.quantityProduced,
              userId: userId
            },
            update: {
              quantityProduced: log.quantityProduced,
              userId: userId
            }
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving production log:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'ORDERS_MANAGER', 'KITCHEN_MANAGER'].includes((session.user as any)?.role || '')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { dateString, productId, quantityProduced } = await req.json()

    if (!dateString || !productId || typeof quantityProduced !== 'number') {
      return new NextResponse('Bad Request', { status: 400 })
    }
    
    const userId = (session.user as any)?.id

    // Overwrite the specific quantity for that date
    if (quantityProduced === 0) {
      try {
        await prisma.productionLog.delete({
          where: {
            productId_dateString: {
              productId,
              dateString
            }
          }
        })
      } catch (e) { } // Ignore if it doesn't exist
    } else {
      await prisma.productionLog.upsert({
        where: {
          productId_dateString: {
            productId,
            dateString
          }
        },
        create: {
          productId,
          dateString,
          quantityProduced,
          userId
        },
        update: {
          quantityProduced,
          userId
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating production log:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

