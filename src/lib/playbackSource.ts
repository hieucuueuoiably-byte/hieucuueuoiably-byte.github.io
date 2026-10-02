import mobileVideos from '../data/mobile-videos.json'
import type { Work } from '../data/works'

type Connection = { saveData?: boolean; effectiveType?: string; downlink?: number }

/** Choose once per player so rotating the phone does not reload the film. */
export function preferLightVideo(): boolean {
  const connection = (window.navigator as Navigator & { connection?: Connection }).connection
  return window.matchMedia('(max-width: 700px), (pointer: coarse)').matches ||
    connection?.saveData === true || /(^|-)2g$|^3g$/.test(connection?.effectiveType ?? '') ||
    (connection?.downlink !== undefined && connection.downlink < 2.5)
}

export function playbackSource(work: Work, light: boolean): string {
  return light ? (mobileVideos as Record<string, string>)[work.slug] ?? work.video : work.video
}
