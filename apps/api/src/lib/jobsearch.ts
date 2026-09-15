// Adzuna API — free tier, aggregates Indeed, Reed, Totaljobs and 50+ boards
// Docs: https://developer.adzuna.com/docs/search

export interface NormalizedJob {
  source_name: string;
  source_job_id: string;
  source_url: string;
  title: string;
  company: string;
  location: string | null;
  remote: 'remote' | 'hybrid' | 'onsite';
  employment_type: 'full_time' | 'contract' | 'part_time' | null;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  min_salary: number | null;
  max_salary: number | null;
  salary_currency: string | null;
  posted_at: number | null;
}

const ADZUNA_APP_ID = '07e33b27';
const ADZUNA_APP_KEY = '6061e96c32a1c141a3382f37bdd50110';

// Countries to search — add more as needed
const COUNTRIES = ['gb', 'us', 'in'];

export async function fetchJobs(search: string): Promise<NormalizedJob[]> {
  const results: NormalizedJob[] = [];

  for (const country of COUNTRIES) {
    try {
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
      url.searchParams.set('app_id', ADZUNA_APP_ID);
      url.searchParams.set('app_key', ADZUNA_APP_KEY);
      url.searchParams.set('what', search);
      url.searchParams.set('results_per_page', '50');
      url.searchParams.set('content-type', 'application/json');

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json', 'User-Agent': 'ai-job-agent/1.0' },
      });
      if (!res.ok) {
        console.error(`Adzuna ${country} error: ${res.status}`);
        continue;
      }

      const data = await res.json<{ results: AdzunaJob[] }>();
      for (const job of data.results ?? []) {
        results.push(normalizeJob(job, country));
      }
    } catch (e) {
      console.error(`Adzuna fetch failed for ${country}:`, e);
    }
  }

  return results;
}

interface AdzunaJob {
  id: string;
  redirect_url: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  description: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  contract_time?: string;
  contract_type?: string;
  created: string;
  category: { label: string; tag: string };
}

function normalizeJob(raw: AdzunaJob, country: string): NormalizedJob {
  const locationStr = raw.location?.display_name ?? null;
  const isRemote = /remote/i.test(raw.title + ' ' + raw.description + ' ' + locationStr);

  return {
    source_name: 'adzuna',
    source_job_id: `${country}_${raw.id}`,
    source_url: raw.redirect_url,
    title: raw.title,
    company: raw.company?.display_name ?? 'Unknown',
    location: locationStr,
    remote: isRemote ? 'remote' : 'onsite',
    employment_type: mapContractTime(raw.contract_time),
    description: raw.description ?? '',
    required_skills: [],
    preferred_skills: [],
    min_salary: raw.salary_min ?? null,
    max_salary: raw.salary_max ?? null,
    salary_currency: country === 'us' ? 'USD' : country === 'in' ? 'INR' : 'GBP',
    posted_at: raw.created ? new Date(raw.created).getTime() : null,
  };
}

function mapContractTime(t?: string): 'full_time' | 'contract' | 'part_time' | null {
  if (!t) return null;
  if (t === 'full_time') return 'full_time';
  if (t === 'part_time') return 'part_time';
  if (t === 'contract') return 'contract';
  return null;
}
