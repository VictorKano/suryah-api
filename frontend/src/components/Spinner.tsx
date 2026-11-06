export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-sage-300 border-t-sage-600 ${className}`}
      style={{ width: '1em', height: '1em' }}
      role="status"
      aria-label="Carregando"
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="text-3xl text-sage-500" />
    </div>
  )
}
