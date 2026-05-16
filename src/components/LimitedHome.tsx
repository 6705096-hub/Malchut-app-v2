'use client'

import Link from 'next/link'
import { Truck, MessageCircle, Bot, Map } from 'lucide-react'

type Card = {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
  gradient: string
  iconBg: string
}

type Props = {
  userName: string
  hasMyRoute: boolean
  hasChat: boolean
  hasAIChat: boolean
}

export function LimitedHome({ userName, hasMyRoute, hasChat, hasAIChat }: Props) {
  const firstName = userName?.split(' ')[0] || 'שלום'

  const cards: Card[] = [
    hasMyRoute && {
      href: '/kitchen/drivers/my-route',
      icon: <Truck className="w-8 h-8 text-white" />,
      title: 'המסלול שלי',
      subtitle: 'הזמנות מוקצות להיום',
      gradient: 'from-indigo-500 to-indigo-700',
      iconBg: 'bg-indigo-400/30',
    },
    hasChat && {
      href: '/menu',
      icon: <MessageCircle className="w-8 h-8 text-white" />,
      title: "צ'אט הצוות",
      subtitle: 'שיחה עם הצוות',
      gradient: 'from-emerald-500 to-emerald-700',
      iconBg: 'bg-emerald-400/30',
    },
    hasAIChat && {
      href: '/menu',
      icon: <Bot className="w-8 h-8 text-white" />,
      title: 'עוזר AI',
      subtitle: 'שאל שאלות על המערכת',
      gradient: 'from-violet-500 to-violet-700',
      iconBg: 'bg-violet-400/30',
    },
  ].filter(Boolean) as Card[]

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col px-5 pt-16 pb-10 gap-8">
      
      {/* Header greeting */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
          <Map className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-black text-gray-900">שלום, {firstName}!</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">מה תרצה לעשות היום?</p>
      </div>

      {/* Action cards */}
      <div className="flex flex-col gap-3">
        {cards.map((card) => (
          <Link
            key={card.href + card.title}
            href={card.href}
            className={`bg-gradient-to-l ${card.gradient} rounded-2xl p-5 flex items-center gap-4 shadow-md active:scale-[0.98] transition-transform`}
          >
            <div className={`${card.iconBg} rounded-xl p-2.5 shrink-0`}>
              {card.icon}
            </div>
            <div className="text-right">
              <div className="font-black text-white text-lg leading-tight">{card.title}</div>
              <div className="text-white/70 text-sm mt-0.5">{card.subtitle}</div>
            </div>
          </Link>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="font-bold">אין הרשאות מוגדרות כרגע</p>
          <p className="text-sm mt-1">פנה למנהל המערכת</p>
        </div>
      )}
    </div>
  )
}
