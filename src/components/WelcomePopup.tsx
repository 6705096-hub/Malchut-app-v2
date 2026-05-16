'use client'

import { useState, useEffect } from 'react'
import { PartyPopper, CircleCheck } from 'lucide-react'

export function WelcomePopup({ role }: { role: string }) {
  const [show, setShow] = useState(false)
  const [isReturning, setIsReturning] = useState(false)

  useEffect(() => {
    // Only show for non-pending users
    if (role === 'PENDING') return

    const hasSeen = localStorage.getItem('sawApprovalWelcome')
    if (!hasSeen) {
      setShow(true)
      const returning = localStorage.getItem('isReturningUser') === 'true'
      setIsReturning(returning)
    }
  }, [role])

  const handleClose = () => {
    setShow(false)
    localStorage.setItem('sawApprovalWelcome', 'true')
    localStorage.setItem('isReturningUser', 'true')
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white max-w-sm w-full rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-500 delay-150">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <PartyPopper className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          {isReturning ? 'ברוכים השבים! 👋' : 'ברוכים הבאים!'}
        </h2>
        <p className="text-gray-500 font-medium mb-8 leading-relaxed">
          {isReturning 
            ? 'שמחים לראות אותך שוב איתנו במערכת מלכות קוגל. החשבון שלך מחובר בהצלחה עם הרשאות הגישה שלך.'
            : 'שמחים לראות אותך איתנו במערכת מלכות קוגל. החשבון שלך מחובר בהצלחה עם הרשאות הגישה שלך.'}
        </p>
        <button
          onClick={handleClose}
          className="w-full py-4 bg-green-500 hover:bg-green-600 active:scale-95 transition-all text-white font-black text-lg rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
        >
          <CircleCheck className="w-5 h-5" />
          הבנתי, תודה!
        </button>
      </div>
    </div>
  )
}
