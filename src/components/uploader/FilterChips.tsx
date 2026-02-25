import styles from '../../UploaderApp.module.css'
import { UploadFilters, type UploadFilter } from '../../types/uploader'

interface FilterCounts {
  all: number
  ready: number
  uploaded: number
  failed: number
}

interface FilterChipsProps {
  activeFilter: UploadFilter
  counts: FilterCounts
  onFilterChange: (filter: UploadFilter) => void
}

export function FilterChips({
  activeFilter,
  counts,
  onFilterChange,
}: FilterChipsProps) {
  return (
    <section className={styles.filterBar} aria-label="File status filters">
      <button
        type="button"
        className={`${styles.filterChip} ${activeFilter === UploadFilters.all ? styles.filterChipActive : ''}`}
        onClick={() => onFilterChange(UploadFilters.all)}
      >
        All ({counts.all})
      </button>
      <button
        type="button"
        className={`${styles.filterChip} ${activeFilter === UploadFilters.ready ? styles.filterChipActive : ''}`}
        onClick={() => onFilterChange(UploadFilters.ready)}
      >
        Ready for upload ({counts.ready})
      </button>
      <button
        type="button"
        className={`${styles.filterChip} ${activeFilter === UploadFilters.uploaded ? styles.filterChipActive : ''}`}
        onClick={() => onFilterChange(UploadFilters.uploaded)}
      >
        Uploaded ({counts.uploaded})
      </button>
      <button
        type="button"
        className={`${styles.filterChip} ${activeFilter === UploadFilters.failed ? styles.filterChipActive : ''}`}
        onClick={() => onFilterChange(UploadFilters.failed)}
      >
        Failed ({counts.failed})
      </button>
    </section>
  )
}
