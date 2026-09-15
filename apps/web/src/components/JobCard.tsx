import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

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

export function JobCard({ job, saved, onSave, onUnsave, matchScore, matchLoading, onComputeMatch }: {
  job: Job;
  saved?: boolean;
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
  matchScore?: number;
  matchLoading?: boolean;
  onComputeMatch?: (id: string) => void;
}) {
  const salary = job.min_salary || job.max_salary
    ? `${job.salary_currency ?? '$'}${job.min_salary ? (job.min_salary / 1000).toFixed(0) + 'k' : ''}${job.max_salary ? '-' + (job.max_salary / 1000).toFixed(0) + 'k' : ''}`
    : null;

  const postedAgo = job.posted_at
    ? formatAgo(Date.now() - job.posted_at)
    : null;

  return (
    <div className="group border border-line bg-paper hover:bg-ink hover:text-paper transition-all duration-500 flex flex-col justify-between h-full p-6">
      <div className="flex justify-between items-start gap-4 mb-12">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 group-hover:text-gray-400 mb-2">{job.company}</p>
          <Link to={`/jobs/${job.id}`} className="block">
            <h3 className="font-serif text-[clamp(24px,3vw,36px)] leading-tight tracking-tight mb-2 group-hover:text-acid transition-colors">
              {job.title}
            </h3>
          </Link>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <button
            onClick={() => saved ? onUnsave?.(job.id) : onSave?.(job.id)}
            className={`font-mono text-[10px] uppercase tracking-widest border pb-0.5 transition-colors ${
              saved 
                ? 'border-acid text-acid hover:text-red-400 hover:border-red-400' 
                : 'border-transparent text-gray-400 hover:text-ink hover:border-ink group-hover:hover:text-acid group-hover:hover:border-acid group-hover:text-white'
            }`}
          >
            {saved ? '[ Saved ]' : '[ Save ]'}
          </button>
          
          {matchScore !== undefined ? (
            <span className="font-mono text-[10px] uppercase tracking-widest bg-acid text-ink px-2 py-1">
              {Math.round(matchScore * 100)}% Match
            </span>
          ) : matchLoading ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400 animate-pulse">
              Computing...
            </span>
          ) : onComputeMatch ? (
            <button
              onClick={() => onComputeMatch(job.id)}
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest border border-line px-2 py-1 hover:bg-acid hover:text-ink hover:border-acid transition-colors group-hover:border-gray-700"
            >
              <Zap size={10} /> Match
            </button>
          ) : null}
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-gray-500 group-hover:text-gray-400 pt-4 border-t border-line group-hover:border-gray-800">
        {job.remote && <span>/ {job.remote}</span>}
        {job.location && <span>/ {job.location}</span>}
        {job.employment_type && <span>/ {job.employment_type.replace('_', ' ')}</span>}
        {salary && <span>/ {salary}</span>}
        {postedAgo && (
          <span className="ml-auto text-ink group-hover:text-acid">
            {postedAgo}
          </span>
        )}
      </div>
    </div>
  );
}

function formatAgo(ms: number): string {
  const d = Math.floor(ms / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
