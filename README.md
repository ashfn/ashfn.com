# ashfn.com

Source for [ashfn.com](https://ashfn.com), built with Eleventy.
The published files live in [ashfn.github.io](https://github.com/ashfn/ashfn.github.io).

## Edit

Requires Node.js 22.15 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:4000 for the site or http://localhost:4000/editor/ to edit it.

- Posts: `content/posts/`
- Projects: `content/projects.json`
- Images: `public/media/`
- Templates and styles: `src/`

## Publish

Keep this repository and `ashfn.github.io` in the same parent folder.
Commit and push your source changes here, then run:

```sh
npm run build
npm run check
npm test
rsync -a --delete --exclude=.git dist/ ../ashfn.github.io/
git -C ../ashfn.github.io add -A
git -C ../ashfn.github.io commit -m "Update site"
git -C ../ashfn.github.io push
```

The copy replaces the previous export. GitHub Pages serves `main` from the root
of `ashfn.github.io`. `CNAME` keeps the domain as `ashfn.com`.
Only static files are published. The editor and build tools stay local.
