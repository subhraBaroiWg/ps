import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UploaderApp from '../../../src/UploaderApp'
import type { UploadItem } from '../../../src/types/uploader'

const { fileGridSpy, useUppyUploaderMock, addIncomingFilesMock } = vi.hoisted(() => ({
  fileGridSpy: vi.fn(),
  useUppyUploaderMock: vi.fn(),
  addIncomingFilesMock: vi.fn(),
}))

vi.mock('../../../src/hooks/useUppyUploader', () => ({
  FILE_INPUT_ACCEPT:
    'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp',
  useUppyUploader: useUppyUploaderMock,
}))

vi.mock('../../../src/components/uploader/FileGrid', () => ({
  FileGrid: (props: { items: UploadItem[] }) => {
    fileGridSpy(props)
    return <div data-testid="mock-file-grid">{props.items.length}</div>
  },
}))

const sampleItems: UploadItem[] = [
  {
    localId: '1',
    fingerprint: 'fp1',
    name: 'pending.webp',
    status: 'pending',
    progress: 0,
    bytesUploaded: 0,
    bytesTotal: 100,
  },
  {
    localId: '2',
    fingerprint: 'fp2',
    name: 'uploaded.webp',
    status: 'success',
    progress: 100,
    bytesUploaded: 100,
    bytesTotal: 100,
  },
  {
    localId: '3',
    fingerprint: 'fp3',
    name: 'failed.webp',
    status: 'error',
    progress: 30,
    bytesUploaded: 30,
    bytesTotal: 100,
  },
]

describe('UploaderApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUppyUploaderMock.mockReturnValue({
      items: sampleItems,
      validationToasts: [],
      isConfigured: false,
      isUploading: false,
      hasPending: true,
      totalBytes: 300,
      uploadedBytes: 130,
      completedFiles: 1,
      addIncomingFiles: addIncomingFilesMock,
      removeItem: vi.fn(),
      uploadAll: vi.fn(async () => ({})),
      dismissToast: vi.fn(),
    })
  })

  it('shows env warning when uploader is not configured', () => {
    render(<UploaderApp />)
    expect(
      screen.getByText(
        /Set `VITE_TRANSLOADIT_AUTH_KEY` and `VITE_TRANSLOADIT_TEMPLATE_ID` in `.env`\./,
      ),
    ).toBeInTheDocument()
  })

  it('applies filter selection and forwards filtered items to FileGrid', () => {
    render(<UploaderApp />)

    fireEvent.click(screen.getByRole('button', { name: 'Uploaded (1)' }))

    expect(screen.getByTestId('mock-file-grid')).toHaveTextContent('1')
    const latestCall = fileGridSpy.mock.calls.at(-1)?.[0] as { items: UploadItem[] }
    expect(latestCall.items).toHaveLength(1)
    expect(latestCall.items[0].status).toBe('success')
  })

  it('queues clipboard files when user pastes', () => {
    render(<UploaderApp />)

    const pastedFile = new File(['img'], 'pasted.jpg', { type: 'image/jpeg' })
    const pasteEvent = new Event('paste') as ClipboardEvent
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        files: [pastedFile],
        items: [],
      },
    })

    window.dispatchEvent(pasteEvent)

    expect(addIncomingFilesMock).toHaveBeenCalledWith([pastedFile])
  })

  it('forwards pasted non-image files to validation flow', () => {
    render(<UploaderApp />)

    const pastedFile = new File(['text'], 'pasted.txt', { type: 'text/plain' })
    const pasteEvent = new Event('paste') as ClipboardEvent
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        files: [pastedFile],
        items: [],
      },
    })

    window.dispatchEvent(pasteEvent)

    expect(addIncomingFilesMock).toHaveBeenCalledWith([pastedFile])
  })
})
