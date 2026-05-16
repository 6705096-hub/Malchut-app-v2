import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { TopBar } from '@/components/TopBar'
import { redirect } from 'next/navigation'

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center print:bg-white print:block">
      <div id="kitchen-layout-wrapper" className="w-full max-w-md bg-white min-h-screen shadow-2xl relative pb-6 print:max-w-none print:shadow-none print:pb-0">
        <div id="kitchen-layout-topbar" className="print:hidden">
           <TopBar />
        </div>
        <main className="p-6 print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
