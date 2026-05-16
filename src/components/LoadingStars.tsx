import { Star } from 'lucide-react'

export function LoadingStars({ size = 24 }: { size?: number }) {
  // Using custom inline delays for the pulse animation so they twinkle in sequence
  return (
    <div className="flex items-center justify-center gap-1.5" dir="ltr">
      <Star 
        className="text-[#8B5A2B] fill-[#8B5A2B] animate-pulse" 
        style={{ width: size, height: size, animationDuration: '1s' }} 
      />
      <Star 
        className="text-[#8B5A2B] fill-[#8B5A2B] animate-pulse" 
        style={{ width: size, height: size, animationDuration: '1s', animationDelay: '0.2s' }} 
      />
      <Star 
        className="text-[#8B5A2B] fill-[#8B5A2B] animate-pulse" 
        style={{ width: size, height: size, animationDuration: '1s', animationDelay: '0.4s' }} 
      />
    </div>
  )
}
