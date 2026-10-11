/**
 * @import {Element, ElementContent, Properties} from 'hast'
 * @import {FileInfo, Options, Provider} from '../index.js'
 */

import fs from 'node:fs/promises'
import path from 'node:path'

/** @type {Record<string, Provider>} */
export const providers = {
  google: (hostname, size) =>
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`,
  duckduckgo: (hostname) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`
}

const defaultCacheDir = path.join('node_modules', '.cache', 'rehype-link-favicons')
// A favicon bigger than this is not worth inlining into every page that links to the site.
const maxBytes = 50_000

/**
 * The processor-independent part of the plugin: which links get an icon, and what the icon is.
 *
 * @param {Options | null | undefined} options
 */
export function createLinkFavicons(options) {
  const settings = options || {}
  const size = settings.size || 16
  const fetchSize = size * 2
  const inline = settings.inline !== false
  const timeout = settings.timeout || 5000
  const doFetch = settings.fetch || globalThis.fetch
  const ignoreHosts = (settings.ignoreHosts || []).map((host) => host.toLowerCase())
  const cacheDir =
    settings.cacheDir === false ? undefined : path.resolve(settings.cacheDir || defaultCacheDir)
  const providerList = (settings.providers || ['google', 'duckduckgo']).map((provider) => {
    if (typeof provider === 'function') return provider
    if (provider in providers) return providers[provider]
    throw new Error(`rehype-link-favicons: unknown provider \`${provider}\``)
  })

  /** @type {Map<string, Promise<string | undefined>>} */
  const memory = new Map()

  return {
    position: settings.position || 'start',

    /**
     * The hostname to show an icon for, or `undefined` to leave the link alone.
     *
     * @param {Element} element
     * @param {FileInfo} file
     * @returns {string | undefined}
     */
    match(element, file) {
      const hostname = externalHostname(element.properties.href)
      if (!hostname) return
      if (ignoreHosts.some((host) => hostname === host || hostname.endsWith('.' + host))) return
      if (!hasText(element) || hasImage(element)) return
      if (settings.filter && !settings.filter(element, file)) return
      return hostname
    },

    /**
     * The `<img>` to insert for `hostname`, or `undefined` when there is no icon.
     *
     * @param {string} hostname
     * @returns {Promise<Element | undefined>}
     */
    async icon(hostname) {
      const src = inline ? await favicon(hostname) : providerList[0](hostname, fetchSize)
      if (!src) return
      return {
        type: 'element',
        tagName: 'img',
        properties: {
          src,
          alt: '',
          width: size,
          height: size,
          loading: 'lazy',
          decoding: 'async',
          className: ['link-favicon'],
          ...settings.properties
        },
        children: []
      }
    }
  }

  /**
   * Resolve the favicon of `hostname` to a data URI, once per hostname.
   *
   * @param {string} hostname
   * @returns {Promise<string | undefined>}
   */
  function favicon(hostname) {
    let promise = memory.get(hostname)
    if (!promise) {
      promise = load(hostname)
      memory.set(hostname, promise)
    }
    return promise
  }

  /**
   * @param {string} hostname
   * @returns {Promise<string | undefined>}
   */
  async function load(hostname) {
    const cacheFile = cacheDir
      ? path.join(cacheDir, `${hostname.replace(/[^a-z\d.-]/g, '_')}-${fetchSize}.txt`)
      : undefined

    if (cacheFile) {
      try {
        return await fs.readFile(cacheFile, 'utf8')
      } catch {}
    }

    for (const provider of providerList) {
      const dataUri = await download(provider(hostname, fetchSize))
      if (!dataUri) continue
      if (cacheFile) {
        await fs.mkdir(path.dirname(cacheFile), {recursive: true})
        await fs.writeFile(cacheFile, dataUri)
      }
      return dataUri
    }
  }

  /**
   * @param {string} url
   * @returns {Promise<string | undefined>}
   */
  async function download(url) {
    try {
      const response = await doFetch(url, {signal: AbortSignal.timeout(timeout)})
      // Google and DuckDuckGo answer unknown sites with a 404 and a generic globe image.
      if (!response.ok) return
      const type = (response.headers.get('content-type') || '').split(';')[0].trim()
      if (!type.startsWith('image/')) return
      const body = Buffer.from(await response.arrayBuffer())
      if (body.length === 0 || body.length > maxBytes) return
      return `data:${type};base64,${body.toString('base64')}`
    } catch {
      // Offline or timed out: build without the icon rather than failing the build.
    }
  }
}

/**
 * @param {Properties[string]} href
 * @returns {string | undefined}
 */
function externalHostname(href) {
  if (typeof href !== 'string') return
  let url
  try {
    url = new URL(href)
  } catch {
    return
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  return url.hostname || undefined
}

/**
 * @param {Element | ElementContent} node
 * @returns {boolean}
 */
function hasText(node) {
  if (node.type === 'text') return node.value.trim() !== ''
  return 'children' in node && node.children.some(hasText)
}

/**
 * @param {Element | ElementContent} node
 * @returns {boolean}
 */
function hasImage(node) {
  if (node.type !== 'element') return false
  if (node.tagName === 'img' || node.tagName === 'svg' || node.tagName === 'picture') return true
  return node.children.some(hasImage)
}
