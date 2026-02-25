import Uppy from '@uppy/core'
import Transloadit from '@uppy/transloadit'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePreprocessor } from '../lib/imagePreprocessor'
import {
  UploadStatuses,
  type UploadItem,
  type UploadMeta,
  type ValidationToast,
} from '../types/uploader'

const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024
const MAX_VISIBLE_TOASTS = 8
const TOAST_AUTO_DISMISS_MS = 5000
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const ACCEPTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp'])
export const FILE_INPUT_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp'

interface UploadProgressPayload {
  bytesUploaded: number
  bytesTotal?: number | null
}

interface UploadSuccessResponse {
  uploadURL?: unknown
  body?: { url?: unknown; ssl_url?: unknown } | null
}

interface UseUppyUploaderOptions {
  authKey: string
  templateId: string
}

interface UseUppyUploaderResult {
  items: UploadItem[]
  validationToasts: ValidationToast[]
  isConfigured: boolean
  isUploading: boolean
  hasPending: boolean
  totalBytes: number
  uploadedBytes: number
  completedFiles: number
  addIncomingFiles: (files: File[]) => void
  removeItem: (item: UploadItem) => void
  uploadAll: () => Promise<unknown>
  dismissToast: (toastId: string) => void
}

interface TestWindowFlags {
  __PICSEE_E2E_MOCKS__?: boolean
}

const isFileTypeAllowed = (file: File): boolean => {
  if (ACCEPTED_MIME_TYPES.has(file.type.toLowerCase())) return true
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ACCEPTED_EXTENSIONS.has(extension)
}

const getFileFingerprint = (file: File): string =>
  `${file.name.toLowerCase()}__${file.size}__${file.lastModified}__${file.type.toLowerCase()}`

const getUploadedLocation = (response: unknown): string | undefined => {
  if (!response || typeof response !== 'object') return undefined
  const candidate = response as UploadSuccessResponse
  if (typeof candidate.uploadURL === 'string') return candidate.uploadURL
  if (typeof candidate.body?.ssl_url === 'string') return candidate.body.ssl_url
  if (typeof candidate.body?.url === 'string') return candidate.body.url
  return undefined
}

export function useUppyUploader(options: UseUppyUploaderOptions): UseUppyUploaderResult {
  const { authKey, templateId } = options
  const isMockMode =
    typeof window !== 'undefined' &&
    Boolean((window as Window & TestWindowFlags).__PICSEE_E2E_MOCKS__)
  const isConfigured = Boolean(authKey && templateId) || isMockMode

  const previewMapRef = useRef<Map<string, string>>(new Map())
  const cancelledIdsRef = useRef<Set<string>>(new Set())
  const itemsRef = useRef<UploadItem[]>([])
  const uploadedFingerprintsRef = useRef<Set<string>>(new Set())
  const uploadedLocationsRef = useRef<Map<string, string>>(new Map())

  const [items, setItems] = useState<UploadItem[]>([])
  const [validationToasts, setValidationToasts] = useState<ValidationToast[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uppy = useMemo(() => {
    const instance = new Uppy<UploadMeta, Record<string, unknown>>({
      autoProceed: false,
      allowMultipleUploadBatches: true,
      debug: false,
    })

    if (isConfigured) {
      instance.use(Transloadit, {
        waitForEncoding: false,
        assemblyOptions: {
          params: { auth: { key: authKey }, template_id: templateId },
        },
      })
    }
    return instance
  }, [authKey, isConfigured, templateId])

  const preprocessor = useMemo(() => new ImagePreprocessor({ maxWidth: 1600 }), [])

  const showValidationToast = useCallback((message: string) => {
    const id = crypto.randomUUID()
    setValidationToasts((current) => [{ id, message }, ...current].slice(0, MAX_VISIBLE_TOASTS))
    window.setTimeout(() => {
      setValidationToasts((current) => current.filter((toast) => toast.id !== id))
    }, TOAST_AUTO_DISMISS_MS)
  }, [])

  const dismissToast = useCallback((toastId: string) => {
    setValidationToasts((current) => current.filter((toast) => toast.id !== toastId))
  }, [])

  const updateItem = useCallback((localId: string, updater: (item: UploadItem) => UploadItem) => {
    setItems((current) =>
      current.map((item) => (item.localId === localId ? updater(item) : item)),
    )
  }, [])

  const revokePreview = useCallback((localId: string) => {
    const url = previewMapRef.current.get(localId)
    if (!url) return
    URL.revokeObjectURL(url)
    previewMapRef.current.delete(localId)
  }, [])

  const replacePreview = useCallback((localId: string, nextUrl: string) => {
    const previousUrl = previewMapRef.current.get(localId)
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl)
    }
    previewMapRef.current.set(localId, nextUrl)
    updateItem(localId, (item) => ({
      ...item,
      previewUrl: nextUrl,
    }))
  }, [updateItem])

  const queueProcessing = useCallback(
    async (rawFile: File, localId: string, fingerprint: string) => {
      try {
        if (isMockMode) {
          if (rawFile.name.toLowerCase().includes('fail')) {
            throw new Error('Mock processing failure')
          }

          const nameWithoutExt = rawFile.name.replace(/\.[^/.]+$/, '')
          const mockedProcessedFile = new File([rawFile], `${nameWithoutExt}.webp`, {
            type: 'image/webp',
            lastModified: rawFile.lastModified,
          })

          updateItem(localId, (item) => ({
            ...item,
            name: mockedProcessedFile.name,
            status: UploadStatuses.pending,
            error: undefined,
            bytesUploaded: 0,
            bytesTotal: mockedProcessedFile.size,
          }))
          return
        }

        const processed = await preprocessor.process(rawFile)
        if (cancelledIdsRef.current.has(localId)) {
          cancelledIdsRef.current.delete(localId)
          revokePreview(localId)
          return
        }

        const processedPreviewUrl = URL.createObjectURL(processed.file)
        replacePreview(localId, processedPreviewUrl)

        const uppyId = uppy.addFile({
          name: processed.file.name,
          type: processed.file.type,
          data: processed.file,
          source: 'local',
          meta: {
            localId,
            originalName: rawFile.name,
            width: processed.width,
            height: processed.height,
            fingerprint,
          },
        })

        updateItem(localId, (item) => ({
          ...item,
          uppyId,
          name: processed.file.name,
          status: UploadStatuses.pending,
          error: undefined,
          bytesUploaded: 0,
          bytesTotal: processed.file.size,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Processing failed'
        updateItem(localId, (item) => ({
          ...item,
          status: UploadStatuses.error,
          error: `Processing error: ${message}`,
        }))
      }
    },
    [isMockMode, preprocessor, replacePreview, revokePreview, updateItem, uppy],
  )

  const addIncomingFiles = useCallback(
    (files: File[]) => {
      const errors: string[] = []

      files.forEach((file) => {
        const fingerprint = getFileFingerprint(file)
        if (!isFileTypeAllowed(file)) {
          errors.push(`"${file.name}" is not a supported image type.`)
          return
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          errors.push(`"${file.name}" exceeds the 30 MB size limit.`)
          return
        }
        if (uploadedFingerprintsRef.current.has(fingerprint)) {
          const knownUrl = uploadedLocationsRef.current.get(fingerprint)
          errors.push(
            knownUrl
              ? `"${file.name}" was already uploaded earlier (${knownUrl}).`
              : `"${file.name}" was already uploaded earlier.`,
          )
          return
        }
        if (itemsRef.current.some((item) => item.fingerprint === fingerprint)) {
          errors.push(`"${file.name}" is already in your current queue.`)
          return
        }

        const localId = crypto.randomUUID()
        const previewUrl = URL.createObjectURL(file)
        previewMapRef.current.set(localId, previewUrl)

        setItems((current) => [
          ...current,
          {
            localId,
            fingerprint,
            name: file.name,
            status: UploadStatuses.processing,
            progress: 0,
            bytesUploaded: 0,
            bytesTotal: 0,
            previewUrl,
          },
        ])

        queueProcessing(file, localId, fingerprint)
      })

      errors.forEach(showValidationToast)
    },
    [queueProcessing, showValidationToast],
  )

  const removeItem = useCallback(
    (item: UploadItem) => {
      if (item.status === UploadStatuses.success) {
        uploadedLocationsRef.current.delete(item.fingerprint)
        uploadedFingerprintsRef.current.delete(item.fingerprint)
      }

      cancelledIdsRef.current.add(item.localId)
      if (item.uppyId) {
        uppy.removeFile(item.uppyId)
        return
      }
      setItems((current) => current.filter((currentItem) => currentItem.localId !== item.localId))
      revokePreview(item.localId)
    },
    [revokePreview, uppy],
  )

  const uploadAll = useCallback(async () => {
    if (isUploading) {
      return Promise.resolve({ successful: [] })
    }

    setIsUploading(true)
    try {
      if (isMockMode) {
        setItems((current) =>
          current.map((item) =>
            item.status === UploadStatuses.pending
              ? {
                  ...item,
                  status: UploadStatuses.success,
                  progress: 100,
                  bytesUploaded: item.bytesTotal,
                }
              : item,
          ),
        )
        return { successful: [] }
      }

      return await uppy.upload()
    } finally {
      setIsUploading(false)
    }
  }, [isMockMode, isUploading, uppy])

  // Keep effects grouped together for easier lifecycle scanning.
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    const onUploadProgress = (
      file: { meta: UploadMeta; size?: number | null } | undefined,
      progress: UploadProgressPayload,
    ) => {
      if (!file) return
      updateItem(file.meta.localId, (item) => {
        const total = progress.bytesTotal ?? file.size ?? item.bytesTotal
        const percent = total > 0 ? (progress.bytesUploaded / total) * 100 : 0
        return {
          ...item,
          status: UploadStatuses.uploading,
          progress: Math.min(percent, 100),
          bytesUploaded: progress.bytesUploaded,
          bytesTotal: total,
        }
      })
    }

    const onUploadSuccess = (
      file: { meta: UploadMeta; size?: number | null } | undefined,
      response: unknown,
    ) => {
      if (!file) return
      uploadedFingerprintsRef.current.add(file.meta.fingerprint)
      const uploadedLocation = getUploadedLocation(response)
      if (uploadedLocation) {
        uploadedLocationsRef.current.set(file.meta.fingerprint, uploadedLocation)
      }
      updateItem(file.meta.localId, (item) => ({
        ...item,
        status: UploadStatuses.success,
        progress: 100,
        bytesUploaded: item.bytesTotal || file.size || item.bytesUploaded,
      }))
    }

    const onUploadError = (
      file: { meta: UploadMeta } | undefined,
      error: { message?: string },
    ) => {
      if (!file) return
      updateItem(file.meta.localId, (item) => ({
        ...item,
        status: UploadStatuses.error,
        error: error.message || 'Upload failed',
      }))
    }

    const onFileRemoved = (file: { meta: UploadMeta }) => {
      const localId = file.meta.localId
      setItems((current) => current.filter((item) => item.localId !== localId))
      revokePreview(localId)
      cancelledIdsRef.current.delete(localId)
    }

    uppy.on('upload-progress', onUploadProgress)
    uppy.on('upload-success', onUploadSuccess)
    uppy.on('upload-error', onUploadError)
    uppy.on('file-removed', onFileRemoved)

    return () => {
      uppy.off('upload-progress', onUploadProgress)
      uppy.off('upload-success', onUploadSuccess)
      uppy.off('upload-error', onUploadError)
      uppy.off('file-removed', onFileRemoved)
    }
  }, [revokePreview, updateItem, uppy])

  useEffect(() => {
    const previewMap = previewMapRef.current
    return () => {
      uppy.cancelAll()
      uppy.destroy()
      preprocessor.terminate()
      previewMap.forEach((url) => URL.revokeObjectURL(url))
      previewMap.clear()
    }
  }, [preprocessor, uppy])

  const totalBytes = items.reduce((sum, item) => sum + item.bytesTotal, 0)
  const uploadedBytes = items.reduce(
    (sum, item) =>
      sum + (item.status === UploadStatuses.success ? item.bytesTotal : item.bytesUploaded),
    0,
  )
  const completedFiles = items.filter((item) => item.status === UploadStatuses.success).length
  const hasPending = items.some(
    (item) =>
      item.status === UploadStatuses.pending || item.status === UploadStatuses.error,
  )

  return {
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
  }
}
