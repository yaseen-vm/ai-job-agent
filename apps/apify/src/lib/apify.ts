// Apify API client — wraps actor run lifecycle
// Actor: apify/indeed-scraper
// Docs: https://apify.com/apify/indeed-scraper

const APIFY_BASE = 'https://api.apify.com/v2';
const ACTOR_ID = 'borderline~indeed-scraper';

export interface ActorInput {
  query: string;
  country: string;
  maxItems: number;
  saveOnlyUniqueItems?: boolean;
}

export interface ApifyRunMeta {
  id: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';
  defaultDatasetId: string;
}

export interface IndeedJob {
  jobKey?: string;
  title: string;
  companyName: string;
  location?: string;
  jobType?: string[];
  descriptionText?: string;
  jobUrl: string;
  datePublished?: string;
  isRemote?: boolean;
  salary?: {
    salaryMin?: number;
    salaryMax?: number;
    salaryText?: string;
    salaryCurrency?: string;
  };
  applyUrl?: string;
  age?: string;
}

export async function startActorRun(
  token: string,
  input: ActorInput,
): Promise<string> {
  const res = await fetch(
    `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify start run failed: ${res.status} ${text}`);
  }
  const data = await res.json<{ data: ApifyRunMeta }>();
  return data.data.id;
}

export async function getRunStatus(
  token: string,
  runId: string,
): Promise<ApifyRunMeta> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
  if (!res.ok) throw new Error(`Apify get run failed: ${res.status}`);
  const data = await res.json<{ data: ApifyRunMeta }>();
  return data.data;
}

export async function getDatasetItems(
  token: string,
  datasetId: string,
): Promise<IndeedJob[]> {
  const res = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&format=json&clean=true`,
  );
  if (!res.ok) throw new Error(`Apify dataset fetch failed: ${res.status}`);
  return res.json<IndeedJob[]>();
}
