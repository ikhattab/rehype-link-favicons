/**
 * @import {Element, Root} from 'hast'
 * @import {VFile} from 'vfile'
 * @import {Options} from '../index.js'
 */

import {visit} from 'unist-util-visit'
import {createLinkFavicons} from './core.js'

export {providers} from './core.js'

/**
 * Add the favicon of the linked site to every external link.
 *
 * @param {Options | null | undefined} [options]
 * @returns {(tree: Root, file: VFile) => Promise<void>}
 */
export default function rehypeLinkFavicons(options) {
  const linkFavicons = createLinkFavicons(options)

  return async function (tree, file) {
    /** @type {Array<{element: Element, hostname: string}>} */
    const links = []

    visit(tree, 'element', function (element) {
      if (element.tagName !== 'a') return
      const hostname = linkFavicons.match(element, file)
      if (hostname) links.push({element, hostname})
    })

    await Promise.all(
      links.map(async function ({element, hostname}) {
        const img = await linkFavicons.icon(hostname)
        if (!img) return
        if (linkFavicons.position === 'end') element.children.push(img)
        else element.children.unshift(img)
      })
    )
  }
}
