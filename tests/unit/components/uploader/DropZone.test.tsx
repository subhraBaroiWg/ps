import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DropZone } from '../../../../src/components/uploader/DropZone'

describe('DropZone', () => {
  it('renders and delegates selected files', () => {
    const onFilesSelected = vi.fn()
    const pastedFile = new File(['img'], 'picked.jpg', { type: 'image/jpeg' })

    render(
      <DropZone
        isDragActive={false}
        onDragOver={vi.fn()}
        onDragLeave={vi.fn()}
        onDrop={vi.fn()}
        onFilesSelected={onFilesSelected}
      />,
    )

    const fileInput = screen.getByRole('button', { name: 'Browse Files' })
      .closest('section')
      ?.querySelector('input[type="file"]')
    expect(fileInput).toBeTruthy()

    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [pastedFile] },
    })

    expect(onFilesSelected).toHaveBeenCalledWith([pastedFile])
    expect(screen.getByText('Drop images here')).toBeInTheDocument()
  })
})
