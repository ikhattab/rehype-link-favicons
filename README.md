# rehype-link-favicons

[rehype](https://github.com/rehypejs/rehype) and [Sätteri](https://satteri.bruits.org) plugin that puts the favicon of the linked site next to
every external link, like this: <img src="https://www.google.com/s2/favicons?domain=github.com&sz=32" width="16" height="16" alt=""> GitHub.

Icons are downloaded **at build time**, cached on disk, and embedded as data URIs. Your readers never
make a request to Google or anyone else, and the icons keep working if a favicon service goes away.

## Contents

- [Install](#install)
- [Use](#use)
- [Astro](#astro)
- [Other tools](#other-tools)
- [Options](#options)
- [Styling](#styling)
- [How it works](#how-it-works)
- [License](#license)

## Install

```sh
npm install rehype-link-favicons
```

Requires Node.js 20 or later (for the global `fetch`).

## Use

```js
import rehypeLinkFavicons from 'rehype-link-favicons'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {unified} from 'unified'

const file = await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeLinkFavicons)
  .use(rehypeStringify)
  .process('Read it on [DEV](https://dev.to/some-post).')

console.log(String(file))
```

<!-- prettier-ignore -->
```html
<p>Read it on <a href="https://dev.to/some-post"><img src="data:image/png;base64,iVBORw0…" alt="" width="16" height="16" loading="lazy" decoding="async" class="link-favicon">DEV</a>.</p>
```

## Astro

Astro 7 renders Markdown with [Sätteri](https://satteri.bruits.org) by default, which runs its own
hast plugins instead of rehype plugins. Use the `rehype-link-favicons/satteri` entry point; it takes
the same options:

```sh
npm install rehype-link-favicons @astrojs/markdown-satteri
```

```js
// astro.config.mjs
import {satteri} from '@astrojs/markdown-satteri'
import {defineConfig} from 'astro/config'
import linkFavicons from 'rehype-link-favicons/satteri'

export default defineConfig({
  markdown: {
    processor: satteri({hastPlugins: [linkFavicons()]})
  }
})
```

On Astro 6 and earlier, or with the `unified()` processor from `@astrojs/markdown-remark`, use the
rehype plugin:

```js
markdown: {
  rehypePlugins: [rehypeLinkFavicons]
}
```

### Only some pages

Markdown plugins run on every Markdown file. To limit the icons to some content collections, use
`filter`. Its second argument has the `path` of the file being rendered:

```js
linkFavicons({
  filter: (link, file) => /[\\/]src[\\/]content[\\/](blog|til)[\\/]/.test(file.path ?? '')
})
```

### RSS feeds

If a feed embeds rendered HTML (`content: entry.rendered.html`), strip the icons there. Feed readers
often ignore `width` and `height` and show them full size:

```js
content: entry.rendered?.html.replace(/<img [^>]*class="link-favicon"[^>]*>/g, '')
```

## Other tools

The rehype plugin works in any unified pipeline, such as Next.js (`@next/mdx`) and Docusaurus.
Tools built on markdown-it, such as VitePress, are not supported.

## Options

All options are optional.

| Option        | Type                                          | Default                                      | Description                                                                                                |
| ------------- | --------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `providers`   | `Array<'google' \| 'duckduckgo' \| Function>` | `['google', 'duckduckgo']`                   | Favicon services to try in order. A function gets `(hostname, size)` and returns a URL.                    |
| `size`        | `number`                                      | `16`                                         | Rendered width and height in pixels. Icons are fetched at 2× for sharp screens.                            |
| `position`    | `'start' \| 'end'`                            | `'start'`                                    | Put the icon before or after the link text.                                                                |
| `inline`      | `boolean`                                     | `true`                                       | Embed icons as data URIs. With `false`, `src` points at the first provider and readers' browsers fetch it. |
| `cacheDir`    | `string \| false`                             | `'node_modules/.cache/rehype-link-favicons'` | Where downloaded icons are kept between builds. `false` disables the disk cache.                           |
| `ignoreHosts` | `string[]`                                    | `[]`                                         | Hosts that never get an icon. `example.com` also covers `www.example.com`.                                 |
| `filter`      | `(element, file) => boolean`                  | —                                            | Return `false` to skip a link.                                                                             |
| `properties`  | `object`                                      | —                                            | Extra properties for the `<img>`, merged over the defaults. For example `{className: ['icon']}`.           |
| `timeout`     | `number`                                      | `5000`                                       | Milliseconds to wait for each request.                                                                     |
| `fetch`       | `typeof fetch`                                | `globalThis.fetch`                           | Custom `fetch`, for proxies or tests.                                                                      |

Links are skipped when they:

- are not absolute `http:` or `https:` URLs (relative, `#hash`, `mailto:`, …),
- have no text, or already contain an image,
- point at an ignored host, or `filter` returns `false`.

## Styling

The icon is a plain inline `<img>` with the class `link-favicon`. A starting point:

```css
.link-favicon {
  display: inline;
  width: 1em;
  height: 1em;
  margin: 0 0.25em 0 0;
  vertical-align: -0.125em;
  border-radius: 2px;
}
```

## How it works

1. Finds every `<a>` with an external `http(s)` URL.
2. For each hostname, once per build: reads the disk cache, or asks each provider in turn.
   Google and DuckDuckGo answer unknown sites with a `404` and a generic globe, so any non-`2xx`
   response, non-image response, or icon over 50 kB moves on to the next provider.
3. Inserts an `<img alt="">` with the icon as a data URI. The image is decorative, so screen readers
   skip it.
4. If no provider has an icon, or the network is down, the link is left as it was. The build never
   fails because of a favicon.

Failed lookups are not cached, so they are retried on the next build. Successful ones are cached
forever; delete the cache directory to refresh them.

## License

[MIT](LICENSE) © Ihab Khattab
