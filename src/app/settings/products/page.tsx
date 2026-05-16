import prisma from '@/lib/prisma'
import { ProductManager } from '@/components/ProductManager'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'

export const dynamic = 'force-dynamic'

export default async function ProductsSettingsPage() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  })

  return (
    <div className="h-full flex flex-col pt-2 pb-20">
      <ProductManager initialProducts={products} />
    </div>
  )
}
