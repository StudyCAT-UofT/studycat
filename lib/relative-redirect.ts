import { NextResponse } from 'next/server';

/**
 * Redirect to a path on this site using a relative Location header (e.g. `/login`).
 *
 * Don't build redirect URLs from `request.url`: Next.js derives it from the address the
 * server listens on (e.g. http://localhost:9000), not the public hostname, so behind a
 * reverse proxy such as Apache it sends the browser to the wrong host. A relative
 * Location is resolved by the browser against the URL it actually requested.
 */
export function relativeRedirect(path: string, status = 307): NextResponse {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`relativeRedirect expects a site-relative path, got: ${path}`);
  }
  return new NextResponse(null, { status, headers: { Location: path } });
}
