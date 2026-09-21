import { Link } from "@/components/Elements";

import { PageTransition } from "@/components/PageTransition";
import Icon from "@/components/Icon";
import ObfuscatedMail from "@/components/ObfuscatedMail";





export const metadata = {
  title: "Asher Falcon",
  description: "Asher Falcon - software engineer & student",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <PageTransition className="flex-1 flex flex-col">
      <div className="flex-1">
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
          <div className="space-y-10">
            {/* Intro */}
            <div>
              <h1 className="text-lg font-medium mb-3">Asher Falcon</h1>
              <p className="text-[var(--foreground)] opacity-70 leading-relaxed">
                I&apos;m a 1st year BSc Computer Science student at the University of Manchester.
                This is where I share my projects, ideas, and what I&apos;m learning along the way.
              </p>
            </div>

            {/* Navigation */}
            <nav className="flex gap-6">
              <Link href="/blog" className="text-[var(--ashgreen)] hover:text-[var(--ashgreen-light)]">
                Blog
              </Link>
              <Link href="/projects" className="text-[var(--ashgreen)] hover:text-[var(--ashgreen-light)]">
                Projects
              </Link>
            </nav>

            {/* Contact */}
            <div className="space-y-2 text-sm">
              <a
                href="https://github.com/ashfn"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-[var(--ashgreen)] hover:text-[#8957e5] transition-colors duration-200"
              >
                <Icon name="github" size={15} className="transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                github.com/ashfn
              </a>
              <a
                href="https://www.linkedin.com/in/ashfn/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-[var(--ashgreen)] hover:text-[#0a66c2] transition-colors duration-200"
              >
                <Icon name="linkedin" size={15} className="transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                linkedin.com/in/ashfn
              </a>
              <a
                href="https://matrix.to/#/@ashfn:matrix.org"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-[var(--ashgreen)] hover:text-[var(--foreground)] transition-colors duration-200"
              >
                <span className="font-bold text-[11px] leading-none transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 inline-flex items-center justify-center w-[15px] shrink-0">[m]</span>
                @ashfn:matrix.org
              </a>
              <ObfuscatedMail />
            </div>
          </div>
        </div>
      </div>


      </PageTransition>



    </div>
  );
}
