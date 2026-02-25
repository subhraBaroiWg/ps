import resize, { initResize } from '@jsquash/resize'
import encodeWebp, { init as initWebpEncode } from '@jsquash/webp/encode'
import type {
  WorkerProcessRequest,
  WorkerProcessResponse,
} from '../types/imageProcessor.types.ts'

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerProcessRequest>) => void) | null
  postMessage: (message: WorkerProcessResponse, transfer?: Transferable[]) => void
}

const toWebpFileName = (name: string): string => {
  const dotIndex = name.lastIndexOf('.')
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name
  return `${base}.webp`
}

let codecsReadyPromise: Promise<void> | null = null

const ensureCodecsReady = (): Promise<void> => {
  if (!codecsReadyPromise) {
    codecsReadyPromise = Promise.all([initResize(), initWebpEncode()]).then(() => {})
  }
  return codecsReadyPromise
}

const toQualityPercent = (quality: number): number =>
  Math.max(1, Math.min(100, Math.round(quality * 100)))

workerScope.onmessage = async (event: MessageEvent<WorkerProcessRequest>) => {
  const { taskId, arrayBuffer, maxWidth, quality, name, type } = event.data

  try {
    await ensureCodecsReady()

    if (typeof createImageBitmap !== 'function') {
      throw new Error('createImageBitmap is unavailable in worker environment')
    }
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('OffscreenCanvas is unavailable in worker environment')
    }

    const sourceBlob = new Blob([arrayBuffer], { type })
    const bitmap = await createImageBitmap(sourceBlob)

    if (bitmap.width <= 0 || bitmap.height <= 0) {
      bitmap.close()
      throw new Error('Invalid source image dimensions')
    }

    const sourceCanvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const sourceContext = sourceCanvas.getContext('2d', { alpha: true })
    if (!sourceContext) {
      bitmap.close()
      throw new Error('Unable to create offscreen rendering context')
    }

    sourceContext.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height)
    bitmap.close()

    const sourceImageData = sourceContext.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    )

    const targetWidth = Math.min(sourceImageData.width, maxWidth)
    const targetHeight = Math.max(
      1,
      Math.round((sourceImageData.height * targetWidth) / sourceImageData.width),
    )

    const resizedImageData =
      targetWidth === sourceImageData.width
        ? sourceImageData
        : await resize(sourceImageData, {
            width: targetWidth,
            height: targetHeight,
          })

    const webpBuffer = await encodeWebp(resizedImageData, {
      quality: toQualityPercent(quality),
    })

    const response: WorkerProcessResponse = {
      taskId,
      ok: true,
      name: toWebpFileName(name),
      type: 'image/webp',
      width: resizedImageData.width,
      height: resizedImageData.height,
      originalSize: sourceBlob.size,
      processedSize: webpBuffer.byteLength,
      arrayBuffer: webpBuffer,
    }

    workerScope.postMessage(response, [webpBuffer])
  } catch (error) {
    const response: WorkerProcessResponse = {
      taskId,
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to convert image to WebP in worker',
    }
    workerScope.postMessage(response)
  }
}
