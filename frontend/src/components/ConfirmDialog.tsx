import { useEffect } from 'react'
import { formOverlayClass, formClass, formTitleClass, formPrimaryButtonClass, formSecondaryButtonClass } from '../styles/formStyles'

// a yes/no question in the app's own style, instead of the browser's window.confirm.
// Escape or clicking outside counts as No. `danger`: a red confirm button, for things that can't be undone
function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  danger = true,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className={formOverlayClass} onClick={onCancel}>
      <div
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className={formClass}
        onClick={(e) => e.stopPropagation()} // clicks inside don't close it
      >
        <h2 id="confirm-title" className={formTitleClass}>{title}</h2>
        <p id="confirm-message" className="text-sm text-gray-300">{message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={danger ? 'flex-1 bg-red-500 px-3 py-1.5 font-medium text-white transition-colors hover:bg-red-400' : formPrimaryButtonClass}
          >
            {confirmLabel}
          </button>
          <button type="button" onClick={onCancel} className={formSecondaryButtonClass}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
