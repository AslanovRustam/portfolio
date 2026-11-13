import Image from 'next/image';
import type { Project } from '@/content/projects';
import { Link } from '@/i18n/navigation';

export interface CardCopy {
  title: string;
  kind: string;
  badge?: string;
  /** "In development", for a product that is not finished yet */
  status?: string;
}

/** A blueprint sheet standing in for a project without a public page to capture. */
export function BlueprintPoster({ title }: { title: string }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-[#0b1f38] [background-image:linear-gradient(#7fe3ff22_1px,transparent_1px),linear-gradient(90deg,#7fe3ff22_1px,transparent_1px)] [background-size:24px_24px]"
    >
      <span className="border border-dashed border-[#7fe3ff]/60 px-4 py-2 text-lg font-bold text-[#7fe3ff]">
        {title}
      </span>
    </div>
  );
}

/**
 * One project on the Work track: its live-site poster (or a blueprint sheet), title, kind and year.
 * The whole card links to the case overlay at /work/<slug> without scrolling the page.
 */
export default function ProjectCard({ project, copy }: { project: Project; copy: CardCopy }) {
  const wide = project.featured;
  return (
    <Link
      href={`/work/${project.slug}`}
      scroll={false}
      prefetch
      data-ui
      className="group relative block h-full overflow-hidden rounded-[8px] bg-[#0b1f38] shadow-[0_0_0_1px_rgb(0_0_0/0.6)] outline-2 outline-offset-[-5px] outline-[#f4f4f4] outline-solid transition-[outline-color] hover:outline-[#ff7a1a] focus-visible:outline-[#ffffff] focus-visible:shadow-[0_0_0_2px_#050507,0_0_0_4px_#ffffff]"
    >
      {project.poster ? (
        <Image
          src={project.poster}
          alt=""
          fill
          sizes={wide ? '(min-width: 1024px) 40vw, 85vw' : '(min-width: 1024px) 22vw, 60vw'}
          className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <BlueprintPoster title={copy.title} />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050507] via-[#050507]/85 to-transparent px-4 pb-3 pt-10">
        <h3 className="text-lg font-bold leading-tight sm:text-xl">{copy.title}</h3>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-3 text-xs text-[#e8f7ff]/70">
          <span>{copy.kind}</span>
          <span className="text-[#7fe3ff]">{project.year}</span>
        </p>
      </div>
      {(copy.badge || copy.status) && (
        <span className="absolute left-3 top-3 flex gap-1.5 text-[11px]">
          {copy.badge && <span className="bg-[#050507]/80 px-2 py-1 text-[#ff7a1a]">{copy.badge}</span>}
          {copy.status && <span className="bg-[#050507]/80 px-2 py-1 text-[#ffd23f]">{copy.status}</span>}
        </span>
      )}
    </Link>
  );
}
