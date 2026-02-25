import { describe, expect, it } from 'vitest'
import { bytesToHuman, statusLabel } from '../../../src/utils/uploaderFormatters'

describe('bytesToHuman', () => {
  it('formats 0 bytes', () => {
    expect(bytesToHuman(0)).toBe('0 B')
  })

  it('formats megabytes', () => {
    expect(bytesToHuman(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('statusLabel', () => {
  it('maps statuses to readable labels', () => {
    expect(statusLabel('processing')).toBe('Processing')
    expect(statusLabel('pending')).toBe('Ready for upload')
    expect(statusLabel('uploading')).toBe('Uploading')
    expect(statusLabel('success')).toBe('Uploaded')
    expect(statusLabel('error')).toBe('Failed')
  })
})
