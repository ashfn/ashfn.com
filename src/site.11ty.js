import { createSite } from '../scripts/render-site.tsx';

// JSX/MDX renders only during the build. Eleventy writes each page and feed.
let documents;
export default class Site {
  async data() {
    return {
      documents: await (documents ??= createSite()),
      pagination: { data: 'documents', size: 1, alias: 'document' },
      permalink: ({ document }) => document.file,
      eleventyExcludeFromCollections: true,
    };
  }
  render({ document }) { return document.html; }
}
