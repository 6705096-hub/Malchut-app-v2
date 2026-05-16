'use client'

/**
 * useVoiceRecorder — hook for recording audio using MediaRecorder API.
 * Returns a base64 data URL (audio/webm) ready to send as attachmentData.
 */

import { useState, useRef, useCallback } from 'react'

interface UseVoiceRecorderReturn {
  isRecording: boolean
  duration: number        // seconds elapsed
  startRecording: () => Promise<void>
  stopRecording: () => Promise<{ base64: string; mimeType: string; durationSec: number } | null>
  cancelRecording: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setIsRecording(false)
    setDuration(0)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Prefer webm/opus, fallback to whatever browser supports
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(100) // collect data every 100ms
      startTimeRef.current = Date.now()
      setIsRecording(true)

      // Timer for UI duration display
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 500)
    } catch (err) {
      console.error('Microphone access denied:', err)
      alert('לא ניתן לגשת למיקרופון. אנא אשר גישה.')
      cleanup()
    }
  }, [cleanup])

  const stopRecording = useCallback((): Promise<{ base64: string; mimeType: string; durationSec: number } | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        cleanup()
        resolve(null)
        return
      }

      const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000)

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })

        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = () => {
          let base64 = reader.result as string
          let finalMime = recorder.mimeType || 'audio/webm'
          
          // Android Chrome sometimes defaults to video/webm even for audio-only streams.
          // This breaks our isAudioType check. Force it to audio/webm.
          if (finalMime.startsWith('video/')) {
            finalMime = finalMime.replace('video/', 'audio/')
            base64 = base64.replace('data:video/', 'data:audio/')
          }

          // Embed duration into mimeType so it can be read immediately by the UI without waiting for metadata
          const durationRounded = Math.round(durationSec)
          finalMime = `${finalMime};duration=${durationRounded}`

          cleanup()
          resolve({ base64, mimeType: finalMime, durationSec })
        }
        reader.onerror = () => {
          cleanup()
          resolve(null)
        }
        reader.readAsDataURL(blob)
      }

      recorder.stop()
    })
  }, [cleanup])

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    cleanup()
  }, [cleanup])

  return { isRecording, duration, startRecording, stopRecording, cancelRecording }
}
