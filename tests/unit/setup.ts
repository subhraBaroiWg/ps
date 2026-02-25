import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  // Minimal test polyfill used by virtualized grid.
  ;(window as unknown as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
    ResizeObserverMock
}

if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:test-url'
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => undefined
}

afterEach(() => {
  cleanup()
})
