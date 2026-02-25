/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRANSLOADIT_AUTH_KEY: string
  readonly VITE_TRANSLOADIT_TEMPLATE_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
