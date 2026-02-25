import styles from '../../UploaderApp.module.css'

interface UploaderHeaderProps {
  isConfigured: boolean
}

export function UploaderHeader({ isConfigured }: UploaderHeaderProps) {
  return (
    <>
      <section className={styles.header}>
        <h1>Picsee Uploader</h1>
        <p>Simple, reliable uploader with worker-based WebP conversion.</p>
      </section>

      {!isConfigured && (
        <section className={styles.warning}>
          Set `VITE_TRANSLOADIT_AUTH_KEY` and `VITE_TRANSLOADIT_TEMPLATE_ID` in `.env`.
        </section>
      )}
    </>
  )
}
