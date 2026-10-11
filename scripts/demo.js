/**
 * Renders the same Markdown with and without the plugin into `demo/index.html`, in light and dark,
 * for the README screenshots. Run with `npm run demo`, then screenshot the `#before-light`,
 * `#after-light`, `#after-dark`, ... cards.
 */

import fs from 'node:fs/promises'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {unified} from 'unified'
import rehypeLinkFavicons from '../index.js'

const markdown = `
I learned about favicons on [Wikipedia](https://en.wikipedia.org/wiki/Favicon),
read the [MDN docs for \`<a>\`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a),
and found the answer on [Stack Overflow](https://stackoverflow.com/questions/5119041).

Further reading:

- [Markdown in Astro](https://docs.astro.build/en/guides/markdown-content/)
- [unified on GitHub](https://github.com/unifiedjs/unified)
- [rehype-link-favicons on npm](https://www.npmjs.com/package/rehype-link-favicons)
- [A talk on YouTube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
- [My notes](/notes/) (internal links are left alone)
`

/** @param {boolean} withPlugin */
async function render(withPlugin) {
  const processor = unified().use(remarkParse).use(remarkRehype)
  if (withPlugin) processor.use(rehypeLinkFavicons)
  return String(await processor.use(rehypeStringify).process(markdown))
}

const [before, after] = await Promise.all([render(false), render(true)])

/**
 * @param {string} id
 * @param {string} label
 * @param {string} html
 * @param {'light' | 'dark'} theme
 */
const card = (id, label, html, theme) =>
  `<section id="${id}" class="card ${theme}"><p class="label">${label}</p>${html}</section>`

const page = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>rehype-link-favicons demo</title>
<style>
  body { margin: 0; padding: 24px; background: #e9ecef; font: 17px/1.65 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  .row { display: flex; gap: 24px; margin-bottom: 24px; align-items: stretch; }
  .card { width: 520px; padding: 20px 28px; border-radius: 12px; }
  .light { background: #fff; color: #1f2328; }
  .dark { background: #16181d; color: #e6e6e6; }
  .label { margin: 0 0 4px; font: 600 12px/1 ui-monospace, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; opacity: .55; }
  a { color: inherit; text-decoration-color: #e8834a; text-underline-offset: 3px; }
  ul { padding-left: 1.2em; margin: 0; }
  p { margin: 0 0 14px; }
  code { font: 0.88em ui-monospace, Menlo, monospace; }
  /* The suggested styles from the README. */
  .link-favicon { width: 1em; height: 1em; margin-right: 0.3em; vertical-align: -0.125em; border-radius: 2px; }
</style>
<div class="row">${card('before-light', 'Before', before, 'light')}${card('after-light', 'After', after, 'light')}</div>
<div class="row">${card('before-dark', 'Before', before, 'dark')}${card('after-dark', 'After', after, 'dark')}</div>
<div class="row">${card('hero-light', 'Light', after, 'light')}${card('hero-dark', 'Dark', after, 'dark')}</div>
</html>
`

await fs.mkdir(new URL('../demo/', import.meta.url), {recursive: true})
await fs.writeFile(new URL('../demo/index.html', import.meta.url), page)
console.log('Wrote demo/index.html')
