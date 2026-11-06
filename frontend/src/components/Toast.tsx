import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++counter
    setToasts((prev) => [...prev, { id, message, kind }])
    setTimeout(() => remove(id), 3500)
  }, [remove])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Fixed stack at bottom-right */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({
  item,
  onClose,
}: {
  item: ToastItem
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Animate in
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 200ms, transform 200ms'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    })
  }, [])

  const bg =
    item.kind === 'success'
      ? 'bg-sage-700'
      : item.kind === 'error'
      ? 'bg-red-600'
      : 'bg-slate-700'

  const icon =
    item.kind === 'success' ? '✓' : item.kind === 'error' ? '✕' : 'ℹ'

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${bg}`}
      role="status"
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="flex-1">{item.message}</span>
      <button
        onClick={onClose}
        className="ml-1 opacity-70 hover:opacity-100"
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
