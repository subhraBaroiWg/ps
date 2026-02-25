export const UploadStatuses = {
  processing: 'processing',
  pending: 'pending',
  uploading: 'uploading',
  success: 'success',
  error: 'error',
} as const

export type UploadStatus = (typeof UploadStatuses)[keyof typeof UploadStatuses]

export const UploadFilters = {
  all: 'all',
  ready: 'ready',
  uploaded: 'uploaded',
  failed: 'failed',
} as const

export type UploadFilter = (typeof UploadFilters)[keyof typeof UploadFilters]

export interface UploadMeta extends Record<string, unknown> {
  localId: string
  originalName: string
  width: number
  height: number
  fingerprint: string
}

export interface UploadItem {
  localId: string
  uppyId?: string
  fingerprint: string
  name: string
  status: UploadStatus
  progress: number
  bytesUploaded: number
  bytesTotal: number
  previewUrl?: string
  error?: string
}

export interface ValidationToast {
  id: string
  message: string
}
