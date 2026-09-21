import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  /** .mdx bodies may use components; .md bodies are plain markdown. */
  format: 'md' | 'mdx';
  /** Kept out of the blog index, feed and sitemap. */
  hidden?: boolean;
}

export interface Post extends PostMeta {
  body: string;
}

export const CONTENT_DIR = path.join(process.cwd(), 'content', 'posts');

function parsePostFile(file: string): Post {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = String(data.slug || file.replace(/\.mdx?$/, ''));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`content/posts/${file} has an invalid URL slug`);

  if (!data.title) throw new Error(`content/posts/${file} is missing a title`);
  if (!data.date) throw new Error(`content/posts/${file} is missing a date`);

  return {
    slug,
    title: String(data.title),
    description: String(data.description || ''),
    // Frontmatter dates parse to Date objects; keep the YYYY-MM-DD form
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date),
    hidden: data.hidden === true || data.draft === true,
    format: file.endsWith('.mdx') ? 'mdx' : 'md',
    body: content.trim(),
  };
}

export function getPosts(): Post[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .map(parsePostFile);
}

/** Everything that has a page, newest first - including hidden posts. */
export function getAllPosts(): Post[] {
  const posts = getPosts();
  const seen = new Set<string>();
  for (const post of posts) {
    if (seen.has(post.slug)) {
      throw new Error(`Duplicate post slug "${post.slug}"`);
    }
    seen.add(post.slug);
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/** Posts for the blog index, RSS feed and sitemap. */
export function getPublishedPosts(): Post[] {
  return getAllPosts().filter((p) => !p.hidden);
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}
