/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POS_SECRET: string
  readonly VITE_OWNER_PIN_HASH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
