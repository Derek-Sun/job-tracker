import { NextResponse } from 'next/server';
import { withSession } from '@/lib/api';
import { parseWithClaude } from '@/lib/claude-parser';
import { extractJsonLd, htmlToText, jsonLdLocation } from '@/lib/html';

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

function isBlockedUrl(url: URL): boolean {
  return BLOCKED_HOSTS.includes(url.hostname) || url.hostname.endsWith('.internal');
}

export const POST = withSession(async (_session, req) => {
  let url: URL;
  try {
    const body = await req.json();
    url = new URL(body.url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return NextResponse.json({ error: 'Only http/https URLs are supported' }, { status: 400 });
  }

  if (isBlockedUrl(url)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobTrackerBot/1.0; +personal-use)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(7_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Site returned ${res.status} ${res.statusText}` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return NextResponse.json({ error: 'URL does not point to an HTML page' }, { status: 422 });
    }

    const html = await res.text();

    // Prefer the structured description when it's substantial; fall back to the whole page
    const jsonLd = extractJsonLd(html);
    const descText = jsonLd?.description ? htmlToText(jsonLd.description) : '';
    const text = descText.length >= 50 ? descText : htmlToText(html);

    if (text.length < 50) {
      return NextResponse.json({ error: 'Could not extract readable text from page' }, { status: 422 });
    }

    const hints = jsonLd
      ? {
          title: jsonLd.title?.trim() || undefined,
          company: jsonLd.hiringOrganization?.name?.trim() || undefined,
          location: jsonLdLocation(jsonLd) || undefined,
        }
      : undefined;

    return NextResponse.json(await parseWithClaude(text, hints));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fetch failed';
    if (msg.includes('timeout') || msg.includes('TimeoutError')) {
      return NextResponse.json({ error: 'Page took too long to respond (7s timeout)' }, { status: 504 });
    }
    return NextResponse.json({ error: `Could not fetch URL: ${msg}` }, { status: 502 });
  }
});
