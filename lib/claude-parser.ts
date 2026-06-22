import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { ParsedJob, Salary, SalaryBand } from './types';

const client = new Anthropic();

const SYSTEM_PROMPT =
  'You are a job posting parser. Extract structured data from the job posting text provided.\n\n' +
  'Rules:\n' +
  '- title, company, location: return empty string if not found\n' +
  '- salary: omit entirely if no salary or compensation info is present\n' +
  '- description: clean the text — remove apply/share/save buttons, site navigation, cookie notices, ' +
  'privacy policy, EEO boilerplate, "similar jobs" sections, and other UI noise. Keep only the actual ' +
  'job content: role overview, responsibilities, requirements/qualifications, about the team or company, and benefits.\n' +
  '- For multi-level salary bands (e.g. "Summary Pay Range / Associate: $90k - $120k"), extract each band with its label.';

const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'extract_job_details',
  description: 'Extract structured job details from the posting text',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' },
      company: { type: 'string' },
      location: {
        type: 'string',
        description: 'Work location, e.g. "Seattle, WA (Hybrid)", "Remote", "New York, NY"',
      },
      description: {
        type: 'string',
        description: 'Cleaned job content only — no UI boilerplate',
      },
      salary: {
        type: 'object',
        description: 'Omit this property entirely if no salary is mentioned',
        properties: {
          raw: { type: 'string', description: 'Salary as listed in the posting' },
          min: { type: 'number' },
          max: { type: 'number' },
          currency: { type: 'string', default: 'USD' },
          bands: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                min: { type: 'number' },
                max: { type: 'number' },
                currency: { type: 'string', default: 'USD' },
              },
              required: ['label', 'min', 'max'],
            },
          },
        },
        required: ['raw'],
      },
    },
    required: ['title', 'company', 'location', 'description'],
  },
};

type ExtractInput = {
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: {
    raw: string;
    min?: number;
    max?: number;
    currency?: string;
    bands?: Array<{ label: string; min: number; max: number; currency?: string }>;
  };
};

export interface ParseHints {
  title?: string;
  company?: string;
  location?: string;
}

export async function parseWithClaude(text: string, hints?: ParseHints): Promise<ParsedJob> {
  const truncated = text.slice(0, 15000);

  let userContent = '';
  if (hints) {
    const parts: string[] = [];
    if (hints.title) parts.push(`title: "${hints.title}"`);
    if (hints.company) parts.push(`company: "${hints.company}"`);
    if (hints.location) parts.push(`location: "${hints.location}"`);
    if (parts.length > 0) {
      userContent = `Structured data from the page indicates ${parts.join(', ')}. Confirm or correct these from the full text below.\n\n`;
    }
  }
  userContent += `Job posting text:\n${truncated}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: 'tool', name: 'extract_job_details' },
    messages: [{ role: 'user', content: userContent }],
  });

  const toolUse = message.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return structured job details');
  }

  const input = toolUse.input as ExtractInput;

  let salary: Salary | undefined;
  if (input.salary) {
    const bands: SalaryBand[] | undefined = input.salary.bands?.map((b) => ({
      label: b.label,
      min: b.min,
      max: b.max,
      currency: b.currency ?? 'USD',
    }));
    salary = {
      raw: input.salary.raw,
      min: input.salary.min ?? (bands && bands.length > 0 ? Math.min(...bands.map((b) => b.min)) : undefined),
      max: input.salary.max ?? (bands && bands.length > 0 ? Math.max(...bands.map((b) => b.max)) : undefined),
      currency: input.salary.currency ?? 'USD',
      bands: bands && bands.length > 0 ? bands : undefined,
    };
  }

  return {
    title: input.title,
    company: input.company,
    location: input.location,
    description: input.description,
    salary,
  };
}
