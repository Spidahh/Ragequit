// Local shims for client typecheck in CI environments where vite/client and
// the colyseus.js bundle types aren't yet hydrated.
declare interface ImportMetaEnv {
  readonly [key: string]: string | undefined
}
declare interface ImportMeta {
  readonly env: ImportMetaEnv
}
