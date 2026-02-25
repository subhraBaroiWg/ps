import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@jsquash/resize', () => ({
  default: vi.fn(),
  initResize: vi.fn(() => Promise.resolve()),
}))

vi.mock('@jsquash/webp/encode', () => ({
  default: vi.fn(),
  init: vi.fn(() => Promise.resolve()),
}))

describe('imageProcessor.worker', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('posts a failure response when createImageBitmap is unavailable', async () => {
    const posted: unknown[] = []
    const workerSelf: {
      onmessage: ((event: MessageEvent) => Promise<void>) | null
      setTimeout: typeof setTimeout
      clearTimeout: typeof clearTimeout
      postMessage: (message: unknown, transfer?: Transferable[]) => void
    } = {
      onmessage: null,
      setTimeout,
      clearTimeout,
      postMessage: (message) => {
        posted.push(message)
      },
    }

    vi.stubGlobal('self', workerSelf)
    vi.stubGlobal('createImageBitmap', undefined)

    await import('../../../src/workers/imageProcessor.worker.ts')

    expect(workerSelf.onmessage).toBeTypeOf('function')

    await workerSelf.onmessage?.({
      data: {
        taskId: 'task-1',
        name: 'test.jpg',
        type: 'image/jpeg',
        lastModified: Date.now(),
        arrayBuffer: new ArrayBuffer(8),
        maxWidth: 1600,
        quality: 0.86,
      },
    } as MessageEvent)

    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      taskId: 'task-1',
      ok: false,
    })
    expect((posted[0] as { error: string }).error).toContain(
      'createImageBitmap is unavailable',
    )
  })
})
