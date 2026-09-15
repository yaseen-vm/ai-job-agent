// Skeleton pulse block
function Bone({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200/80 rounded-xl animate-pulse ${className}`} />;
}

// Full-page branded loading screen — shown on initial app load
export function PageLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#dce2e8] via-[#e8e9e1] to-[#f4ead2] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#2c2d30] flex items-center justify-center shadow-xl">
            <span className="text-white text-2xl font-bold">J</span>
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white animate-ping" />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-600 tracking-wide">JobAgent</p>
          <div className="flex gap-1.5">
            {[0, 150, 300].map(delay => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for a job card
function JobCardSkeleton() {
  return (
    <div className="bg-white/70 rounded-[1.5rem] border border-white/50 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Bone className="h-4 w-3/4" />
          <Bone className="h-3 w-1/2" />
        </div>
        <Bone className="h-8 w-16 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Bone className="h-5 w-16 rounded-full" />
        <Bone className="h-5 w-20 rounded-full" />
        <Bone className="h-5 w-14 rounded-full" />
      </div>
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-2/3" />
    </div>
  );
}

export function JobsPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white/60 rounded-[2rem] p-6 flex flex-col items-center gap-2">
            <Bone className="h-8 w-16" />
            <Bone className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Filter bar */}
      <div className="bg-white/80 rounded-[2rem] p-6 space-y-4">
        <div className="flex gap-4">
          <Bone className="h-10 flex-1 rounded-full" />
          <Bone className="h-10 flex-1 rounded-full" />
          <Bone className="h-10 flex-1 rounded-full" />
        </div>
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2 animate-pulse">
      {/* Header */}
      <div className="bg-white/80 rounded-[2rem] p-6 flex items-center gap-5">
        <Bone className="w-16 h-16 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-5 w-48" />
          <Bone className="h-3 w-32" />
        </div>
        <Bone className="h-10 w-28 rounded-full shrink-0" />
      </div>
      {/* Sections */}
      {[180, 220, 160].map((h, i) => (
        <div key={i} className="bg-white/80 rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bone className="w-8 h-8 rounded-xl" />
            <Bone className="h-4 w-32" />
          </div>
          <div className="bg-gray-200/80 rounded-xl animate-pulse w-full" style={{ height: `${h * 0.4}px` }} />
          <div className="grid grid-cols-2 gap-4">
            <Bone className="h-10 rounded-xl" />
            <Bone className="h-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GenericPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <Bone className="h-7 w-48" />
        <Bone className="h-9 w-32 rounded-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white/70 rounded-[1.5rem] border border-white/50 p-5 flex items-center gap-4">
          <Bone className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-2/3" />
            <Bone className="h-3 w-1/3" />
          </div>
          <Bone className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
