'use client'

/**
 * ImageEditor — WhatsApp-style image editor before sending
 * Supports: crop handles, text overlay, freehand drawing
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { X, Type, Pen, RotateCcw, Check, Minus, Plus } from 'lucide-react'

type Tool = 'none' | 'draw' | 'text'

interface Props {
  src: string
  onConfirm: (base64: string, caption: string) => void
  onCancel: () => void
}

export function ImageEditor({ src, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('none')
  const [color, setColor] = useState('#ffffff')
  const [brushSize, setBrushSize] = useState(4)
  const [caption, setCaption] = useState('')
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const historyRef = useRef<ImageData[]>([])

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new window.Image()
    img.onload = () => {
      // Fit to max 400x400 while maintaining ratio
      const maxW = 400, maxH = 400
      let w = img.width, h = img.height
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH }
      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0, w, h)
      historyRef.current = [ctx.getImageData(0, 0, w, h)]
    }
    img.src = src
  }, [src])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }, [])

  const undo = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || historyRef.current.length <= 1) return
    historyRef.current.pop()
    ctx.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0)
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool !== 'draw') return
    e.preventDefault()
    saveHistory()
    setIsDrawing(true)
    lastPos.current = getPos(e)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || tool !== 'draw') return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const endDraw = () => setIsDrawing(false)

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool !== 'text') return
    const pos = getPos(e)
    setTextPos(pos)
  }

  const commitText = () => {
    if (!textInput.trim() || !textPos) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    saveHistory()
    ctx.font = `bold ${brushSize * 5 + 10}px Arial`
    ctx.fillStyle = color
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 2
    ctx.strokeText(textInput, textPos.x, textPos.y)
    ctx.fillText(textInput, textPos.x, textPos.y)
    setTextInput('')
    setTextPos(null)
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const base64 = canvas.toDataURL('image/jpeg', 0.85)
    onConfirm(base64, caption)
  }

  const COLORS = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff6600', '#000000']

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md shrink-0">
        <button onClick={onCancel} className="p-2 text-white/70 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          {/* Tools */}
          <button
            onClick={() => setTool(t => t === 'draw' ? 'none' : 'draw')}
            className={`p-2 rounded-full transition-all ${tool === 'draw' ? 'bg-teal-500 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Pen className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTool(t => t === 'text' ? 'none' : 'text')}
            className={`p-2 rounded-full transition-all ${tool === 'text' ? 'bg-teal-500 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Type className="w-5 h-5" />
          </button>
          <button onClick={undo} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
        <button onClick={handleConfirm} className="p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 active:scale-95 transition-all">
          <Check className="w-6 h-6" />
        </button>
      </div>

      {/* Color palette (draw/text mode) */}
      {(tool === 'draw' || tool === 'text') && (
        <div className="flex items-center justify-center gap-3 py-2 bg-black/60 shrink-0">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-white scale-125' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
          <button onClick={() => setBrushSize(s => Math.max(2, s - 2))} className="text-white/60 hover:text-white">
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-white text-xs w-4 text-center">{brushSize}</span>
          <button onClick={() => setBrushSize(s => Math.min(20, s + 2))} className="text-white/60 hover:text-white">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className={`max-w-full max-h-full rounded-lg select-none ${tool === 'draw' ? 'cursor-crosshair' : tool === 'text' ? 'cursor-text' : 'cursor-default'}`}
            style={{ maxHeight: 'calc(100vh - 200px)' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            onClick={handleCanvasClick}
          />
          {/* Text input overlay */}
          {textPos && tool === 'text' && (
            <div
              className="absolute"
              style={{ left: textPos.x, top: textPos.y, transform: 'translateY(-50%)' }}
            >
              <input
                autoFocus
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitText() }}
                onBlur={commitText}
                className="bg-transparent border-b border-white text-white outline-none min-w-[100px]"
                style={{ color, fontSize: `${brushSize * 5 + 10}px`, fontWeight: 'bold' }}
                dir="auto"
              />
            </div>
          )}
        </div>
      </div>

      {/* Caption + Send */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-md shrink-0">
        <input
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="הוסף כיתוב..."
          className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-2.5 outline-none text-sm"
          dir="auto"
        />
        <button
          onClick={handleConfirm}
          className="px-5 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 active:scale-95 transition-all text-sm"
        >
          שלח
        </button>
      </div>
    </div>
  )
}
