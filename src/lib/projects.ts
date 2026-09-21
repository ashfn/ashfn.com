import { readFileSync } from 'node:fs';

export interface Project {
  title: string;
  description: string;
  image: string;
  links: { type: string; href: string; label: string }[];
}

export function validateProjects(value: unknown): asserts value is Project[] {
  if (!Array.isArray(value)) throw new Error('Projects must be a JSON array.');
  for (const [index, project] of value.entries()) {
    const label = `Project ${index + 1}`;
    if (!project || typeof project.title !== 'string' || !project.title.trim()) throw new Error(`${label} needs a title.`);
    if (typeof project.description !== 'string' || typeof project.image !== 'string') throw new Error(`${label} needs a description and image path.`);
    if (!/^\/media\/[\w./-]+$/.test(project.image) || project.image.includes('..')) throw new Error(`${label} needs an image from /media/.`);
    if (!Array.isArray(project.links)) throw new Error(`${label} needs a links array.`);
    for (const link of project.links) {
      if (!link || !['repository', 'blog', 'youtube', 'preview'].includes(link.type) || typeof link.label !== 'string' || !link.label.trim()
        || typeof link.href !== 'string' || !/^(https?:\/\/|\/(?!\/))/.test(link.href)) throw new Error(`${label} has an invalid link. Use repository, blog, youtube or preview and a /path/ or https:// URL.`);
    }
  }
}

export function getProjects(): Project[] {
  const value: unknown = JSON.parse(readFileSync('content/projects.json', 'utf8'));
  validateProjects(value);
  return value;
}
