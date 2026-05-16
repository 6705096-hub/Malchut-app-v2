'use client'

import { useState, useEffect } from 'react'
import { FileSpreadsheet, Loader2, Save, Plus, ExternalLink, CircleCheck, Info } from 'lucide-react'

export function BackupSettingsClient({ initialSpreadsheetId, userEmail }: { initialSpreadsheetId: string, userEmail?: string }) {
  const [activeId, setActiveId] = useState(initialSpreadsheetId || '')
  const [sheetName, setSheetName] = useState(`׳’׳™׳‘׳•׳™ ׳׳¢׳¨׳›׳× - ${new Date().getFullYear()}`)
  const [shareEmail, setShareEmail] = useState(userEmail || '')
  const [customId, setCustomId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error', link?: string, linkText?: string } | null>(null)
  const [serviceEmail, setServiceEmail] = useState<string>('')

  useEffect(() => {
    fetch('/api/settings/backup/create-sheet')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.serviceEmail) setServiceEmail(data.serviceEmail)
          if (data.spreadsheetId && !activeId) setActiveId(data.spreadsheetId)
        }
      })
      .catch(console.error)
  }, [activeId])



  const handleSaveCustom = async () => {
    let finalId = customId.trim()
    if (!finalId) return
    
    // Auto-extract ID if user pasted full URL
    const match = finalId.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (match && match[1]) {
      finalId = match[1]
    }
    
    setIsSaving(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/settings/backup/create-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SET_CUSTOM', spreadsheetId: finalId })
      })
      
      const data = await res.json()
      if (data.success) {
        setActiveId(data.spreadsheetId)
        setCustomId('')
        setMessage({ text: '׳׳–׳”׳” ׳’׳™׳׳™׳•׳ ׳¢׳•׳“׳›׳ ׳‘׳”׳¦׳׳—׳”!', type: 'success' })
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      setMessage({ text: '׳©׳’׳™׳׳” ׳‘׳¢׳“׳›׳•׳ ׳”׳’׳™׳׳™׳•׳: ' + err.message, type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 mt-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-100 p-3 rounded-2xl">
          <FileSpreadsheet className="text-green-600" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">׳ ׳™׳”׳•׳ ׳§׳•׳‘׳¥ ׳’׳™׳‘׳•׳™ (Google Sheets)</h2>
          <p className="text-gray-500 text-sm">׳”׳’׳“׳¨ ׳׳׳™׳–׳” ׳§׳•׳‘׳¥ ׳”׳׳¢׳¨׳›׳× ׳×׳’׳‘׳” ׳׳× ׳”׳”׳–׳׳ ׳•׳×.</p>
        </div>
      </div>

      <div className="mb-6">
        {activeId ? (
          <div className="inline-flex bg-green-100 text-green-800 px-3 py-1.5 rounded-lg text-sm font-bold items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            ׳¡׳˜׳˜׳•׳¡: ׳׳’׳‘׳” ׳‘׳–׳׳ ׳׳׳× ׳׳ ׳”׳§׳•׳‘׳¥ ׳”׳׳•׳’׳“׳¨
          </div>
        ) : (
          <div className="inline-flex bg-gray-100 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-bold items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
            ׳¡׳˜׳˜׳•׳¡: ׳’׳™׳‘׳•׳™ ׳׳ ׳₪׳¢׳™׳ (׳׳ ׳”׳•׳’׳“׳¨ ׳§׳•׳‘׳¥)
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 flex flex-col gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex items-center gap-2 font-medium">
            {message.type === 'success' ? <CircleCheck size={18} /> : null}
            {message.text}
          </div>
          {message.link && (
            <a href={message.link} target="_blank" rel="noreferrer" className={`hover:underline flex items-center gap-1 font-bold text-sm w-fit bg-white px-3 py-1.5 rounded-lg shadow-sm mt-1 ${message.type === 'success' ? 'text-blue-600 border border-blue-100' : 'text-red-700 border border-red-200'}`}>
              {message.linkText || '׳₪׳×׳— ׳§׳™׳©׳•׳¨'} <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2">׳׳–׳”׳” ׳”׳’׳™׳׳™׳•׳ ׳”׳₪׳¢׳™׳ ׳›׳¨׳’׳¢:</h3>
        <div className="flex items-center gap-3 bg-white p-3 border border-gray-200 rounded-xl">
          <code className="text-sm flex-1 break-all text-gray-800 font-mono select-all">
            {activeId || '׳׳ ׳׳•׳’׳“׳¨ ׳׳–׳”׳” ׳₪׳¢׳™׳'}
          </code>
          {activeId && (
            <a 
              href={`https://docs.google.com/spreadsheets/d/${activeId}/edit`} 
              target="_blank" 
              rel="noreferrer"
              className="shrink-0 text-blue-600 hover:text-blue-700 bg-blue-50 p-2 rounded-lg"
              title="׳₪׳×׳— ׳’׳™׳׳™׳•׳ ׳‘׳“׳₪׳“׳₪׳"
            >
              <ExternalLink size={18} />
            </a>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-gray-800 text-lg">׳—׳™׳‘׳•׳¨ ׳§׳•׳‘׳¥ ׳—׳“׳© ׳׳׳¢׳¨׳›׳×</h3>
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full p-1 transition-colors"
              title="׳׳™׳ ׳¢׳•׳©׳™׳ ׳׳× ׳–׳”?"
            >
              <Info size={18} />
            </button>
          </div>
          
          <div className="mb-6 p-4 sm:p-5 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 text-sm leading-relaxed shadow-sm">
            <p className="font-bold text-base mb-3">׳׳™׳ ׳׳—׳‘׳¨׳™׳ ׳§׳•׳‘׳¥ ׳’׳™׳‘׳•׳™ ׳׳”׳˜׳׳₪׳•׳ (׳×׳•׳ ׳“׳§׳”)?</p>
            <ol className="list-decimal pl-5 space-y-4 mt-1 font-medium" dir="rtl">
              <li>׳₪׳×׳— ׳§׳•׳‘׳¥ <strong>Google Sheets</strong> ׳¨׳™׳§ ׳‘׳¢׳¦׳׳ ׳•׳§׳¨׳ ׳׳• ׳‘׳׳™׳–׳” ׳©׳ ׳©׳×׳¨׳¦׳”.</li>
              <li>
                <div>׳׳—׳¥ ׳׳׳¢׳׳” ׳¢׳ <strong>׳©׳™׳×׳•׳£ (Share)</strong>, ׳•׳”׳•׳¡׳£ ׳׳× ׳”׳׳¢׳¨׳›׳× ׳‘׳×׳•׳¨ <strong>׳¢׳•׳¨׳ (Editor)</strong>.<br/>׳”׳ ׳” ׳”׳׳™׳™׳ ׳׳”׳¢׳×׳§׳”:</div>
                <div className="bg-white p-3 rounded-lg border border-blue-200 mt-2 shadow-sm text-center">
                  <code className="text-blue-700 font-mono text-[13px] sm:text-base select-all break-all block" dir="ltr">
                    malchut@malchut-490019.iam.gserviceaccount.com
                  </code>
                </div>
              </li>
              <li>
                ׳‘׳˜׳׳₪׳•׳: ׳׳—׳¥ ׳¢׳ ׳”<strong>׳©׳׳•׳© ׳ ׳§׳•׳“׳•׳× (ג‹®)</strong> ׳‘׳₪׳™׳ ׳” -&gt; ׳‘׳—׳¨ <strong>"׳©׳™׳×׳•׳£ ׳•׳™׳™׳¦׳•׳"</strong> -&gt; ׳‘׳—׳¨ <strong>"׳”׳¢׳×׳§ ׳§׳™׳©׳•׳¨"</strong> (Copy link).
              </li>
              <li>׳”׳“׳‘׳§ ׳׳× ׳”׳§׳™׳©׳•׳¨ ׳”׳׳¨׳•׳ ׳©׳”׳¢׳×׳§׳× ׳׳׳© ׳›׳׳ ׳‘׳×׳™׳‘׳” ׳׳׳˜׳”! <br/><span className="text-blue-700 font-bold">׳”׳׳¢׳¨׳›׳× ׳›׳‘׳¨ ׳×׳“׳¢ ׳׳©׳׳•׳£ ׳׳× ׳׳” ׳©׳”׳™׳ ׳¦׳¨׳™׳›׳” ׳•׳׳™׳™׳¦׳¨ ׳׳× ׳”׳׳©׳•׳ ׳™׳•׳×.</span></li>
            </ol>
          </div>

          <p className="text-gray-500 text-sm mb-3">
            ׳”׳“׳‘׳§ ׳›׳׳ ׳׳× ׳”׳§׳™׳©׳•׳¨ ׳”׳׳׳ ׳©׳ ׳§׳•׳‘׳¥ ׳”-Google Sheets ׳©׳׳:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              value={customId}
              onChange={e => setCustomId(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-left"
              dir="ltr"
            />
            <button 
              onClick={handleSaveCustom}
              disabled={isSaving || !customId.trim()}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              ׳©׳׳•׳¨
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

