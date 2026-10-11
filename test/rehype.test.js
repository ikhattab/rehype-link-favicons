/**
 * @import {Options} from '../index.js'
 */

import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {test} from 'node:test'
import rehypeParse from 'rehype-parse'
import rehypeStringify from 'rehype-stringify'
import {unified} from 'unified'
import {VFile} from 'vfile'
import rehypeLinkFavicons from '../index.js'

const png = Buffer.from('fake-png')
const pngUri = `data:image/png;base64,${png.toString('base64')}`

/**
 * A fake `fetch` that serves `png` for the hosts in `known` and records every request.
 *
 * @param {Record<string, number>} [known]
 *   Status per hostname; unknown hosts get a 404 like the real services.
 */
function fakeFetch(known = {'dev.to': 200, 'github.com': 200}) {
  /** @type {string[]} */
  const calls = []
  /** @type {typeof globalThis.fetch} */
  const fetch = async (input) => {
    const url = String(input)
    calls.push(url)
    const host = Object.keys(known).find((host) => url.includes(encodeURIComponent(host)))
    const status = host ? known[host] : 404
    return new Response(png, {status, headers: {'content-type': 'image/png'}})
  }
  return {fetch, calls}
}

/**
 * @param {string} html
 * @param {Options} options
 * @param {VFile | string} [file]
 */
async function run(html, options, file) {
  const result = await unified()
    .use(rehypeParse, {fragment: true})
    .use(rehypeLinkFavicons, {cacheDir: false, ...options})
    .use(rehypeStringify)
    .process(file instanceof VFile ? Object.assign(file, {value: html}) : html)
  return String(result)
}

test('inlines the favicon before external link text', async () => {
  const {fetch} = fakeFetch()
  assert.equal(
    await run('<a href="https://dev.to/x">Dev</a>', {fetch}),
    `<a href="https://dev.to/x"><img src="${pngUri}" alt="" width="16" height="16" loading="lazy" decoding="async" class="link-favicon">Dev</a>`
  )
})

test('leaves internal, relative, hash, mailto, and image links alone', async () => {
  const {fetch, calls} = fakeFetch()
  const html =
    '<a href="/about/">About</a><a href="#top">Top</a><a href="mailto:a@b.c">Mail</a>' +
    '<a href="https://dev.to"><img src="x.png" alt="x"></a><a href="https://dev.to"> </a>'
  assert.equal(await run(html, {fetch}), html)
  assert.deepEqual(calls, [])
})

test('falls back to the next provider when the first has no icon', async () => {
  const {fetch, calls} = fakeFetch({'icons.test': 200})
  const output = await run('<a href="https://unknown.example">x</a>', {
    fetch,
    providers: ['google', (host) => `https://icons.test/${host}`]
  })
  assert.match(output, /<img src="data:image\/png/)
  assert.equal(calls.length, 2)
  assert.match(calls[0], /google\.com/)
})

test('adds nothing when no provider has an icon', async () => {
  const {fetch} = fakeFetch()
  const html = '<a href="https://unknown.example">x</a>'
  assert.equal(await run(html, {fetch}), html)
})

test('adds nothing when the network fails', async () => {
  const html = '<a href="https://dev.to">x</a>'
  const fetch = async () => {
    throw new TypeError('fetch failed')
  }
  assert.equal(await run(html, {fetch}), html)
})

test('rejects responses that are not images', async () => {
  const html = '<a href="https://dev.to">x</a>'
  const fetch = async () => new Response('<html>', {headers: {'content-type': 'text/html'}})
  assert.equal(await run(html, {fetch}), html)
})

test('fetches each hostname once per document', async () => {
  const {fetch, calls} = fakeFetch()
  await run('<a href="https://dev.to/a">a</a><a href="https://dev.to/b">b</a>', {fetch})
  assert.equal(calls.length, 1)
})

test('supports position, size, and extra properties', async () => {
  const {fetch} = fakeFetch()
  const output = await run('<a href="https://dev.to">Dev</a>', {
    fetch,
    position: 'end',
    size: 20,
    properties: {dataMarkdownIgnore: ''}
  })
  assert.match(output, /^<a href="https:\/\/dev.to">Dev<img /)
  assert.match(output, /width="20" height="20"/)
  assert.match(output, /data-markdown-ignore=""/)
})

test('fetches at twice the rendered size', async () => {
  const {fetch, calls} = fakeFetch()
  await run('<a href="https://dev.to">Dev</a>', {fetch, size: 20})
  assert.match(calls[0], /sz=40/)
})

test('ignoreHosts matches the host and its subdomains', async () => {
  const {fetch, calls} = fakeFetch()
  const html = '<a href="https://github.com">a</a><a href="https://docs.github.com">b</a>'
  assert.equal(await run(html, {fetch, ignoreHosts: ['github.com']}), html)
  assert.deepEqual(calls, [])
})

test('filter receives the element and the file', async () => {
  const {fetch} = fakeFetch()
  const html = '<a href="https://dev.to">Dev</a>'
  /** @type {Options['filter']} */
  const filter = (element, file) => (file.path || '').includes('/content/blog/')
  assert.equal(
    await run(html, {fetch, filter}, new VFile({path: '/site/src/pages/index.md'})),
    html
  )
  assert.match(
    await run(html, {fetch, filter}, new VFile({path: '/site/src/content/blog/a/index.md'})),
    /link-favicon/
  )
})

test('inline: false points at the first provider without fetching', async () => {
  const {fetch, calls} = fakeFetch()
  const output = await run('<a href="https://dev.to">Dev</a>', {fetch, inline: false})
  assert.match(output, /src="https:\/\/www.google.com\/s2\/favicons\?domain=dev.to&#x26;sz=32"/)
  assert.deepEqual(calls, [])
})

test('caches icons on disk between runs', async () => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rehype-link-favicons-'))
  try {
    const first = fakeFetch()
    await run('<a href="https://dev.to">Dev</a>', {fetch: first.fetch, cacheDir})
    assert.equal(first.calls.length, 1)
    assert.deepEqual(await fs.readdir(cacheDir), ['dev.to-32.txt'])

    const second = fakeFetch()
    const output = await run('<a href="https://dev.to">Dev</a>', {fetch: second.fetch, cacheDir})
    assert.equal(second.calls.length, 0)
    assert.match(output, /link-favicon/)
  } finally {
    await fs.rm(cacheDir, {recursive: true, force: true})
  }
})

test('throws on an unknown provider name', () => {
  // @ts-expect-error: testing a bad name.
  assert.throws(() => rehypeLinkFavicons({providers: ['bing']}), /unknown provider `bing`/)
})
