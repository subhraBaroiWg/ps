export interface WorkerProcessRequest {
  taskId: string
  name: string
  type: string
  lastModified: number
  arrayBuffer: ArrayBuffer
  maxWidth: number
  quality: number
}

export interface WorkerProcessSuccess {
  taskId: string
  ok: true
  name: string
  type: string
  width: number
  height: number
  originalSize: number
  processedSize: number
  arrayBuffer: ArrayBuffer
}

export interface WorkerProcessFailure {
  taskId: string
  ok: false
  error: string
}

export type WorkerProcessResponse = WorkerProcessSuccess | WorkerProcessFailure
