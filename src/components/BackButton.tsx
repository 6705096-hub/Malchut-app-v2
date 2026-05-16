'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900 shrink-0"
      title="חזור אחורה"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}

/**
 * A standardized page header bar used on every inner page.
 * Layout (RTL):  [ Title text ...........  ← back ]
 *
 * Usage:  <PageHeader title="הזנת ייצור" />
 * With extra actions:  <PageHeader title="..."><SomeButton /></PageHeader>
 */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  const router = useRouter()
  return (
    <div className="flex items-center justify-between w-full gap-3">
      {/* Title side (right in RTL) */}
      <div className="min-w-0">
        <h1 className="text-[22px] font-black text-gray-900 tracking-tight leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Actions + back button (left in RTL) */}
      <div className="flex items-center gap-2 shrink-0">
        {children}
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
          title="חזור אחורה"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
