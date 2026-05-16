'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Check, X } from 'lucide-react'

// Increment this version string for each new update!
export const CURRENT_APP_VERSION = 'v1.5.1'

const VERSIONS = [
  {
    version: 'v1.5.1',
    date: '22 באפריל 2026',
    items: [
      "עיצוב אלגנטי לאשף ההזמנות: הסרנו את כפתורי בחירת התאריך המגושמים והפכנו אותם לניווט חצים מינימלי, טיפוגרפי וקומפקטי.",
      "סידור תפריט הניווט: תיקון ההסתרה שבה הכפתורים הצפים של אשף ההזמנה העלימו את התפריט בגרסת המובייל.",
      "תיקון שמירת מחירון אישי נוקשה: פתרנו את באג חפיפת הטפסים - כעת שינויי מחיר אישי ללקוח נשמרים בהצלחה ומוחלים על הזמנות מיד."
    ]
  },
  {
    version: 'v1.5.0',
    date: '10 באפריל 2026',
    items: [
      "תמחור חכם: היררכיה חדשה למחירון אישי - מחיר מיוחד דורס אוטומטית שאר מבצעים.",
      "פרטיות בכתובות: סימול 'אל תשמור כתובת' בעת הזמנה תמחק את הישנה ולא תציף בזליגת מידע.",
      "מסך ייצור הותאם למגע: המקלדת כבר לא תיסגר אוטומטית כשמקלידים כמויות ברצף.",
      "ניקיון מסך הבקרה: הסרנו 'דילוג להיום' למראה נקי יותר."
    ]
  }
]

export function ChangelogModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-6 text-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-16 h-16 text-white" /></div>
          <h2 className="text-2xl font-black text-white mb-1">היסטוריית עדכונים</h2>
          <p className="text-blue-100 font-medium text-sm">מעקב אחר שינויים וחידושים במערכת מלכות</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          <div className="space-y-8">
            {VERSIONS.map((v, i) => (
              <div key={v.version} className="relative">
                {/* Timeline line */}
                {i !== VERSIONS.length - 1 && (
                  <div className="absolute top-8 bottom-[-2rem] right-3.5 w-[2px] bg-gray-100"></div>
                )}
                
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 z-10 border-4 border-gray-50/50">
                    v
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 leading-none">{v.version}</span>
                    <span className="text-[11px] text-gray-400 mt-0.5">{v.date}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 pr-10">
                  {v.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                      <span className="text-sm font-medium text-gray-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-100 shrink-0">

          <button 
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-3 rounded-xl shadow-md transition-all active:scale-95"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  )
}
