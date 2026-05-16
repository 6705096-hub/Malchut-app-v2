/**
 * Client-side image compression utility.
 * Resizes large images and compresses to JPEG before uploading as base64.
 */

const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200
const JPEG_QUALITY = 0.7
const MAX_FILE_SIZE_MB = 10 // Max allowed file size for non-image attachments

/**
 * Compress an image file to a base64 JPEG string.
 * Returns { base64, mimeType }
 */
export function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))

    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image'))

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        // Draw on canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to base64 JPEG
        const base64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve({ base64, mimeType: 'image/jpeg' })
      }

      img.src = e.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Read a non-image file as base64.
 * Returns { base64, mimeType, fileName }
 */
export function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      reject(new Error(`הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)`))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (e) => {
      resolve({
        base64: e.target?.result as string,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
      })
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Check if a MIME type is an image.
 */
export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Check if a MIME type is audio.
 */
export function isAudioType(mimeType: string): boolean {
  return mimeType.startsWith('audio/')
}

/**
 * Check if a MIME type is a PDF.
 */
export function isPdfType(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

/**
 * Get human-readable file size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
