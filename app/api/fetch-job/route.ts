import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

function isBlockedUrl(url: URL): boolean {
  return BLOCKED_HOSTS.some((h) => url.hostname === h) || url.hostname.endsWith('.internal');
}

function htmlToText(html: string): string {
  let text = html
    // Remove entire blocks that are never job content
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, '')
    .replace(/<header\b[\s\S]*?<\/header>/gi, '')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, '');

  // Use semantic main content area when present — it excludes sidebars, ads, etc.
  const mainMatch = text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const articleMatch = text.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (mainMatch) text = mainMatch[0];
  else if (articleMatch) text = articleMatch[0];

  // Block-level elements → newlines
  text = text.replace(/<\/(p|div|section|article|li|h[1-6]|tr|td|th|ul|ol)\b[^>]*>/gi, '\n');
  text = text.replace(/<(br|hr)\b[^>]*\/?>/gi, '\n');

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8226;|&bull;/g, '•')
    .replace(/&#x27;/g, "'")
    .replace(/&#\d+;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ');

  return text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface JsonLdAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

interface JsonLdJobPosting {
  '@type': string;
  title?: string;
  hiringOrganization?: { name?: string };
  jobLocation?: Array<{ address?: JsonLdAddress }> | { address?: JsonLdAddress };
  description?: string;
  baseSalary?: {
    currency?: string;
    value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string };
  };
}

function extractJsonLd(html: string): JsonLdJobPosting | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const data: unknown = JSON.parse(m[1]);
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          if (obj['@type'] === 'JobPosting') return obj as unknown as JsonLdJobPosting;
          // @graph container
          if (Array.isArray(obj['@graph'])) {
            const found = (obj['@graph'] as unknown[]).find(
              (g) => g && typeof g === 'object' && (g as Record<string, unknown>)['@type'] === 'JobPosting'
            );
            if (found) return found as unknown as JsonLdJobPosting;
          }
        }
      }
    } catch {
      // malformed JSON — try the next script block
    }
  }
  return null;
}

function jsonLdLocation(posting: JsonLdJobPosting): string {
  const loc = Array.isArray(posting.jobLocation)
    ? posting.jobLocation[0]
    : posting.jobLocation;
  const addr = loc?.address;
  if (!addr) return '';
  // Use 2-letter abbreviation when region is a full state name
  const region = addr.addressRegion && addr.addressRegion.length > 2
    ? addr.addressRegion  // keep full name — the UI can display it
    : addr.addressRegion ?? '';
  return [addr.addressLocality, region].filter(Boolean).join(', ');
}

export interface StructuredJobFields {
  title?: string;
  company?: string;
  location?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        'User-Agent':
          'Mozilla/5.0 (compatible; JobTrackerBot/1.0; +personal-use)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
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

    // Prefer JSON-LD structured data when available (Workday, Radancy/Boeing, Greenhouse, etc.)
    const jsonLd = extractJsonLd(html);
    if (jsonLd) {
      const descText = jsonLd.description ? htmlToText(jsonLd.description) : '';
      const text = descText.length >= 50 ? descText : htmlToText(html);
      const structured: StructuredJobFields = {
        title: jsonLd.title?.trim() || undefined,
        company: jsonLd.hiringOrganization?.name?.trim() || undefined,
        location: jsonLdLocation(jsonLd) || undefined,
      };
      return NextResponse.json({ text, structured });
    }

    const text = htmlToText(html);
    if (text.length < 50) {
      return NextResponse.json({ error: 'Could not extract readable text from page' }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fetch failed';
    if (msg.includes('timeout') || msg.includes('TimeoutError')) {
      return NextResponse.json({ error: 'Page took too long to respond (10s timeout)' }, { status: 504 });
    }
    return NextResponse.json({ error: `Could not fetch URL: ${msg}` }, { status: 502 });
  }
}
