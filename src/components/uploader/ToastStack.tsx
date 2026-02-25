import styles from '../../UploaderApp.module.css'
import type { ValidationToast } from '../../types/uploader'

interface ToastStackProps {
  toasts: ValidationToast[]
  onDismiss: (toastId: string) => void
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null

  return (
    <section className={styles.toastStack} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <article key={toast.id} className={styles.toastError}>
          <p>{toast.message}</p>
          <button
            type="button"
            className={styles.toastCloseButton}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.toastCloseIcon}>
              <path
                d="M7 7l10 10M17 7L7 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </article>
      ))}
    </section>
  )
}
