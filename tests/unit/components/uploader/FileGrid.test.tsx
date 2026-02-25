import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FileGrid } from '../../../../src/components/uploader/FileGrid'
import type { UploadItem } from '../../../../src/types/uploader'

vi.mock('@tanstack/react-virtual', () => ({
  useWindowVirtualizer: () => ({
    getTotalSize: () => 800,
    getVirtualItems: () => [
      { index: 0, lane: 0, start: 0 },
      { index: 1, lane: 0, start: 120 },
    ],
    measureElement: () => undefined,
  }),
}))

const baseItem: UploadItem = {
  localId: '1',
  fingerprint: 'fp1',
  name: 'first.webp',
  status: 'pending',
  progress: 25,
  bytesUploaded: 25,
  bytesTotal: 100,
  previewUrl: 'blob:first',
}

describe('FileGrid', () => {
  it('renders items and removes a card', () => {
    const onRemove = vi.fn()

    render(
      <FileGrid
        items={[
          baseItem,
          { ...baseItem, localId: '2', fingerprint: 'fp2', name: 'second.webp' },
        ]}
        onRemove={onRemove}
      />,
    )

    expect(screen.getByText('first.webp')).toBeInTheDocument()
    expect(screen.getByText('second.webp')).toBeInTheDocument()
    const firstCard = screen.getByText('first.webp').closest('article')
    const removeButton = firstCard?.querySelector('button')
    expect(removeButton).toBeTruthy()
    fireEvent.click(removeButton as HTMLButtonElement)
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ localId: '1' }))
  })
})
