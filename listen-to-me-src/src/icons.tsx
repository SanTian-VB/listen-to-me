import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const stroke = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconUpload(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}

export function IconListOrdered(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <line x1="10" x2="21" y1="6" y2="6" />
      <line x1="10" x2="21" y1="12" y2="12" />
      <line x1="10" x2="21" y1="18" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1-2-1" />
    </svg>
  )
}

export function IconGripVertical(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconChevronUp(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

export function IconChevronDown(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function IconFileText(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  )
}

export function IconTrash2(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

export function IconPlay(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconPause(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
      <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSquare(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSkipForward(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" x2="19" y1="5" y2="19" />
    </svg>
  )
}

export function IconRepeat(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

export function IconVolume2(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

export function IconClock(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...stroke} {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
