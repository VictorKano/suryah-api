import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Wrapper centers on large screens, top-aligns on small ones */}
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <div
          className="my-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-sage-800">{title}</h2>
            <button
              onClick={onClose}
              className="text-sage-400 transition hover:text-sage-600"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
