/**
 * @import {Element} from 'hast'
 * @import {HastPluginDefinition} from 'satteri'
 * @import {Options} from '../index.js'
 */

import {fileURLToPath} from 'node:url'
import {createLinkFavicons} from './core.js'

export {providers} from './core.js'

/**
 * Sätteri hast plugin (the default Markdown processor in Astro 7) that adds the favicon of the
 * linked site to every external link.
 *
 * @param {Options | null | undefined} [options]
 * @returns {HastPluginDefinition}
 */
export default function satteriLinkFavicons(options) {
  const linkFavicons = createLinkFavicons(options)

  return {
    name: 'link-favicons',
    element: {
      filter: ['a'],
      async visit(node, ctx) {
        const element = /** @type {Element} */ (node)
        const file = {path: ctx.fileURL ? fileURLToPath(ctx.fileURL) : undefined}
        const hostname = linkFavicons.match(element, file)
        if (!hostname) return
        const img = await linkFavicons.icon(hostname)
        if (!img) return
        if (linkFavicons.position === 'end') ctx.appendChild(node, img)
        else ctx.prependChild(node, img)
      }
    }
  }
}
