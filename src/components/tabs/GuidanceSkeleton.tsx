import { Sparkles } from 'lucide-react';

interface GuidanceSkeletonProps {
  message: string;
  cardCount?: number;
  variant?: 'routine' | 'indoor' | 'sustainable';
}

export function GuidanceSkeleton({
  message,
  cardCount = 3,
  variant = 'routine',
}: GuidanceSkeletonProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-mono text-accent py-1.5 px-3 rounded-lg bg-accent/10 border border-accent/20 w-fit">
        <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
        <span>{message}</span>
      </div>
      {[...Array(cardCount)].map((_, i) => (
        <div key={i} className="surface-card space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />
          {variant === 'sustainable' ? (
            <>
              <div className="h-4 w-48 bg-ink-800 rounded-md animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 bg-ink-850 rounded-xl animate-pulse" />
                <div className="h-16 bg-ink-850 rounded-xl animate-pulse" />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="h-4 w-40 bg-ink-800 rounded-md animate-pulse" />
                <div className="h-5 w-28 bg-ink-800 rounded-md animate-pulse" />
              </div>
              <div className="h-10 w-full bg-ink-850 rounded-lg animate-pulse" />
              {variant === 'routine' && <div className="h-12 w-full bg-ink-900 rounded-lg animate-pulse" />}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
