import { Link } from 'react-router-dom';
import { Star, MapPin, Briefcase, DollarSign, Clock, Zap } from 'lucide-react';

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

export function JobCard({ job, saved, onSave, onUnsave, matchScore, matchLoading, matchError, onComputeMatch }: {
  job: Job;
  saved?: boolean;
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
  matchScore?: number;
  matchLoading?: boolean;
  matchError?: boolean;
  onComputeMatch?: (id: string) => void;
}) {
  const salary = job.min_salary || job.max_salary
    ? `${job.salary_currency ?? '$'}${job.min_salary ? (job.min_salary / 1000).toFixed(0) + 'k' : ''}${job.max_salary ? '-' + (job.max_salary / 1000).toFixed(0) + 'k' : ''}`
    : null;

  const postedAgo = job.posted_at
    ? formatAgo(Date.now() - job.posted_at)
    : null;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/60 p-5 hover:bg-white hover:shadow-lg transition-all duration-300">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <Link to={`/jobs/${job.id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600 truncate block transition-colors">
            {job.title}
          </Link>
          <div className="text-sm font-medium text-gray-500 mt-1">{job.company}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {matchScore !== undefined ? (
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${scoreColor(matchScore)}`}>
              {Math.round(matchScore * 100)}% Match
            </span>
          ) : matchLoading ? (
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Computing...</span>
          ) : matchError ? (
            <button
              onClick={() => onComputeMatch?.(job.id)}
              className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full transition-colors whitespace-nowrap"
              title="Match failed — click to retry"
            >
              Retry match
            </button>
          ) : onComputeMatch ? (
            <button
              onClick={() => onComputeMatch(job.id)}
              className="flex items-center gap-1 text-xs font-medium bg-[#f0ece1] text-gray-800 hover:bg-[#e4dfd3] px-3 py-1 rounded-full transition-colors whitespace-nowrap"
            >
              <Zap size={12} className="text-yellow-500" />
              Match
            </button>
          ) : null}
          <button
            onClick={() => saved ? onUnsave?.(job.id) : onSave?.(job.id)}
            className={`p-1.5 rounded-full transition-colors ${saved ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'}`}
          >
            <Star size={16} fill={saved ? 'currentColor' : 'none'} strokeWidth={saved ? 0 : 2} />
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-4">
        {job.remote && <Tag icon={<MapPin size={12} />}>{job.remote}</Tag>}
        {job.location && <Tag icon={<MapPin size={12} />}>{job.location}</Tag>}
        {job.employment_type && <Tag icon={<Briefcase size={12} />}>{job.employment_type.replace('_', ' ')}</Tag>}
        {salary && <Tag icon={<DollarSign size={12} />}>{salary}</Tag>}
        {postedAgo && (
          <span className="flex items-center gap-1 text-xs font-medium text-gray-400 ml-auto">
            <Clock size={12} />
            {postedAgo}
          </span>
        )}
      </div>
    </div>
  );
}

function Tag({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-white border border-gray-100 text-gray-600 px-2.5 py-1 rounded-full shadow-sm">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="capitalize">{children}</span>
    </span>
  );
}

function scoreColor(score: number) {
  if (score >= 0.75) return 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]';
  if (score >= 0.5) return 'bg-[#fef9c3] text-[#854d0e] border border-[#fef08a]';
  return 'bg-gray-100 text-gray-600 border border-gray-200';
}

function formatAgo(ms: number): string {
  const d = Math.floor(ms / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
