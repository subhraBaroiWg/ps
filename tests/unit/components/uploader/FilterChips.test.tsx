import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FilterChips } from '../../../../src/components/uploader/FilterChips'

describe('FilterChips', () => {
  it('calls onFilterChange when selecting a chip', () => {
    const onFilterChange = vi.fn()

    render(
      <FilterChips
        activeFilter="all"
        counts={{ all: 4, ready: 1, uploaded: 2, failed: 1 }}
        onFilterChange={onFilterChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Uploaded (2)' }))
    expect(onFilterChange).toHaveBeenCalledWith('uploaded')
  })
})
