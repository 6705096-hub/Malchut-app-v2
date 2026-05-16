import React, { useState, useRef, useEffect } from 'react'
import { X, Crop, Type, Check, Undo2 } from 'lucide-react'

type ImageEditorProps = {
  imageUrl: string
  onSend: (editedImageUrl: string, caption: string) => void
  onCancel: () => void
}

export function ImageEditor({ imageUrl, onSend, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  
  const [caption, setCaption] = useState('')
  const [mode, setMode] = useState<'view' | 'crop' | 'text'>('view')
  
  // Text Overlay State
  const [texts, setTexts] = useState<{text: string, x: number, y: number, color: string, fontSize: number}[]>([])
  const [currentText, setCurrentText] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [isTyping, setIsTyping] = useState(false)
  const [textPos, setTextPos] = useState({x: 50, y: 50}) // percentages 0-100
  
  // Crop State (Simplified - just visual bounds for now, fully implementing drag crop requires heavy math)
  // For a quick WhatsApp-like MVP, we will implement text overlay perfectly. 
  // True cropping might need a library, but let's do a basic bounding box if mode === 'crop'

  useEffect(() => {
    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
      imageRef.current = img
      drawCanvas()
    }
  }, [imageUrl, texts])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to image size
    canvas.width = img.width
    canvas.height = img.height

    // Draw base image
    ctx.drawImage(img, 0, 0)

    // Draw texts
    texts.forEach(t => {
      ctx.font = `bold ${t.fontSize}px Arial`
      ctx.fillStyle = t.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Calculate actual pixel coordinates
      const px = (t.x / 100) * canvas.width
      const py = (t.y / 100) * canvas.height
      
      // Text shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      
      ctx.fillText(t.text, px, py)
      
      // Reset shadow
      ctx.shadowColor = 'transparent'
    })
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'text') {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      
      setTextPos({x, y})
      setIsTyping(true)
    }
  }

  const commitText = () => {
    if (currentText.trim()) {
      setTexts([...texts, {
        text: currentText,
        x: textPos.x,
        y: textPos.y,
        color: textColor,
        fontSize: Math.max(30, imageRef.current ? imageRef.current.width * 0.05 : 40) // Responsive font size
      }])
    }
    setCurrentText('')
    setIsTyping(false)
  }

  const handleSend = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Get the final edited image
    const editedUrl = canvas.toDataURL('image/jpeg', 0.8)
    onSend(editedUrl, caption)
  }

  const colors = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#000000']

  return (
    <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-in slide-in-from-bottom duration-200" dir="rtl">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-20">
        <button type="button" onClick={onCancel} className="p-2 rounded-full text-white hover:bg-white/20 active:scale-95 transition-colors">
          <X className="w-7 h-7" />
        </button>
        
        <div className="flex items-center gap-4">
          <button type="button"
            onClick={() => {
              const newTexts = [...texts]
              newTexts.pop()
              setTexts(newTexts)
            }} 
            disabled={texts.length === 0}
            className={`p-2 rounded-full transition-colors ${texts.length > 0 ? 'text-white hover:bg-white/20 active:scale-95' : 'text-white/30'}`}
          >
            <Undo2 className="w-6 h-6" />
          </button>
          
          <button type="button"
            onClick={() => setMode('crop')} 
            className={`p-2 rounded-full transition-colors active:scale-95 ${mode === 'crop' ? 'text-[#00a884] bg-white/10' : 'text-white hover:bg-white/20'}`}
            title="חיתוך (בקרוב)"
          >
            <Crop className="w-6 h-6" />
          </button>
          
          <button type="button"
            onClick={() => setMode('text')} 
            className={`p-2 rounded-full transition-colors active:scale-95 ${mode === 'text' ? 'text-[#00a884] bg-white/10' : 'text-white hover:bg-white/20'}`}
          >
            <Type className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#0b141a]" onClick={() => setIsTyping(false)}>
        <canvas 
          ref={canvasRef} 
          onClick={handleCanvasClick}
          className={`max-w-full max-h-full object-contain ${mode === 'text' ? 'cursor-crosshair' : 'cursor-default'}`}
          style={{ touchAction: 'none' }}
        />

        {mode === 'text' && (
          <div className="absolute top-20 text-white/70 text-sm bg-black/40 px-3 py-1 rounded-full pointer-events-none">
            לחץ על התמונה כדי להוסיף טקסט
          </div>
        )}

        {/* Text Input Overlay */}
        {isTyping && (
          <div 
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); commitText(); }}
          >
            <div className="flex flex-col items-center gap-4 w-full px-4" onClick={e => e.stopPropagation()}>
              {/* Color Picker */}
              <div className="flex gap-2 bg-black/40 p-2 rounded-full">
                {colors.map(c => (
                  <button type="button"
                    key={c}
                    onClick={() => setTextColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${textColor === c ? 'scale-110 border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              
              <input 
                type="text"
                value={currentText}
                onChange={e => setCurrentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitText()
                }}
                className="w-full max-w-sm bg-transparent border-b-2 text-center text-4xl font-bold focus:outline-none placeholder-white/50"
                style={{ color: textColor, borderColor: textColor }}
                placeholder="הקלד כאן..."
                autoFocus
              />
              <button type="button"
                onClick={commitText}
                className="mt-4 bg-[#00a884] text-white rounded-full p-3 shadow-lg active:scale-95"
              >
                <Check className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="bg-[#202c33] p-3 safe-bottom shrink-0 flex items-end gap-2">
        <textarea
           value={caption}
           onChange={(e) => setCaption(e.target.value)}
           placeholder="הוסף כיתוב..."
           className="flex-1 bg-[#2a3942] text-white rounded-3xl px-4 py-3 min-h-[44px] max-h-32 resize-none focus:outline-none"
           rows={1}
           onInput={(e) => {
             const target = e.target as HTMLTextAreaElement;
             target.style.height = 'auto';
             target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
           }}
        />
        <button type="button"
          onClick={handleSend}
          className="w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-md"
        >
          <div className="rotate-180 transform -ml-1">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path>
            </svg>
          </div>
        </button>
      </div>
    </div>
  )
}
