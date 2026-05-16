import { getServerSession } from "next-auth/next"; import { authOptions } from "@/lib/auth"
import { TopBar } from '@/components/TopBar'
import { redirect } from 'next/navigation'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user as any)?.role !== 'ADMIN') {
    redirect('/dashboard') // Settings is Admin only
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative pb-6">
        <TopBar />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
