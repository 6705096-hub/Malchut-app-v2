import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import CustomerTypesClient from "./CustomerTypesClient"

export const metadata = {
  title: 'סוגי לקוחות | Catering CMS',
}

export default async function CustomerTypesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // Only Admin or Editor can access
  if (session.user.role === 'PENDING' || session.user.role === 'VIEWER') {
    redirect('/dashboard')
  }

  const [customerTypes, products] = await Promise.all([
    prisma.customerType.findMany({
      include: {
        prices: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
  ])

  return <CustomerTypesClient initialTypes={customerTypes} products={products} isAdmin={session.user.role === 'ADMIN'} />
}
