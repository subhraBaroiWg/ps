import { useEffect, useMemo, useRef, useState } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import styles from '../../UploaderApp.module.css'
import { UploadStatuses, type UploadItem } from '../../types/uploader'
import { statusLabel } from '../../utils/uploaderFormatters'

interface FileGridProps {
  items: UploadItem[]
  onRemove: (item: UploadItem) => void
}

export function FileGrid({ items, onRemove }: FileGridProps) {
  const gridRef = useRef<HTMLElement | null>(null)
  const [columnCount, setColumnCount] = useState(1)
  const [columnGap, setColumnGap] = useState(16)
  const [scrollMargin, setScrollMargin] = useState(0)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const updateLayout = () => {
      const isDesktop = grid.clientWidth >= 900
      setColumnCount(isDesktop ? 3 : 1)
      setColumnGap(16)
      setScrollMargin(grid.offsetTop)
    }

    updateLayout()

    const observer = new ResizeObserver(() => {
      updateLayout()
    })
    observer.observe(grid)
    return () => {
      observer.disconnect()
    }
  }, [])

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    scrollMargin,
    estimateSize: () => 360,
    overscan: 8,
    lanes: columnCount,
    gap: columnGap,
  })

  const cardWidthStyle = useMemo(() => {
    if (columnCount <= 1) return '100%'
    return `calc((100% - ${(columnCount - 1) * columnGap}px) / ${columnCount})`
  }, [columnCount, columnGap])

  return (
    <section ref={gridRef} className={styles.virtualGridViewport}>
      <div
        className={styles.virtualGridInner}
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index]
          return (
            <article
              key={item.localId}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              className={`${styles.card} ${styles.virtualCard}`}
              style={{
                width: cardWidthStyle,
                transform: `translateY(${virtualItem.start - scrollMargin}px)`,
                left: `calc(${virtualItem.lane} * (${cardWidthStyle} + ${columnGap}px))`,
              }}
            >
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => onRemove(item)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.removeIcon}>
                  <path
                    d="M7 7l10 10M17 7L7 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <div className={styles.thumbnailFrame}>
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className={`${styles.thumbnail} ${
                    item.status === UploadStatuses.processing
                      ? styles.thumbnailProcessing
                      : ''
                  }`}
                />
                <div
                  className={`${styles.thumbnailSkeleton} ${
                    item.status === UploadStatuses.processing
                      ? styles.thumbnailSkeletonVisible
                      : ''
                  }`}
                  aria-hidden="true"
                />
              </div>

              <div className={styles.cardMeta}>
                <p className={styles.fileName} title={item.name}>
                  {item.name}
                </p>
                <p className={`${styles.status} ${styles[`status${item.status}`]}`}>
                  {statusLabel(item.status)}
                </p>
              </div>

              <div className={styles.fileProgressTrack}>
                <div
                  className={`${styles.fileProgressFill} ${styles[`fill${item.status}`]}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              
            </article>
          )
        })}
      </div>
    </section>
  )
}
