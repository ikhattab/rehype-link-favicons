import assert from 'node:assert/strict'
import {test} from 'node:test'
import {pathToFileURL} from 'node:url'
import {markdownToHtml} from 'satteri'
import satteriLinkFavicons from '../satteri.js'

const png = Buffer.from('fake-png')
const pngUri = `data:image/png;base64,${png.toString('base64')}`

/** @type {typeof globalThis.fetch} */
const fetch = async (input) => {
  const status = String(input).includes('dev.to') ? 200 : 404
  return new Response(png, {status, headers: {'content-type': 'image/png'}})
}

/**
 * @param {string} markdown
 * @param {import('../index.js').Options} [options]
 * @param {string} [filePath]
 */
async function run(markdown, options, filePath) {
  const {html} = await markdownToHtml(markdown, {
    hastPlugins: [satteriLinkFavicons({cacheDir: false, fetch, ...options})],
    fileURL: filePath ? pathToFileURL(filePath) : undefined
  })
  return html.trim()
}

test('inlines the favicon before external link text', async () => {
  assert.equal(
    await run('[Dev](https://dev.to/x) and [home](/about/)'),
    `<p><a href="https://dev.to/x"><img src="${pngUri}" alt="" width="16" height="16" loading="lazy" decoding="async" class="link-favicon">Dev</a> and <a href="/about/">home</a></p>`
  )
})

test('skips image links and sites without an icon', async () => {
  const markdown = '[![x](x.png)](https://dev.to) [y](https://unknown.example)'
  assert.doesNotMatch(await run(markdown), /link-favicon/)
})

test('appends with position: end', async () => {
  assert.match(await run('[Dev](https://dev.to)', {position: 'end'}), /Dev<img /)
})

test('filter gets the file path from fileURL', async () => {
  /** @type {import('../index.js').Options['filter']} */
  const filter = (_, file) => (file.path || '').includes('/content/til/')
  assert.doesNotMatch(await run('[Dev](https://dev.to)', {filter}, '/site/src/pages/a.md'), /img/)
  assert.match(await run('[Dev](https://dev.to)', {filter}, '/site/src/content/til/a.md'), /img/)
})
