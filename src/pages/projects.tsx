import { Link } from "@/components/Elements";
import { Image } from "@/components/Elements";
import { PageTransition } from "@/components/PageTransition";

import Icon from "@/components/Icon";

export const metadata = {
  title: "Projects",
  description: "A collection of projects I've worked on.",
  keywords: ["projects", "software engineering", "coding", "tech"],
};

import { getProjects } from '../lib/projects';

function LinkIcon({ type }: { type: string }) {
  switch (type) {
    case "repository": return <Icon name="git" size={15} />;
    case "preview": return <Icon name="external" size={15} />;
    case "blog": return <Icon name="pen" size={15} />;
    case "youtube": return <Icon name="youtube" size={15} />;
    default: return <Icon name="external" size={15} />;
  }
}

export default function ProjectsPage() {
  const projects = getProjects();
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PageTransition>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-10">
          <Link href="/" className="text-[var(--ashgreen)] hover:text-[var(--ashgreen-light)]">
            &larr;
          </Link>
          <h1 className="text-lg font-medium">Projects</h1>
        </div>

        <div className="space-y-12">
          {projects.map((project) => (
            <div key={project.title} className="flex gap-5 items-start">
              <Image
                src={project.image}
                alt={project.title}
                width={120}
                height={120}
                className="w-[120px] h-[120px] object-cover rounded-lg border border-[var(--border)] shrink-0 hidden sm:block"
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-medium mb-1">{project.title}</h2>
                <p className="text-sm text-[var(--foreground)] opacity-55 leading-relaxed mb-3">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  {project.links.map((link) => {
                    const isInternal = link.href.startsWith('/');
                    const El = isInternal ? Link : 'a';
                    const extra = isInternal ? {} : { target: "_blank", rel: "noopener noreferrer" };
                    return (
                      <El
                        key={link.href}
                        href={link.href}
                        {...extra}
                        className="group inline-flex items-center gap-1.5 text-xs text-[var(--ashgreen)] hover:text-[var(--ashgreen-light)] no-underline hover:no-underline"
                      >
                        <LinkIcon type={link.type} />
                        {link.label}
                      </El>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </PageTransition>
    </div>
  );
}
