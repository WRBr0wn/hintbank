import { useId } from 'react'
import { useModalFocus } from '../hooks/useModalFocus'
import styles from './ConfirmModal.module.css'

interface Props {
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// Backdrop, cancel, and Esc all dismiss without acting; only confirm runs the
// action.
export default function ConfirmModal({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  const dialogRef = useModalFocus(onCancel)
  const messageId = useId()

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={messageId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <p id={messageId} className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={styles.confirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
