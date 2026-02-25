import { afterEach, describe, expect, it } from 'vitest'
import { ImagePreprocessor } from '../../../src/lib/imagePreprocessor'

class MockWorker {
  static terminateCalls = 0
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null

  postMessage() {}

  terminate() {
    MockWorker.terminateCalls += 1
  }
}

const originalWorker = globalThis.Worker

describe('ImagePreprocessor', () => {
  afterEach(() => {
    globalThis.Worker = originalWorker
    MockWorker.terminateCalls = 0
  })

  it('rejects processing after terminate is called', async () => {
    globalThis.Worker = MockWorker as unknown as typeof Worker
    const preprocessor = new ImagePreprocessor({ concurrency: 2 })

    preprocessor.terminate()
    await expect(
      preprocessor.process(new File(['img'], 'image.jpg', { type: 'image/jpeg' })),
    ).rejects.toThrow('Image preprocessor is terminated')
  })

  it('terminates created worker slots', () => {
    globalThis.Worker = MockWorker as unknown as typeof Worker
    const preprocessor = new ImagePreprocessor({ concurrency: 2 })

    preprocessor.terminate()
    expect(MockWorker.terminateCalls).toBeGreaterThanOrEqual(2)
  })
})
