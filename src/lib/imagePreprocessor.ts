import type {
  WorkerProcessRequest,
  WorkerProcessResponse,
} from '../types/imageProcessor.types.ts'

interface WorkerTask {
  taskId: string
  file: File
  resolve: (result: ProcessedImageResult) => void
  reject: (reason: Error) => void
}

interface WorkerSlot {
  worker: Worker
  activeTask: WorkerTask | null
  timeoutId: number | null
}

export interface ProcessedImageResult {
  file: File
  width: number
  height: number
  originalSize: number
  processedSize: number
}

interface ImagePreprocessorConfig {
  concurrency?: number
  maxWidth?: number
  quality?: number
  taskTimeoutMs?: number
}

export class ImagePreprocessor {
  private readonly queue: WorkerTask[] = []

  private readonly workers: WorkerSlot[] = []

  private readonly maxWidth: number

  private readonly quality: number

  private readonly taskTimeoutMs: number

  private isTerminated = false

  constructor(config: ImagePreprocessorConfig = {}) {
    const hardwareConcurrency = navigator.hardwareConcurrency || 4
    const workerCount = Math.max(
      2,
      Math.min(config.concurrency ?? Math.ceil(hardwareConcurrency / 2), 6),
    )

    this.maxWidth = config.maxWidth ?? 1600
    this.quality = config.quality ?? 0.86
    this.taskTimeoutMs = config.taskTimeoutMs ?? 360_000

    for (let index = 0; index < workerCount; index += 1) {
      this.workers.push(this.createWorkerSlot())
    }
  }

  process(file: File): Promise<ProcessedImageResult> {
    if (typeof Worker !== 'function') {
      return Promise.reject(
        new Error('Web Workers are unavailable in this browser environment'),
      )
    }

    if (this.isTerminated) {
      return Promise.reject(new Error('Image preprocessor is terminated'))
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        taskId: crypto.randomUUID(),
        file,
        resolve,
        reject,
      })
      this.processQueue()
    })
  }

  terminate(): void {
    this.isTerminated = true

    this.workers.forEach((slot) => {
      this.clearTaskTimeout(slot)
      if (slot.activeTask) {
        slot.activeTask.reject(new Error('Processing queue has been terminated'))
        slot.activeTask = null
      }
      slot.worker.terminate()
    })

    while (this.queue.length > 0) {
      const pending = this.queue.shift()
      if (pending) {
        pending.reject(new Error('Processing queue has been terminated'))
      }
    }

  }

  private processQueue(): void {
    if (this.isTerminated) {
      return
    }

    for (const slot of this.workers) {
      if (slot.activeTask || this.queue.length === 0) {
        continue
      }

      const task = this.queue.shift()
      if (!task) {
        continue
      }

      this.startTaskInSlot(slot, task)
    }
  }

  private createWorkerSlot(): WorkerSlot {
    const slot: WorkerSlot = {
      worker: new Worker(new URL('../workers/imageProcessor.worker.ts', import.meta.url), {
        type: 'module',
      }),
      activeTask: null,
      timeoutId: null,
    }

    slot.worker.onmessage = (event: MessageEvent<WorkerProcessResponse>) => {
      const response = event.data
      const task = slot.activeTask
      this.clearTaskTimeout(slot)

      if (!task || task.taskId !== response.taskId) {
        return
      }

      slot.activeTask = null

      if (!response.ok) {
        task.reject(new Error(response.error))
        this.processQueue()
        return
      }

      const outputFile = new File([response.arrayBuffer], response.name, {
        type: response.type,
        lastModified: task.file.lastModified,
      })

      task.resolve({
        file: outputFile,
        width: response.width,
        height: response.height,
        originalSize: response.originalSize,
        processedSize: response.processedSize,
      })
      this.processQueue()
    }

    slot.worker.onerror = (event) => {
      this.failActiveTaskAndReplaceWorker(
        slot,
        event.message || 'Worker failed while processing image',
      )
    }

    slot.worker.onmessageerror = () => {
      this.failActiveTaskAndReplaceWorker(slot, 'Worker message transfer failed')
    }

    return slot
  }

  private startTaskInSlot(slot: WorkerSlot, task: WorkerTask): void {
    slot.activeTask = task

    task.file
      .arrayBuffer()
      .then((arrayBuffer) => {
        const payload: WorkerProcessRequest = {
          taskId: task.taskId,
          name: task.file.name,
          type: task.file.type,
          lastModified: task.file.lastModified,
          arrayBuffer,
          maxWidth: this.maxWidth,
          quality: this.quality,
        }

        slot.worker.postMessage(payload, [arrayBuffer])
        this.armTaskTimeout(slot)
      })
      .catch((error) => {
        slot.activeTask = null
        task.reject(new Error(error instanceof Error ? error.message : 'Failed to read source file'))
        this.processQueue()
      })
  }

  private armTaskTimeout(slot: WorkerSlot): void {
    this.clearTaskTimeout(slot)

    slot.timeoutId = window.setTimeout(() => {
      const task = slot.activeTask
      if (!task) {
        return
      }

      this.replaceWorker(slot)
      task.reject(
        new Error('Image conversion timed out in worker. Please retry or reduce large batch size.'),
      )
      this.processQueue()
    }, this.taskTimeoutMs)
  }

  private clearTaskTimeout(slot: WorkerSlot): void {
    if (slot.timeoutId !== null) {
      window.clearTimeout(slot.timeoutId)
      slot.timeoutId = null
    }
  }

  private failActiveTaskAndReplaceWorker(slot: WorkerSlot, message: string): void {
    const task = slot.activeTask
    this.replaceWorker(slot)
    if (task) {
      task.reject(new Error(message))
    }
    this.processQueue()
  }

  private replaceWorker(slot: WorkerSlot): void {
    this.clearTaskTimeout(slot)
    slot.worker.terminate()
    const replacement = this.createWorkerSlot()
    slot.worker = replacement.worker
    slot.activeTask = null
    slot.timeoutId = null
  }

}
