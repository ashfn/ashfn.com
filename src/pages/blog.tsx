import { Link } from "@/components/Elements";

import { PageTransition } from "@/components/PageTransition";
import Icon from "@/components/Icon";
import { getPublishedPosts } from "@/lib/posts";

export const metadata = {
  title: "Blog",
  description: "Asher Falcon's blog - software engineering, projects, and more",
  keywords: ["blog", "software engineering", "coding", "projects", "tech"],
  alternates: {
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
};

const posts = getPublishedPosts();

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PageTransition>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--ashgreen)] hover:text-[var(--ashgreen-light)]">
              &larr;
            </Link>
            <h1 className="text-lg font-medium">Blog</h1>
          </div>
          <Link href="/rss.xml" aria-label="RSS feed" className="text-[var(--ashgreen)] hover:text-[var(--ashgreen-light)]">
            <Icon name="rss" size={18} />
          </Link>
        </div>

        <div className="space-y-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/posts/${post.slug}`}
              className="block group no-underline hover:no-underline"
            >
              <div className="sm:flex sm:items-start sm:gap-4">
                <span className="hidden sm:block text-[var(--foreground)] opacity-35 text-sm shrink-0 pt-0.5">
                  {post.date}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[var(--ashgreen)] group-hover:text-[var(--ashgreen-light)] transition-colors">
                    {post.title}
                  </h2>
                  <span className="sm:hidden text-[var(--foreground)] opacity-35 text-xs">
                    {post.date}
                  </span>
                  <div className="relative mt-1 max-h-[2.5rem] overflow-hidden">
                    <p className="text-[var(--foreground)] opacity-50 group-hover:opacity-35 text-sm transition-opacity">
                      {post.description}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      </PageTransition>
    </div>
  );
}
