import styles from '../../UploaderApp.module.css'
import { bytesToHuman } from '../../utils/uploaderFormatters'

interface UploadControlsProps {
  hasPending: boolean
  isUploading: boolean
  isConfigured: boolean
  completedFiles: number
  totalFiles: number
  uploadedBytes: number
  totalBytes: number
  onUploadAll: () => void
}

export function UploadControls({
  hasPending,
  isUploading,
  isConfigured,
  completedFiles,
  totalFiles,
  uploadedBytes,
  totalBytes,
  onUploadAll,
}: UploadControlsProps) {
  return (
    <div className={styles.uploadSticky}>
      <section className={styles.controls}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onUploadAll}
          disabled={!hasPending || !isConfigured || isUploading}
        >
          Upload All
        </button>
        <div className={styles.metrics}>
          <span className={styles.metricChip}>
            {completedFiles}/{totalFiles} completed
          </span>
          <span className={styles.metricChip}>
            {bytesToHuman(uploadedBytes)} / {bytesToHuman(totalBytes)}
          </span>
        </div>
      </section>

      <section className={styles.overallProgress}>
        <div
          className={styles.overallProgressFill}
          style={{ width: `${totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0}%` }}
        />
      </section>
    </div>
  )
}
