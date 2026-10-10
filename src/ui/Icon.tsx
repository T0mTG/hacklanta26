import type { ReactNode } from 'react'

// Chunky 24px line icons. Round caps and a heavy stroke match the sticker UI.
const PATHS: Record<string, ReactNode> = {
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3.4 3.2 3.4 14.8 0 18M12 3c-3.4 3.2-3.4 14.8 0 18" /></>,
  frame: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 16.5l5-5 4 4 3-3 6 5" /><circle cx="8.5" cy="9" r="1.6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  shrink: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  help: <><path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2" /><circle cx="12" cy="18" r=".7" fill="currentColor" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />,
  note: <><path d="M5 4h14v10l-5 6H5z" /><path d="M14 20v-5a1 1 0 0 1 1-1h4" /></>,
  camera: <><path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" /><circle cx="12" cy="13.5" r="3.5" /></>,
  upload: <path d="M12 16V5M7 10l5-5 5 5M5 19h14" />,
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6" />,
  pencil: <path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" />,
  back: <path d="M10 6l-6 6 6 6M4 12h16" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  walk: <><circle cx="13" cy="5" r="2" /><path d="M10 20l2-6-3-2 2-5 3 2 3 1M13 14l3 2 1 4" /></>,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  eraser: <><path d="M4.5 15.2l8.7-8.7a2 2 0 0 1 2.8 0l2.5 2.5a2 2 0 0 1 0 2.8L11 19.5H7.2z" /><path d="M9.4 10.3l5.3 5.3M11 19.5h9" /></>,
  undo: <path d="M9 5L4 10l5 5M4 10h9.5a5.5 5.5 0 0 1 0 11H10" />,
  brush: <><path d="M18.5 4.5a2.1 2.1 0 0 1 0 3L11 15l-3-3 7.5-7.5a2.1 2.1 0 0 1 3 0z" /><path d="M8 12.5C5.5 12.5 4.5 14 4.5 16c0 1.6-.8 2.7-1.5 3.3 3.2.6 7-.3 7-3.3" /></>,
}

export default function Icon({ name, size = 24, className = '' }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name]}
    </svg>
  )
}
