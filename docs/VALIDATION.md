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

## Tor article — 16 September 2026

Added the published `finding-ashfncomabc` article, including Astra attribution, upstream repository links, LaTeX explanations of batch inversion and the Montgomery coordinate recurrence, and a static throughput graph. All 6,560 CSV samples reproduce the original experiment summary exactly: 2,150,017,007,616 candidates over 1,640.000109246 seconds, weighted throughput 1,310,985,892.9244118 candidates/sec. The favourite onion hostname passes the v3 checksum check.

Build, TypeScript and all eight export tests passed. The expanded no-JavaScript suite passed all 44 content-page configurations (11 pages × two widths × two themes). Additional article checks confirmed 45 rendered KaTeX expressions with no errors, no horizontal page overflow, a loaded SVG, working data downloads, the native footer link and per-page Onion-Location metadata/HTTP headers in all four configurations. No browser JavaScript was requested. The onion service itself was not started or deployed.

## Inline interactive chart — 16 September 2026

Replaced the article’s embedded image with one inline SVG plot of the complete recorded throughput. It is drawn at build time and remains readable without JavaScript. Hovering, tapping or using the keyboard shows a compact tooltip with the sample time and measured rate. There is no chart library. The article-only interaction module is 2,611 bytes (1,255 bytes gzip); sample data is fetched once, on first interaction.

`npm run test:chart` passes eight combinations of desktop/mobile, light/dark and scripting enabled/disabled. Checks cover measured tooltip values against the CSV, touch selection, keyboard navigation, lazy loading, article-only assets, unavailable-data fallback, all 45 rendered maths expressions and horizontal overflow. Screenshots were inspected at both widths. TypeScript and all eight export tests pass; the site-wide no-JavaScript suite also passed its 44 page configurations during this update.

The opening now explains the Tor-site motivation, recognisable vanity prefixes, the GPU-mining analogy and why this became a CUDA experiment despite existing tools. The technical account, equations, measurements and repository credits remain in the article.

## Running onion mirror and stricter-browser support — 16 September 2026

The Docker service in `tor/` now runs the existing vanity onion identity and proxies HTTP requests to the local development server on port 4000. A separate temporary Tor client retrieved the homepage, article and stylesheet through the onion network and confirmed their bodies match the local site. The public proxy rejects editor routes, including encoded paths and a spoofed localhost Host header, while the local editor remains available. Only GET and HEAD are accepted. No Docker ports are published; the original identity directory is mounted read-only and excluded from the image build context. The temporary verification client was removed after testing.

UI icons now share a 7.8 KB PNG mask sprite, retaining theme and hover colours without requiring SVG rendering or JavaScript. This covers theme, contact, Tor, GitHub, RSS, project, copy and JSON controls. The chart retains its interactive SVG when scripting is enabled and supplies light/dark static PNG fallbacks without scripting. The desktop contents list fits and scrolls within short windows; native anchor navigation highlights the selected section without JavaScript. Following the current section during manual scrolling still requires the optional article script.

TypeScript, all eight export tests, the standard browser interaction suite, eight chart configurations and all 44 no-JavaScript configurations passed. The new `npm run test:safest` suite passed desktop/mobile and light/dark configurations in Firefox with JavaScript, SVGs and downloadable fonts disabled. It checks actual painted icon pixels, theme switching, loaded chart fallbacks, native contents navigation and highlighting, short-window contents scrolling, and zero requested scripts. Desktop and mobile screenshots were visually inspected. These are Firefox compatibility checks with restrictive settings, rather than an automated test of the Tor Browser application itself.

## Article simplification — 16 September 2026

Removed the throughput graph, CSV, summary JSON, SVG/PNG exports, chart component, browser module, stylesheet and generation utilities. This removes 1,379,439 bytes of source assets and code; the build no longer emits chart assets. The article retains the benchmark table and a concise longer-run average, then explains the running Docker mirror and the native HTML/CSS features that keep the site usable without JavaScript.

TypeScript, all eight export tests, all 44 no-JavaScript configurations and four restrictive Firefox configurations passed. The export check now distinguishes prose mentioning `/editor/` from actual editor links or resources. The local onion proxy serves the updated article, and the removed CSV returns 404. Earlier chart measurements above describe previous revisions.
