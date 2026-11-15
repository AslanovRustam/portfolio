'use client';

import Image from 'next/image';
import { useState, useSyncExternalStore } from 'react';
import type { Project } from '@/content/projects';
import { loopAllowed, loopSources, loopsDisabled, saveDataOn } from '@/experience/loops';
import { useExperience } from '@/experience/store';
import { BlueprintPoster } from './ProjectCard';

const noSubscribe = () => () => {};

/**
 * A project's picture in its case card: the still (or a blueprint sheet), and over it the live loop when
 * the project has one and loops may play here (not under reduced motion, save-data or ?loops=0). The
 * server renders the still; the loop joins once the page runs, with the still as its poster, so nothing
 * jumps. A loop that fails to load simply leaves the still. Decorative: the case's text says what it is.
 */
export default function ProjectMedia({ project, title }: { project: Project; title: string }) {
  const src = loopSources(project);
  const reducedMotion = useExperience((s) => s.reducedMotion);
  // false on the server and in the first client render, so hydration matches; true once the page runs
  const client = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [failed, setFailed] = useState(false);
  const play =
    client &&
    src !== null &&
    !failed &&
    loopAllowed({ place: 'case', tier: 'high', reducedMotion, saveData: saveDataOn(), disabled: loopsDisabled(location.search) });

  return (
    <>
      {project.poster ? (
        <Image src={project.poster} alt="" fill loading="eager" sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-top" />
      ) : (
        <BlueprintPoster title={title} />
      )}
      {play && (
        <video
          key={src.webm}
          src={document.createElement('video').canPlayType('video/webm; codecs="vp9"') ? src.webm : src.mp4}
          poster={src.still}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      )}
    </>
  );
}
