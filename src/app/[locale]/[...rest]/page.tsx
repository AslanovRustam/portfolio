import { notFound } from 'next/navigation';

/** Nothing here is meant to be navigated to: it only ever throws notFound(), so it is left out of instant-navigation validation. */
export const instant = false;

/**
 * Any path under a language that the site does not have (and an unknown case, which src/proxy.ts rewrites
 * to a path nothing else matches): the localized 404 in ../not-found.tsx, with a 404 status.
 */
export default function Rest() {
  notFound();
}
