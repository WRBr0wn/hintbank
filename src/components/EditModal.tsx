import { useId, useState } from 'react'
import { useModalFocus } from '../hooks/useModalFocus'
import styles from './ConfirmModal.module.css'

interface Props {
  label: string
  initialValue: string
  maxLength?: number
  confirmLabel: string
  cancelLabel: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

// Same dialog pattern as ConfirmModal, with one pre-filled text input for fixing a
// typo. Confirm passes the edited text; backdrop, cancel, and Esc dismiss without
// saving. Empty text cannot be confirmed (the engine would reject it anyway).
export default function EditModal({
  label,
  initialValue,
  maxLength,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(initialValue)
  const dialogRef = useModalFocus(onCancel)
  const labelId = useId()

  const submit = () => {
    if (value.trim()) onConfirm(value)
  }

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <p id={labelId} className={styles.message}>{label}</p>
        <input
          className={styles.input}
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={styles.confirm} onClick={submit} disabled={value.trim() === ''}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
