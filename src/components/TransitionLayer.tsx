import type { RefObject } from 'react'
interface TransitionLayerProps {
  wipeRef: RefObject<HTMLDivElement>
  shapeRef: RefObject<HTMLDivElement>
}
export function TransitionLayer({ wipeRef, shapeRef }: TransitionLayerProps) {
  return (
    <div ref={wipeRef} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 90, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none' }}>
      <div ref={shapeRef} style={{ position: 'absolute', left: '50%', top: '50%', width: '220vmax', height: '220vmax', borderRadius: '50%', transform: 'translate(-50%, -50%) scale(0)' }} />
    </div>
  )
}
