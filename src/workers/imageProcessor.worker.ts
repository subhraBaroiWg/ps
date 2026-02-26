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

const normalizeQuality = (quality: number): number => Math.max(0.1, Math.min(1, quality))

workerScope.onmessage = async (event: MessageEvent<WorkerProcessRequest>) => {
  const { taskId, arrayBuffer, maxWidth, quality, name, type } = event.data
  let bitmap: ImageBitmap | null = null
  let targetCanvas: OffscreenCanvas | null = null

  try {
    if (typeof createImageBitmap !== 'function') {
      throw new Error('createImageBitmap is unavailable in worker environment')
    }
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('OffscreenCanvas is unavailable in worker environment')
    }

    const sourceBlob = new Blob([arrayBuffer], { type })
    bitmap = await createImageBitmap(sourceBlob)

    if (bitmap.width <= 0 || bitmap.height <= 0) {
      bitmap.close()
      throw new Error('Invalid source image dimensions')
    }

    const targetWidth = Math.min(bitmap.width, maxWidth)
    const targetHeight = Math.max(1, Math.round((bitmap.height * targetWidth) / bitmap.width))

    targetCanvas = new OffscreenCanvas(targetWidth, targetHeight)
    const targetContext = targetCanvas.getContext('2d', { alpha: true })
    if (!targetContext) {
      bitmap.close()
      throw new Error('Unable to create offscreen rendering context')
    }

    targetContext.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
    bitmap.close()
    bitmap = null

    if (typeof targetCanvas.convertToBlob !== 'function') {
      throw new Error('OffscreenCanvas.convertToBlob is unavailable in worker environment')
    }

    const webpBlob = await targetCanvas.convertToBlob({
      type: 'image/webp',
      quality: normalizeQuality(quality),
    })
    const webpBuffer = await webpBlob.arrayBuffer()

    const response: WorkerProcessResponse = {
      taskId,
      ok: true,
      name: toWebpFileName(name),
      type: 'image/webp',
      width: targetWidth,
      height: targetHeight,
      originalSize: sourceBlob.size,
      processedSize: webpBlob.size,
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
  } finally {
    if (bitmap) {
      bitmap.close()
    }
    if (targetCanvas) {
      targetCanvas.width = 1
      targetCanvas.height = 1
    }
  }
}
