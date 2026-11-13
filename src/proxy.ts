import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { projectBySlug } from './content/projects';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);
const CASE = new RegExp(`^/(${routing.locales.join('|')})/work/([^/]+)/?$`);

/**
 * Locale routing for every page. A case URL with an unknown slug is answered as a 404 here: the case
 * page reads its slug behind Suspense, where notFound() can no longer change the response status.
 */
export default function proxy(req: NextRequest) {
  const match = req.nextUrl.pathname.match(CASE);
  if (match && !projectBySlug(match[2])) {
    // no route lives at this path, so Next renders its not-found page with a 404 status
    return NextResponse.rewrite(new URL(`/${match[1]}/work/not-found/missing`, req.url));
  }
  return intl(req);
}

export const config = {
  // every path except api routes, Next internals and files with an extension
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
