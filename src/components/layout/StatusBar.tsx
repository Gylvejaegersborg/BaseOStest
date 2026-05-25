import { StatusDot } from '@/components/ui/StatusDot'

export function StatusBar() {
  return (
    <footer className="flex h-6 items-center justify-between border-t border-line bg-panel/60 px-4 text-[10px] tracking-wider text-dim">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <StatusDot color="#36e0c8" size={6} /> SYSTEM NOMINAL
        </span>
        <span className="hidden sm:inline">MOCK DATA · NO BACKEND</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden md:inline">claude · hemera · nyx</span>
        <span>PERSONAL.OS</span>
      </div>
    </footer>
  )
}
