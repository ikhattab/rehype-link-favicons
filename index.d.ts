import type {Element, Properties, Root} from 'hast'
import type {VFile} from 'vfile'

/** The document being processed. A `VFile` with rehype; `{path}` from `fileURL` with Sätteri. */
export interface FileInfo {
  readonly path?: string | undefined
}

/** Build the favicon URL for `hostname`, at `size` pixels when the service supports it. */
export type Provider = (hostname: string, size: number) => string

export interface Options {
  /**
   * Favicon services to try, in order. When one has no icon for a site, the next one is tried.
   * @default ['google', 'duckduckgo']
   */
  providers?: Array<'google' | 'duckduckgo' | Provider>
  /**
   * Rendered width and height in pixels. Icons are fetched at twice this size for sharp screens.
   * @default 16
   */
  size?: number
  /**
   * Put the icon before (`'start'`) or after (`'end'`) the link text.
   * @default 'start'
   */
  position?: 'start' | 'end'
  /**
   * Download each icon at build time and embed it as a data URI. When `false`, the `src` points
   * at the first provider, so visitors' browsers request it and there is no fallback.
   * @default true
   */
  inline?: boolean
  /**
   * Directory where downloaded icons are cached between builds, or `false` to disable the cache.
   * @default 'node_modules/.cache/rehype-link-favicons'
   */
  cacheDir?: string | false
  /**
   * Hostnames that never get an icon. Subdomains match too: `example.com` covers `www.example.com`.
   */
  ignoreHosts?: string[]
  /** Return `false` to leave a link alone. `file.path` is the document being processed. */
  filter?: (element: Element, file: FileInfo) => boolean
  /**
   * Extra properties for the `<img>`, merged over the defaults
   * (`alt: ''`, `className: ['link-favicon']`, `loading: 'lazy'`, ...).
   */
  properties?: Properties
  /**
   * Milliseconds to wait for each favicon request.
   * @default 5000
   */
  timeout?: number
  /** `fetch` implementation, for tests or proxies. */
  fetch?: typeof globalThis.fetch
}

export const providers: Record<'google' | 'duckduckgo', Provider>

export default function rehypeLinkFavicons(
  options?: Options | null
): (tree: Root, file: VFile) => Promise<void>
