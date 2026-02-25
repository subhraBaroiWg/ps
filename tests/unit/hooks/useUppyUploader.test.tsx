import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUppyUploader } from '../../../src/hooks/useUppyUploader'

const uppyAddFileMock = vi.fn(() => 'uppy-file-id')
const uppyUseMock = vi.fn()
const uppyOnMock = vi.fn()
const uppyOffMock = vi.fn()
const uppyRemoveFileMock = vi.fn()
const uppyUploadMock = vi.fn(() => Promise.resolve({ successful: [] }))
const uppyCancelAllMock = vi.fn()
const uppyDestroyMock = vi.fn()

const preprocessorProcessMock = vi.fn()
const preprocessorTerminateMock = vi.fn()

vi.mock('@uppy/core', () => {
  class MockUppy {
    use = uppyUseMock
    addFile = uppyAddFileMock
    on = uppyOnMock
    off = uppyOffMock
    removeFile = uppyRemoveFileMock
    upload = uppyUploadMock
    cancelAll = uppyCancelAllMock
    destroy = uppyDestroyMock
  }

  return { default: MockUppy }
})

vi.mock('@uppy/transloadit', () => ({ default: vi.fn() }))

vi.mock('../../../src/lib/imagePreprocessor', () => {
  class MockImagePreprocessor {
    process = preprocessorProcessMock
    terminate = preprocessorTerminateMock
  }

  return { ImagePreprocessor: MockImagePreprocessor }
})

describe('useUppyUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    preprocessorProcessMock.mockResolvedValue({
      file: new File(['processed'], 'processed.webp', { type: 'image/webp' }),
      width: 100,
      height: 100,
      originalSize: 100,
      processedSize: 80,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows validation toast for unsupported files', async () => {
    const { result } = renderHook(() =>
      useUppyUploader({ authKey: 'k', templateId: 't' }),
    )

    await act(async () => {
      result.current.addIncomingFiles([
        new File(['text'], 'bad.txt', { type: 'text/plain' }),
      ])
    })

    await waitFor(() => {
      expect(result.current.validationToasts.length).toBe(1)
    })
    expect(result.current.validationToasts[0].message).toContain(
      '"bad.txt" is not a supported image type.',
    )
  })

  it('queues supported file and delegates uploadAll to uppy', async () => {
    const { result } = renderHook(() =>
      useUppyUploader({ authKey: 'k', templateId: 't' }),
    )

    await act(async () => {
      result.current.addIncomingFiles([
        new File(['img'], 'good.jpg', { type: 'image/jpeg' }),
      ])
    })

    await waitFor(() => {
      expect(result.current.items.length).toBe(1)
      expect(result.current.items[0].status).toBe('pending')
      expect(result.current.items[0].uppyId).toBe('uppy-file-id')
    })

    await act(async () => {
      await result.current.uploadAll()
    })

    expect(uppyUploadMock).toHaveBeenCalledTimes(1)
  })

  it('dismisses toast by id', async () => {
    const { result } = renderHook(() =>
      useUppyUploader({ authKey: 'k', templateId: 't' }),
    )

    await act(async () => {
      result.current.addIncomingFiles([
        new File(['text'], 'bad.txt', { type: 'text/plain' }),
      ])
    })

    await waitFor(() => {
      expect(result.current.validationToasts.length).toBe(1)
    })
    const toastId = result.current.validationToasts[0].id

    act(() => {
      result.current.dismissToast(toastId)
    })

    expect(result.current.validationToasts).toHaveLength(0)
  })

  it('removes uploaded file from UI state without remote delete call', async () => {
    const { result } = renderHook(() =>
      useUppyUploader({ authKey: 'k', templateId: 't' }),
    )

    await act(async () => {
      result.current.addIncomingFiles([
        new File(['img'], 'remote-delete.jpg', { type: 'image/jpeg' }),
      ])
    })

    await waitFor(() => {
      expect(result.current.items[0]?.uppyId).toBe('uppy-file-id')
    })

    const uploadSuccessCall = uppyOnMock.mock.calls.find(
      ([eventName]) => eventName === 'upload-success',
    )
    expect(uploadSuccessCall).toBeTruthy()
    const onUploadSuccess = uploadSuccessCall?.[1] as (
      file: { meta: { localId: string; fingerprint: string }; size?: number | null },
      response: unknown,
    ) => void

    const currentItem = result.current.items[0]
    act(() => {
      onUploadSuccess(
        {
          meta: {
            localId: currentItem.localId,
            fingerprint: currentItem.fingerprint,
          },
          size: currentItem.bytesTotal,
        },
        { uploadURL: 'https://example.com/any-upload-id' },
      )
    })

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe('success')
    })

    act(() => {
      result.current.removeItem(result.current.items[0])
    })

    expect(uppyRemoveFileMock).toHaveBeenCalledWith('uppy-file-id')
  })
})
