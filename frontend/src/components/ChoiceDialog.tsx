import { useEffect } from 'react'
import { formOverlayClass, formClass, formTitleClass, formPrimaryButtonClass, formSecondaryButtonClass } from '../styles/formStyles'

// a question with a few answers, in the app's own style (like ConfirmDialog, but more than yes/no).
// The first choice is the main one; Escape or clicking outside means Cancel
function ChoiceDialog({
  title,
  message,
  choices,
  cancelLabel = 'Cancel',
  onCancel,
}: {
  title: string
  message: string
  choices: { label: string; onSelect: () => void }[]
  cancelLabel?: string
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
        role="dialog"
        aria-labelledby="choice-title"
        aria-describedby="choice-message"
        className={formClass}
        onClick={(e) => e.stopPropagation()} // clicks inside don't close it
      >
        <h2 id="choice-title" className={formTitleClass}>{title}</h2>
        <p id="choice-message" className="text-sm text-gray-300">{message}</p>
        <div className="flex flex-col gap-2">
          {choices.map((choice, i) => (
            <button
              key={choice.label}
              type="button"
              autoFocus={i === 0}
              onClick={choice.onSelect}
              className={i === 0 ? formPrimaryButtonClass : formSecondaryButtonClass}
            >
              {choice.label}
            </button>
          ))}
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChoiceDialog
