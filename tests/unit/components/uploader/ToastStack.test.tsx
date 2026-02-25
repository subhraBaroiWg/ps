import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastStack } from '../../../../src/components/uploader/ToastStack'

describe('ToastStack', () => {
  it('renders toasts and handles dismiss click', () => {
    const onDismiss = vi.fn()

    render(
      <ToastStack
        toasts={[{ id: 'toast-1', message: 'Something failed' }]}
        onDismiss={onDismiss}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(onDismiss).toHaveBeenCalledWith('toast-1')
  })
})
