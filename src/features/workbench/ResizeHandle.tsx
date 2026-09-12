import { cn } from '@/lib/cn'

/** The visual/interactive strip for useResizablePanel's onMouseDown — a
 *  thin bar that highlights on hover/drag so it reads as grabbable. */
export function ResizeHandle({ onMouseDown, className }: { onMouseDown: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn('w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-accent/50 active:bg-accent/70', className)}
    />
  )
}
