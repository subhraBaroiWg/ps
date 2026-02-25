import { UploadStatuses, type UploadStatus } from '../types/uploader'

export const bytesToHuman = (bytes: number): string => {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** unit
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

export const statusLabel = (status: UploadStatus): string => {
  if (status === UploadStatuses.processing) return 'Processing'
  if (status === UploadStatuses.pending) return 'Ready for upload'
  if (status === UploadStatuses.uploading) return 'Uploading'
  if (status === UploadStatuses.success) return 'Uploaded'
  return 'Failed'
}
