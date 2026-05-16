import { LoadingStars } from '@/components/LoadingStars'

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-3">
        <LoadingStars size={32} />
        <span className="text-[#8B5A2B] font-bold text-sm tracking-widest animate-pulse">טוען...</span>
      </div>
    </div>
  )
}
