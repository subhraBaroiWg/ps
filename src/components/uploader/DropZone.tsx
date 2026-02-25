import { useRef } from 'react'
import { FILE_INPUT_ACCEPT } from '../../hooks/useUppyUploader'
import styles from '../../UploaderApp.module.css'

interface DropZoneProps {
  isDragActive: boolean
  onDragOver: (event: React.DragEvent<HTMLElement>) => void
  onDragLeave: (event: React.DragEvent<HTMLElement>) => void
  onDrop: (event: React.DragEvent<HTMLElement>) => void
  onFilesSelected: (files: File[]) => void
}

export function DropZone({
  isDragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onFilesSelected,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <section
      className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={FILE_INPUT_ACCEPT}
        className={styles.hiddenInput}
        onChange={(event) => {
          onFilesSelected(event.target.files ? Array.from(event.target.files) : [])
        }}
      />
      <p className={styles.dropTitle}>
        {isDragActive ? 'Drop files to queue them' : 'Drop images here'}
      </p>
      <p className={styles.dropSubtitle}>JPG, PNG, GIF, WEBP • max 30 MB • converted to WebP</p>
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={() => inputRef.current?.click()}
      >
        Browse Files
      </button>
    </section>
  )
}
