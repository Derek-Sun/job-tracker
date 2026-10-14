import 'server-only';

// Elements whose contents are never job content
const STRIPPED_TAGS = ['script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside'];

const ENTITIES: [RegExp, string][] = [
  [/&amp;/g, '&'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&quot;/g, '"'],
  [/&#39;|&apos;|&#x27;/g, "'"],
  [/&nbsp;/g, ' '],
  [/&#8211;|&ndash;/g, '–'],
  [/&#8212;|&mdash;/g, '—'],
  [/&#8226;|&bull;/g, '•'],
  [/&#\d+;/g, ' '],
  [/&[a-z]+;/gi, ' '],
];

export function htmlToText(html: string): string {
  let text = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of STRIPPED_TAGS) {
    text = text.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
  }

  const main = text.match(/<main\b[^>]*>[\s\S]*?<\/main>/i) ?? text.match(/<article\b[^>]*>[\s\S]*?<\/article>/i);
  if (main) text = main[0];

  text = text
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|td|th|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<(br|hr)\b[^>]*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  for (const [re, ch] of ENTITIES) text = text.replace(re, ch);

  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface JsonLdAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

export interface JsonLdJobPosting {
  '@type': string;
  title?: string;
  hiringOrganization?: { name?: string };
  jobLocation?: Array<{ address?: JsonLdAddress }> | { address?: JsonLdAddress };
  description?: string;
}

function isJobPosting(item: unknown): item is JsonLdJobPosting {
  return !!item && typeof item === 'object' && (item as Record<string, unknown>)['@type'] === 'JobPosting';
}

export function extractJsonLd(html: string): JsonLdJobPosting | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try {
      const data: unknown = JSON.parse(m[1]);
      for (const item of Array.isArray(data) ? data : [data]) {
        if (isJobPosting(item)) return item;
        const graph = (item as { '@graph'?: unknown } | null)?.['@graph'];
        const found = Array.isArray(graph) ? graph.find(isJobPosting) : undefined;
        if (found) return found;
      }
    } catch {
      // malformed JSON — try the next script block
    }
  }
  return null;
}

export function jsonLdLocation(posting: JsonLdJobPosting): string {
  const loc = Array.isArray(posting.jobLocation) ? posting.jobLocation[0] : posting.jobLocation;
  const addr = loc?.address;
  if (!addr) return '';
  return [addr.addressLocality, addr.addressRegion].filter(Boolean).join(', ');
}
