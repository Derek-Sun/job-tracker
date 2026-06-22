import type { Salary, SalaryBand } from './types';

export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  salary: Salary | undefined;
  description: string;
}

// Single-line UI/nav actions — exact matches only
const NOISE_LINE_RE = /^(apply( now)?|save( job)?|share( (job|this))?|report (job|listing|this)|print|back to (jobs?|search|results?|listings?)|view all jobs?|see all jobs?|sign in to apply|create (an? )?account|login|log in|sign up|register|get job alerts?|set up alerts?|skip to (content|main)|easy apply|quick apply|[\d,]+ (applicants?|people clicked apply)|\d+ (hour|day|week|month)s? ago|posted \d+ (hour|day|week|month)s? ago|similar jobs?|you may also like|related jobs?|recommended jobs?|job alert|notify me|save this job|follow|unfollow|message|connect|report this job)$/i;

// Patterns that signal the end of useful job content
const STOP_RE = /^(privacy policy|terms (of (service|use))?|cookie (policy|settings?|preferences?)|do not sell|accessibility (statement|information)|sitemap|©|copyright\s+\d{4}|all rights reserved|follow us|connect with us|get the app|equal opportunity employer|we are an equal opportunity|eeo statement|we provide equal (employment|opportunity)|all qualified applicants (will|are)|similar jobs?|you may also like|recommended (for you|jobs?)|people also (viewed|applied)|other (open )?(positions|roles|jobs?)|more (open )?(roles|jobs?)|jobs? you might like)/i;

// Section headers that anchor the start of real job content
const CONTENT_ANCHOR_RE = /^(about (the |this )?(role|job|position|opportunity|company|us|team)|the role\b|overview\b|job description\b|position (overview|summary)|responsibilities\b|requirements?\b|qualifications?\b|what you('ll| will)\b|who we (are|look for)|join (us|our team)\b|we('re| are) (looking|seeking|hiring)|the opportunity\b|your impact\b|what (the job|this role) (involves|entails))/i;

// Removes per-line noise but does NOT trim the leading header block.
// Use this before extracting title/company so those lines are still present.
function removeNoise(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let blankRun = 0;
  let stop = false;

  for (const line of lines) {
    const t = line.trim();

    if (!t) {
      blankRun++;
      if (blankRun === 1 && out.length > 0 && out[out.length - 1] !== '') out.push('');
      continue;
    }
    blankRun = 0;

    if (STOP_RE.test(t)) stop = true;
    if (stop) continue;

    if (NOISE_LINE_RE.test(t)) continue;
    if (/^https?:\/\/\S+$/.test(t)) continue;
    if (/^[\-–—|▸►✦◆<>\/\\]+$/.test(t)) continue;
    if (t.length <= 2 && !/^[•\-\*✓\d]/.test(t)) continue;

    out.push(t);
  }

  while (out.length > 0 && out[0] === '') out.shift();
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

// Applies removeNoise then trims everything before the first real content anchor.
// Used for the stored description field.
function cleanDescription(text: string): string {
  const noisy = removeNoise(text);
  const lines = noisy.split('\n');

  let start = 0;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const t = lines[i];
    if (!t) continue;
    if (t.length > 70) { start = i; break; }
    if (CONTENT_ANCHOR_RE.test(t)) { start = i; break; }
    if (/^[•\-\*✓→▸]/.test(t) && i + 1 < lines.length && /^[•\-\*✓→▸]/.test(lines[i + 1])) { start = i; break; }
  }

  const trimmed = lines.slice(start);
  while (trimmed.length > 0 && trimmed[0] === '') trimmed.shift();
  return trimmed.join('\n');
}

function extractSalaryBands(text: string): { bands: SalaryBand[]; raw: string } | undefined {
  const bands: SalaryBand[] = [];

  // Boeing-style: "Summary Pay Range / Label: $min - $max"
  const boeingRe = /Summary Pay Range\s*\/\s*(.+?):\s*\$([\d,]+)\s*[-–—]\s*\$([\d,]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = boeingRe.exec(text)) !== null) {
    bands.push({
      label: m[1].trim(),
      min: parseInt(m[2].replace(/,/g, ''), 10),
      max: parseInt(m[3].replace(/,/g, ''), 10),
      currency: 'USD',
    });
  }

  if (bands.length >= 2) {
    const raw = bands.map(b => `${b.label}: $${b.min.toLocaleString()} – $${b.max.toLocaleString()}`).join(' | ');
    return { bands, raw };
  }

  // Generic: labeled salary ranges ("Label: $X - $Y") appearing close together
  const lines = text.split('\n');
  const labeledRe = /^([A-Za-z][A-Za-z\s/]{2,30}):\s*\$([\d,]+)\s*[-–—]\s*\$([\d,]+)/;
  for (let i = 0; i < lines.length; i++) {
    const m2 = lines[i].trim().match(labeledRe);
    if (!m2) continue;
    const nearby: SalaryBand[] = [{
      label: m2[1].trim(),
      min: parseInt(m2[2].replace(/,/g, ''), 10),
      max: parseInt(m2[3].replace(/,/g, ''), 10),
      currency: 'USD',
    }];
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      const m3 = lines[j].trim().match(labeledRe);
      if (m3) {
        nearby.push({
          label: m3[1].trim(),
          min: parseInt(m3[2].replace(/,/g, ''), 10),
          max: parseInt(m3[3].replace(/,/g, ''), 10),
          currency: 'USD',
        });
      }
    }
    if (nearby.length >= 2) {
      const raw = nearby.map(b => `${b.label}: $${b.min.toLocaleString()} – $${b.max.toLocaleString()}`).join(' | ');
      return { bands: nearby, raw };
    }
  }

  return undefined;
}

function extractSalary(text: string): Salary | undefined {
  // Multi-band detection first
  const multiband = extractSalaryBands(text);
  if (multiband) {
    const mins = multiband.bands.map(b => b.min);
    const maxs = multiband.bands.map(b => b.max);
    return {
      raw: multiband.raw,
      min: Math.min(...mins),
      max: Math.max(...maxs),
      currency: 'USD',
      bands: multiband.bands,
    };
  }

  // Single salary range patterns
  const patterns = [
    /\$\s*([\d,]+)\s*[kK]?\s*[-–—to]+\s*\$?\s*([\d,]+)\s*[kK]?(?:\s*(?:\/yr|\/year|per year|annually|USD))?/,
    /USD\s*([\d,]+)\s*[-–—to]+\s*([\d,]+)/i,
    /([\d,]+)\s*[kK]\s*[-–—to]+\s*([\d,]+)\s*[kK]/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[0].trim();
      const isK =
        raw.toLowerCase().includes('k') ||
        (parseInt(match[1].replace(/,/g, ''), 10) < 1000);
      const mult = isK ? 1000 : 1;
      const min = Math.round(parseFloat(match[1].replace(/,/g, '')) * mult);
      const max = Math.round(parseFloat(match[2].replace(/,/g, '')) * mult);
      return { raw, min, max, currency: 'USD' };
    }
  }

  // Fallback: single salary figure
  const single = text.match(/\$\s*([\d,]+)\s*[kK]?(?:\s*(?:\/yr|\/year|per year|annually))/);
  if (single) {
    const isK = single[0].toLowerCase().includes('k') || parseInt(single[1].replace(/,/g, ''), 10) < 1000;
    const val = Math.round(parseFloat(single[1].replace(/,/g, '')) * (isK ? 1000 : 1));
    return { raw: single[0].trim(), min: val, max: val, currency: 'USD' };
  }

  return undefined;
}

function extractTitleAndCompany(lines: string[]): { title: string; company: string } {
  let title = '';
  let company = '';
  let titleIdx = -1;

  // Pass 1 — explicit labels: "Job Title: …" / "Company: …"
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    if (!title) {
      const m = line.match(/^(?:job\s+title|position|role|title)\s*[:\-]\s*(.+)/i);
      if (m) { title = m[1].trim(); titleIdx = i; }
    }
    if (!company) {
      const m = line.match(/^(?:company|employer|organization)\s*[:\-]\s*(.+)/i);
      if (m) company = m[1].trim();
    }
  }
  if (title && company) return { title, company };

  // Pass 2 — "Role at Company" on one line, OR standalone "at Company" line
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    // "at Acme Corp" on its own line (Greenhouse style)
    const atOnly = line.match(/^at\s+([A-Z][A-Za-z0-9&.,'\s]+?)(?:\s*[|\-]|\s*$)/);
    if (atOnly && !company) { company = atOnly[1].trim(); continue; }
    // "Software Engineer at Acme Corp"
    const atInline = line.match(/^(.+?)\s+at\s+([A-Z][A-Za-z0-9&.,'\s]+?)(?:\s*[|\-]|\s*$)/);
    if (atInline) {
      if (!title) { title = atInline[1].trim(); titleIdx = i; }
      if (!company) company = atInline[2].trim();
      if (title && company) return { title, company };
    }
  }

  // Pass 3 — first plausible title line (short, not a date/location/noise)
  if (!title) {
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const t = lines[i].trim();
      if (
        t.length > 3 && t.length < 100 &&
        !/^https?:/i.test(t) &&
        !/^\d/.test(t) &&
        !/^(full.?time|part.?time|contract|internship|remote|hybrid|on.?site)$/i.test(t)
      ) {
        title = t;
        titleIdx = i;
        break;
      }
    }
  }

  // Pass 4 — company is the line immediately after the title, when it looks like
  // a standalone company name (short, no location separator, not a date/type)
  if (!company && titleIdx >= 0) {
    for (let i = titleIdx + 1; i <= Math.min(titleIdx + 3, lines.length - 1); i++) {
      const t = lines[i].trim();
      if (!t) continue;

      const isLocation = /[A-Z][a-z]+([ ][A-Z][a-z]+)*,[ ]+[A-Z]{2}\b/.test(t);
      const isDateOrMeta = /\d+\s*(hour|day|week|month|year)|full.?time|part.?time|contract|remote|hybrid|applicant/i.test(t);

      // "Company · Location" or "Company | Type" — grab the part before the separator,
      // but only if that part doesn't itself look like a city/state
      const sepMatch = t.match(/^([^|·]+?)\s*[|·]\s*.+$/);
      if (sepMatch) {
        const left = sepMatch[1].trim();
        const leftIsLocation = /[A-Z][a-z]+([ ][A-Z][a-z]+)*,[ ]+[A-Z]{2}\b/.test(left);
        const leftIsMeta = /^(full.?time|part.?time|contract|remote|hybrid|on.?site)$/i.test(left);
        if (!leftIsLocation && !leftIsMeta && /^[A-Z]/.test(left)) { company = left; break; }
        continue; // this line is a location/meta line, skip it
      }

      // Plain company name: short, starts with capital, not a location or date
      if (t.length <= 60 && !isLocation && !isDateOrMeta && /^[A-Z]/.test(t)) {
        company = t;
        break;
      }
    }
  }

  return { title, company };
}

function extractCompanyFallback(text: string): string {
  // "About Acme" / "About Acme Corp" as a standalone section header
  const aboutMatch = text.match(/^about\s+([A-Z][A-Za-z0-9&.,'\s]{1,50}?)[\n:]/im);
  if (aboutMatch) {
    const name = aboutMatch[1].trim();
    if (!/^(the |this |us$|our |you$|the job|this position|the role)/i.test(name)) return name;
  }
  const joinMatch = text.match(/\bjoin\s+(?:the\s+)?([A-Z][A-Za-z0-9&\s]{2,30})(?:\s+team|\s+family|[,!.])/i);
  if (joinMatch) return joinMatch[1].trim();
  const atMatch = text.match(/\bat\s+([A-Z][A-Za-z0-9&\s]{2,30})(?:\s+we|\s+is|\s+are|\s+has|[,!.\n])/);
  if (atMatch) return atMatch[1].trim();
  return '';
}

function extractLocation(text: string): string {
  // Use [ ]+ (literal space, no newline) so the city regex never spans lines
  const cityRe = /\b([A-Z][a-z]+(?:[ ][A-Z][a-z]+)*),[ ]+([A-Z]{2})\b/;
  const remote = text.match(/\b(fully[ ]remote|remote[-\s]first|remote|hybrid|on-site|onsite|in-office)\b/i);
  if (remote) {
    const city = text.match(cityRe);
    if (city && !/^remote$/i.test(remote[1])) {
      return `${city[1]}, ${city[2]} (${remote[1]})`;
    }
    return remote[1];
  }
  const city = text.match(cityRe);
  if (city) return `${city[1]}, ${city[2]}`;
  return '';
}

export function parseJobDescription(text: string): ParsedJob {
  // Use the noise-removed (but not start-trimmed) text for field extraction so
  // the title/company lines at the top of the posting are still present.
  const full = removeNoise(text);
  const lines = full.split('\n').filter((l) => l.trim());
  const { title, company: companyFromTitle } = extractTitleAndCompany(lines);
  const company = companyFromTitle || extractCompanyFallback(full);
  return {
    title,
    company,
    location: extractLocation(full),
    salary: extractSalary(full),
    // cleanDescription additionally trims leading nav clutter for the stored body
    description: cleanDescription(text),
  };
}
