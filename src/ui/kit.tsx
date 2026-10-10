import type { ButtonHTMLAttributes } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from './Icon'
import { useStore } from '../store'

type Tone = 'cream' | 'yellow' | 'coral' | 'mint' | 'sky' | 'pink'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { tone?: Tone; big?: boolean; icon?: string }

export function Btn({ tone = 'cream', big, icon, className = '', children, ...rest }: BtnProps) {
  return (
    <button className={`sticker-btn hit ${big ? 'big' : ''} ${tone === 'cream' ? '' : `tone-${tone}`} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={big ? 28 : 22} />}
      {children}
    </button>
  )
}

interface IconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { icon: string; label: string; active?: boolean }

export function IconBtn({ icon, label, active, className = '', ...rest }: IconBtnProps) {
  return (
    <button aria-label={label} title={label} className={`sticker-btn icon-btn hit ${active ? 'tone-yellow' : ''} ${className}`} {...rest}>
      <Icon name={icon} size={26} />
    </button>
  )
}

export function Toast() {
  const toast = useStore((s) => s.toast)
  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ y: -30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="sticker px-5 py-3 font-display text-lg text-center max-w-md"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
