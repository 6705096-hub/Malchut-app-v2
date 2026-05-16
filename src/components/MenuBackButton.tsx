'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MenuBackButton() {
  const router = useRouter()
  
  return (
    <button onClick={() => router.back()} className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0">
      <ArrowRight className="w-6 h-6" />
    </button>
  )
}
