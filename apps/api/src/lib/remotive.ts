// Remotive public API — free, no auth required
// Docs: https://remotive.com/api/remote-jobs

export interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

export async function fetchRemotiveJobs(category?: string, search?: string): Promise<RemotiveJob[]> {
  const url = new URL('https://remotive.com/api/remote-jobs');
  if (category) url.searchParams.set('category', category);
  if (search) url.searchParams.set('search', search);
  url.searchParams.set('limit', '100');

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': 'ai-job-agent/1.0' },
  });
  if (!res.ok) throw new Error(`Remotive API error: ${res.status}`);

  const data = await res.json<{ jobs: RemotiveJob[] }>();
  return data.jobs ?? [];
}

export function normalizeRemotiveJob(raw: RemotiveJob) {
  const jobType = mapJobType(raw.job_type);
  const { min, max, currency } = parseSalary(raw.salary);

  return {
    source_name: 'remotive',
    source_job_id: String(raw.id),
    source_url: raw.url,
    title: raw.title,
    company: raw.company_name,
    location: raw.candidate_required_location || null,
    remote: 'remote' as const,
    employment_type: jobType,
    description: stripHtml(raw.description),
    required_skills: raw.tags ?? [],
    preferred_skills: [] as string[],
    min_salary: min,
    max_salary: max,
    salary_currency: currency,
    posted_at: new Date(raw.publication_date).getTime() || null,
  };
}

function mapJobType(t: string): 'full_time' | 'contract' | 'part_time' | null {
  const s = t.toLowerCase();
  if (s.includes('full')) return 'full_time';
  if (s.includes('contract') || s.includes('freelance')) return 'contract';
  if (s.includes('part')) return 'part_time';
  return null;
}

function parseSalary(s: string): { min: number | null; max: number | null; currency: string | null } {
  if (!s) return { min: null, max: null, currency: null };
  const currency = s.includes('$') ? 'USD' : s.includes('€') ? 'EUR' : s.includes('£') ? 'GBP' : null;
  const nums = s.replace(/[^0-9\-–]/g, ' ').trim().split(/[\s\-–]+/).map(Number).filter(Boolean);
  if (nums.length >= 2) return { min: nums[0], max: nums[1], currency };
  if (nums.length === 1) return { min: nums[0], max: null, currency };
  return { min: null, max: null, currency };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
