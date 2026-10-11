# rehype-link-favicons

[![npm](https://img.shields.io/npm/v/rehype-link-favicons)](https://www.npmjs.com/package/rehype-link-favicons)
[![CI](https://github.com/ikhattab/rehype-link-favicons/actions/workflows/ci.yml/badge.svg)](https://github.com/ikhattab/rehype-link-favicons/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/rehype-link-favicons)](LICENSE)

Show the favicon of the linked site next to every external link in your Markdown. One line of
config, no changes to your content.

![External links in a paragraph and a list, each with the linked site's favicon in front of the link text, in a light and a dark theme](https://raw.githubusercontent.com/ikhattab/rehype-link-favicons/main/.github/assets/hero.png)

- **Automatic.** Every `[text](https://…)` link gets an icon. Internal links, `mailto:`, and image
  links are left alone.
- **Private and offline-safe.** Icons are downloaded **at build time** and embedded in the page.
  Your readers never make a request to Google or anyone else.
- **Fast rebuilds.** Each site's icon is fetched once and cached on disk.
- **Never breaks a build.** No icon, or no network? The link stays as it was.
- **Works with** [Astro](#astro) (including Astro 7's Sätteri processor), [Next.js](#nextjs),
  [Docusaurus](#docusaurus), and any [unified](#unified) or [rehype](#rehype-on-html) pipeline.

See it live, and read why and how it was built:
[Favicons Next to External Links, Automatically](https://ihabkhattab.com/blog/favicons-next-to-external-links/).

## Contents

- [Before and after](#before-and-after)
- [Install](#install)
- [Quick start](#quick-start)
  - [Astro](#astro)
  - [Next.js](#nextjs)
  - [Docusaurus](#docusaurus)
  - [unified](#unified)
  - [rehype on HTML](#rehype-on-html)
- [Recipes](#recipes)
- [Options](#options)
- [Styling](#styling)
- [How it works](#how-it-works)
- [FAQ](#faq)
- [License](#license)

## Before and after

The same Markdown, rendered without and with the plugin:

```md
I learned about favicons on [Wikipedia](https://en.wikipedia.org/wiki/Favicon),
read the [MDN docs for `<a>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a),
and found the answer on [Stack Overflow](https://stackoverflow.com/questions/5119041).

- [Markdown in Astro](https://docs.astro.build/en/guides/markdown-content/)
- [unified on GitHub](https://github.com/unifiedjs/unified)
- [My notes](/notes/) (internal links are left alone)
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ikhattab/rehype-link-favicons/main/.github/assets/before-after-dark.png">
  <img alt="Two panels: on the left, plain links; on the right, the same links with a favicon before each external one" src="https://raw.githubusercontent.com/ikhattab/rehype-link-favicons/main/.github/assets/before-after-light.png">
</picture>

## Install

```sh
npm install rehype-link-favicons
```

Requires Node.js 20 or later. The package is ESM only.

## Quick start

### Astro

Astro 7 renders Markdown with [Sätteri](https://satteri.bruits.org) by default, which runs its own
hast plugins rather than rehype plugins. Use the `rehype-link-favicons/satteri` entry point. It takes
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

On **Astro 6 and earlier**, or with the `unified()` processor from `@astrojs/markdown-remark`, add
the rehype plugin:

```js
// astro.config.mjs
import {defineConfig} from 'astro/config'
import rehypeLinkFavicons from 'rehype-link-favicons'

export default defineConfig({
  markdown: {
    rehypePlugins: [rehypeLinkFavicons]
  }
})
```

Then add the [CSS](#styling) and run `astro build`.

### Next.js

With [`@next/mdx`](https://nextjs.org/docs/app/guides/mdx):

```js
// next.config.mjs
import createMDX from '@next/mdx'
import rehypeLinkFavicons from 'rehype-link-favicons'

const withMDX = createMDX({
  options: {
    rehypePlugins: [rehypeLinkFavicons]
  }
})

export default withMDX({pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx']})
```

With Turbopack, Next.js needs plugins given by name and options that can be serialized to JSON (so
no `filter` or custom `providers` functions):

```js
rehypePlugins: [['rehype-link-favicons', {size: 16, ignoreHosts: ['example.com']}]]
```

### Docusaurus

```js
// docusaurus.config.js
import rehypeLinkFavicons from 'rehype-link-favicons'

export default {
  presets: [
    [
      'classic',
      {
        docs: {rehypePlugins: [rehypeLinkFavicons]},
        blog: {rehypePlugins: [rehypeLinkFavicons]}
      }
    ]
  ]
}
```

### unified

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

The plugin is async (it downloads icons), so use `.process()` or `.run()`, not `.processSync()`.

### rehype on HTML

It works on any HTML, not only Markdown. For example, to add icons to the links in a CMS export:

```js
import {rehype} from 'rehype'
import rehypeLinkFavicons from 'rehype-link-favicons'

const html = '<p>Built with <a href="https://astro.build">Astro</a>.</p>'
const file = await rehype().data('settings', {fragment: true}).use(rehypeLinkFavicons).process(html)

console.log(String(file))
```

## Recipes

Every option works the same for `rehypeLinkFavicons(options)` and `linkFavicons(options)` from
`rehype-link-favicons/satteri`.

### Only on some pages

Markdown plugins run on every Markdown file. Use `filter` to pick pages. Its second argument has the
`path` of the file being rendered. For example, only blog posts and notes in an Astro site:

```js
linkFavicons({
  filter: (link, file) => /[\\/]src[\\/]content[\\/](blog|notes)[\\/]/.test(file.path ?? '')
})
```

### Skip some links

Leave out your own site and anything else you like with `ignoreHosts`. Subdomains are included, so
`github.com` also covers `docs.github.com`:

```js
rehypeLinkFavicons({ignoreHosts: ['mysite.com', 'github.com']})
```

`filter` also receives the `<a>` element, so you can skip links by class, text, or URL:

```js
rehypeLinkFavicons({
  // Markdown can't set classes, but other plugins (or raw HTML) can.
  filter: (link) => !String(link.properties.className ?? '').includes('no-favicon')
})
```

### Icon after the text, or bigger

```js
rehypeLinkFavicons({position: 'end', size: 20})
```

`size` sets the `width` and `height` attributes. Icons are downloaded at twice that size so they stay
sharp on high-density screens.

### Tailwind classes or extra attributes

`properties` is merged over the `<img>` defaults:

```js
rehypeLinkFavicons({
  properties: {className: ['inline', 'size-4', 'mr-1', 'align-[-0.125em]', 'rounded-sm']}
})
```

Or add an attribute other tools look for, such as `data-pagefind-ignore`:

```js
rehypeLinkFavicons({properties: {dataPagefindIgnore: ''}})
```

### Try the site's own favicon too

Providers are tried in order until one returns an image. Add a function to fall back to the site's
own `/favicon.ico`:

```js
rehypeLinkFavicons({
  providers: ['google', 'duckduckgo', (hostname) => `https://${hostname}/favicon.ico`]
})
```

A provider is any `(hostname, size) => url` function, so you can also point it at your own icon
service.

### Don't inline, link to the provider

With `inline: false`, nothing is downloaded at build time. The `src` points at the first provider and
readers' browsers load the icons:

```js
rehypeLinkFavicons({inline: false})
```

### RSS feeds

If a feed embeds rendered HTML, strip the icons there. Feed readers often ignore `width` and
`height` and show them full size:

```js
content: entry.rendered?.html.replace(/<img [^>]*class="link-favicon"[^>]*>/g, '')
```

### Keep the cache in CI

Icons are cached in `node_modules/.cache/rehype-link-favicons`. Hosts that keep `node_modules`
between builds keep the icons too. On GitHub Actions, cache the folder yourself:

```yaml
- uses: actions/cache@v4
  with:
    path: node_modules/.cache/rehype-link-favicons
    key: link-favicons-${{ github.run_id }}
    restore-keys: link-favicons-
```

Or keep the icons in git, so builds need no network at all:

```js
rehypeLinkFavicons({cacheDir: '.favicons'})
```

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
| `filter`      | `(element, file) => boolean`                  | —                                            | Return `false` to skip a link. `file.path` is the document being rendered.                                 |
| `properties`  | `object`                                      | —                                            | Extra properties for the `<img>`, merged over the defaults. For example `{className: ['icon']}`.           |
| `timeout`     | `number`                                      | `5000`                                       | Milliseconds to wait for each request.                                                                     |
| `fetch`       | `typeof fetch`                                | `globalThis.fetch`                           | Custom `fetch`, for proxies or tests.                                                                      |

Links are skipped when they:

- are not absolute `http:` or `https:` URLs (relative, `#hash`, `mailto:`, …),
- have no text, or already contain an image,
- point at an ignored host, or `filter` returns `false`.

## Styling

The icon is a plain inline `<img class="link-favicon">`. Without CSS it shows at 16×16 pixels. To
size it with the text and line it up:

```css
.link-favicon {
  display: inline;
  width: 1em;
  height: 1em;
  margin: 0 0.3em 0 0;
  vertical-align: -0.125em;
  border-radius: 2px;
}
```

If your theme styles all content images (for example `.prose img { display: block; margin: 2rem 0 }`),
make the selector more specific, such as `.prose img.link-favicon`, so the icons stay inline.

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

## FAQ

**Does it slow down my build?** The first build makes one request per unique linked site, in
parallel. Later builds read from the disk cache and make no requests.

**How much does it add to my pages?** Usually 0.5–2 kB per icon. Each link carries its own copy, so a
page that links to the same site ten times includes that icon ten times. Use `inline: false` if that
matters more to you than privacy.

**What about dark mode?** Icons are shown as the sites publish them. Most work on both backgrounds;
a few dark logos are hard to see on a dark theme.

**Why doesn't a link get an icon?** Neither provider has one for that site, and the site's own
`/favicon.ico` isn't tried unless you [add it as a provider](#try-the-sites-own-favicon-too). Links
with no text, or with an image inside, are skipped on purpose.

**Does it work with MDX and JSX links?** Markdown links in MDX files work. Links written as JSX
(`<a href="…">`) are components, not HTML, and are left alone.

## License

[MIT](LICENSE) © Ihab Khattab
