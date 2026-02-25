import { useEffect, useState } from 'react'
import { DropZone } from './components/uploader/DropZone'
import { FilterChips } from './components/uploader/FilterChips'
import { ToastStack } from './components/uploader/ToastStack'
import { UploaderContent } from './components/uploader/UploaderContent'
import { UploaderHeader } from './components/uploader/UploaderHeader'
import { UploadControls } from './components/uploader/UploadControls'
import styles from './UploaderApp.module.css'
import { useUppyUploader } from './hooks/useUppyUploader'
import {
  UploadFilters,
  UploadStatuses,
  type UploadFilter,
  type UploadItem,
} from './types/uploader'

const matchesFilter = (item: UploadItem, filter: UploadFilter): boolean => {
  if (filter === UploadFilters.all) return true
  if (filter === UploadFilters.ready) return item.status === UploadStatuses.pending
  if (filter === UploadFilters.uploaded) return item.status === UploadStatuses.success
  return item.status === UploadStatuses.error
}

function UploaderApp() {
  const [isDragActive, setIsDragActive] = useState(false)
  const [activeFilter, setActiveFilter] = useState<UploadFilter>(UploadFilters.all)

  const authKey = import.meta.env.VITE_TRANSLOADIT_AUTH_KEY ?? ''
  const templateId = import.meta.env.VITE_TRANSLOADIT_TEMPLATE_ID ?? ''
  const {
    items,
    validationToasts,
    isConfigured,
    isUploading,
    hasPending,
    totalBytes,
    uploadedBytes,
    completedFiles,
    addIncomingFiles,
    removeItem,
    uploadAll,
    dismissToast,
  } = useUppyUploader({ authKey, templateId })

  const filterCounts = {
    all: items.length,
    ready: items.filter((item) => item.status === UploadStatuses.pending).length,
    uploaded: items.filter((item) => item.status === UploadStatuses.success).length,
    failed: items.filter((item) => item.status === UploadStatuses.error).length,
  }
  const visibleItems = items.filter((item) => matchesFilter(item, activeFilter))

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const filesFromList = event.clipboardData?.files
        ? Array.from(event.clipboardData.files)
        : []
      const filesFromItems =
        filesFromList.length > 0
          ? []
          : Array.from(event.clipboardData?.items ?? [])
              .map((item) => item.getAsFile())
              .filter((file): file is File => file instanceof File)
      const files = filesFromList.length > 0 ? filesFromList : filesFromItems

      if (files.length === 0) {
        return
      }

      event.preventDefault()
      addIncomingFiles(files)
    }

    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('paste', onPaste)
    }
  }, [addIncomingFiles])

  return (
    <main className={styles.page}>
      <UploaderHeader isConfigured={isConfigured} />

      <DropZone
        isDragActive={isDragActive}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragActive(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragActive(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragActive(false)
          addIncomingFiles(Array.from(event.dataTransfer.files))
        }}
        onFilesSelected={addIncomingFiles}
      />

      <ToastStack toasts={validationToasts} onDismiss={dismissToast} />

      <UploadControls
        hasPending={hasPending}
        isUploading={isUploading}
        isConfigured={isConfigured}
        completedFiles={completedFiles}
        totalFiles={items.length}
        uploadedBytes={uploadedBytes}
        totalBytes={totalBytes}
        onUploadAll={uploadAll}
      />

      {items.length > 0 && (
        <FilterChips
          activeFilter={activeFilter}
          counts={filterCounts}
          onFilterChange={setActiveFilter}
        />
      )}

      <UploaderContent
        items={items}
        visibleItems={visibleItems}
        onRemoveItem={removeItem}
      />
    </main>
  )
}

export default UploaderApp
