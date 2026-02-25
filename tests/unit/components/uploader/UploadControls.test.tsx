import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UploadControls } from '../../../../src/components/uploader/UploadControls'

describe('UploadControls', () => {
  it('renders metrics and disabled button state', () => {
    render(
      <UploadControls
        hasPending={false}
        isUploading={false}
        isConfigured={true}
        completedFiles={1}
        totalFiles={4}
        uploadedBytes={1024}
        totalBytes={2048}
        onUploadAll={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Upload All' })).toBeDisabled()
    expect(screen.getByText('1/4 completed')).toBeInTheDocument()
  })
})
