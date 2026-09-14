import { Link } from 'react-router-dom';

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  remote?: string;
  employment_type?: string;
  min_salary?: number;
  max_salary?: number;
  salary_currency?: string;
  posted_at?: number;
  score?: number;
}

export function JobCard({ job, saved, onSave, onUnsave }: {
  job: Job;
  saved?: boolean;
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
}) {
  const salary = job.min_salary || job.max_salary
    ? `${job.salary_currency ?? '$'}${job.min_salary ? (job.min_salary / 1000).toFixed(0) + 'k' : ''}${job.max_salary ? '–' + (job.max_salary / 1000).toFixed(0) + 'k' : ''}`
    : null;

  const postedAgo = job.posted_at
    ? formatAgo(Date.now() - job.posted_at)
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <Link to={`/jobs/${job.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate block">
            {job.title}
          </Link>
          <div className="text-sm text-gray-500 mt-0.5">{job.company}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {job.score !== undefined && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${scoreColor(job.score)}`}>
              {Math.round(job.score * 100)}% match
            </span>
          )}
          <button
            onClick={() => saved ? onUnsave?.(job.id) : onSave?.(job.id)}
            className={`text-lg transition-colors ${saved ? 'text-yellow-500 hover:text-gray-400' : 'text-gray-300 hover:text-yellow-500'}`}
            title={saved ? 'Unsave' : 'Save'}
          >
            ★
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {job.remote && <Tag>{job.remote}</Tag>}
        {job.location && <Tag>{job.location}</Tag>}
        {job.employment_type && <Tag>{job.employment_type.replace('_', ' ')}</Tag>}
        {salary && <Tag>{salary}</Tag>}
        {postedAgo && <span className="text-xs text-gray-400">{postedAgo}</span>}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

function scoreColor(score: number) {
  if (score >= 0.75) return 'bg-green-100 text-green-700';
  if (score >= 0.5) return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
}

function formatAgo(ms: number): string {
  const d = Math.floor(ms / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
