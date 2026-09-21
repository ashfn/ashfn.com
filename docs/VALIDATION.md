# Validation — 8 September 2026

Built and tested from the standalone new_ver folder. The original source was copied into a temporary directory for a fresh Next.js production export (webpack); no production deployment was made.

## JavaScript size

Cold-page first-party script sizes, including inline executable bootstrap code. Excludes structured JSON-LD, third-party analytics/embeds, and legacy nomodule polyfills that modern browsers do not load. These are byte counts, not claims about load-time improvement.

| Route | Original | Static version | Reduction |
| --- | ---: | ---: | ---: |
| / | 508,145 B | 1,413 B | 99.72% |
| /blog/ | 496,771 B | 1,413 B | 99.72% |
| /projects/ | 518,436 B | 1,413 B | 99.73% |
| /blog/posts/5/ | 545,916 B | 3,430 B | 99.37% |

The shared browser script is 1,230 bytes (700 bytes gzip). Article enhancements add 2,017 bytes (963 bytes gzip). Snake and Tetris load only on activation. React, Next.js, Framer Motion, MDX, syntax highlighting and KaTeX JavaScript are absent from the client bundle.

PNG recompression saves 1,185,011 bytes across 11 images. Automated tests confirm identical decoded RGBA pixels and identical non-IDAT metadata chunks, including ICC profiles. GIF files remain byte-for-byte unchanged.

## Browser and visual checks

- TypeScript check passed.
- All eight automated export/content/game/image tests passed.
- JavaScript-enabled interaction checks passed: theme persistence, navigation, clipboard success/fallback behavior, native JSON, TOC, redirects, game lazy loading and play, cleanup, 404, and unavailable localStorage.
- All 40 no-JavaScript page configurations passed: ten content pages × desktop/mobile × light/dark. The browser had scripting disabled and requested **zero scripts**. Tests also cover native theme controls, mailto, keyboard JSON expansion, plain-text code access, TOC links, YouTube fallback links, maths, legacy/contact redirects and 404.
- 44 full-page comparisons against the original production export (including 404) at 1440 × 900 and 390 × 900, in both themes. 38 have zero changed RGBA pixels. The remaining 6 differ only by at most 2/255 per channel inside unchanged image boxes. Text, controls and layout match exactly. The same rounding occurs with original image files, so this is not a lossy-image substitution. Raw differences remain in the report.
- Animated GIF frames are masked to avoid time-dependent comparisons; their files and dimensions are checked separately. Third-party favicon and iframe responses are deterministic fixtures. Chrome was used for these checks; this is not a claim of exhaustive testing across all browser engines.

## No-JavaScript limits

The theme switch works per page; remembering its choice across page loads uses optional JavaScript. The copy icon opens plain text for manual copying when scripts are off; automatic clipboard access requires JavaScript. YouTube playback uses its own scripting, so the no-script version offers a direct video link. Easter eggs require JavaScript.

The mailto attribute is fully numeric-entity encoded at build time, while the visible address keeps its [at] form. This makes basic raw-source scraping harder but is not encryption: HTML-aware bots can decode any address a browser can use without JavaScript.

See [README.md](../README.md) for repeatable build/test commands. Detailed JSON reports and PNG comparisons are generated under verification/.

## Authoring workspace

The builder is Eleventy 3.1.6. Posts have descriptive filenames under `content/posts/` and retain their old public slugs. Projects come from `content/projects.json`. The dev-only `/editor/` interface edits these files directly and browses/uploads to `public/media/`. No editor code or API is emitted into `dist/`.

`npm run test:editor` starts a disposable workspace and exercises new posts, rich MDX preview, saving, automatic Eleventy rebuilds, image uploads/insertion, outside-edit conflict rejection, invalid MDX/data rejection, project editing/reordering, and the responsive media library. The original content is never modified by that test.

## Release cleanup, 21 September 2026

Onion features and the vanity-address article are excluded from this release. The article and hosting work are preserved in a separate local backup. General no-JavaScript support remains.
