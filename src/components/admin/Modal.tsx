'use client'
import clsx from 'clsx'

interface Props {
  onClose: () => void
  maxWidth?: string
  children: React.ReactNode
}

export default function Modal({ onClose, maxWidth = 'max-w-md', children }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className={clsx('card w-full mx-4 p-6', maxWidth)} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
