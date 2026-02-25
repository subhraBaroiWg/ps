import styles from '../../UploaderApp.module.css'
import { FileGrid } from './FileGrid'
import type { UploadItem } from '../../types/uploader'

interface UploaderContentProps {
  items: UploadItem[]
  visibleItems: UploadItem[]
  onRemoveItem: (item: UploadItem) => void
}

export function UploaderContent({
  items,
  visibleItems,
  onRemoveItem,
}: UploaderContentProps) {
  if (items.length === 0) {
    return (
      <section className={styles.emptyState}>
        <h2>No files queued yet</h2>
        <p>Add images using drag-and-drop or the file picker to start.</p>
      </section>
    )
  }

  if (visibleItems.length === 0) {
    return (
      <section className={styles.filteredEmptyState}>
        <h2>No files in this view</h2>
        <p>Pick another filter to see other files.</p>
      </section>
    )
  }

  return <FileGrid items={visibleItems} onRemove={onRemoveItem} />
}
