import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Focus management shared by the modals. On mount it moves focus into the dialog,
// keeps Tab and Shift+Tab cycling within it, and on unmount returns focus to the
// element that opened it. Escape is folded in here so each modal does not repeat the
// listener; it calls onCancel, same as before.
export function useModalFocus(onCancel: () => void) {
  const ref = useRef<HTMLDivElement>(null)

  // Callers pass onCancel as an inline arrow. Reading it through a ref keeps the
  // trap effect from tearing down on every parent render, which would re-focus the
  // first field and re-capture the trigger as an element inside the dialog.
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  })

  useEffect(() => {
    const dialog = ref.current
    // The element focused before the modal opened, restored when it closes.
    const trigger = document.activeElement as HTMLElement | null

    // Recomputed on demand so a button that enables or disables mid-edit (the
    // confirm button) is counted correctly at the moment Tab is pressed.
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

    // Move focus in: the first focusable element (the text input in EditModal, the
    // cancel button in ConfirmModal), or the container itself if there is none.
    const first = focusable()[0]
    if (first) first.focus()
    else dialog?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancelRef.current()
        return
      }
      if (e.key !== 'Tab') return

      const items = focusable()
      if (items.length === 0) {
        e.preventDefault()
        dialog?.focus()
        return
      }

      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement
      // Wrap at the ends and pull stray focus back in; let Tab move normally between.
      if (e.shiftKey && (active === firstItem || !dialog?.contains(active))) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && (active === lastItem || !dialog?.contains(active))) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      trigger?.focus()
    }
  }, [])

  return ref
}
