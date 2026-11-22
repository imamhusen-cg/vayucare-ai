import { Leaf, Heart, Clock, Bus, Home, HeartPulse, Apple, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  transport: Bus,
  indoor: Home,
  lifestyle: HeartPulse,
  diet: Apple,
};

function getDifficultyBadge(difficulty: 'easy' | 'medium' | 'hard') {
  switch (difficulty) {
    case 'easy':
      return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20';
    case 'medium':
      return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
    case 'hard':
      return 'text-rose-300 bg-rose-400/10 border-rose-400/20';
  }
}

function getUrgencyBadge(urgency: 'today' | 'this-week' | 'long-term') {
  switch (urgency) {
    case 'today':
      return 'text-rose-300 bg-rose-400/10 border-rose-400/20';
    case 'this-week':
      return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
    case 'long-term':
      return 'text-sky-300 bg-sky-400/10 border-sky-400/20';
  }
}

function ShimmerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-mono text-accent py-1.5 px-3 rounded-lg bg-accent/10 border border-accent/20 w-fit">
        <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
        <span>Synthesizing Sustainable Actions via Gemini...</span>
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="surface-card space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />
          <div className="h-4 w-48 bg-ink-800 rounded-md animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-ink-850 rounded-xl animate-pulse" />
            <div className="h-16 bg-ink-850 rounded-xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SustainableTab() {
  const { guidanceData, isLoadingGuidance } = useApp();

  if (isLoadingGuidance) return <ShimmerSkeleton />;
  if (!guidanceData) return <ShimmerSkeleton />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-500">
        Practical exposure mitigation and community emissions reduction measures.
      </p>

      {guidanceData.sustainableAlternatives.map((alt, i) => {
        const IconComponent = CATEGORY_ICONS[alt.category] || Leaf;

        return (
          <div key={i} className="surface-card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-ink-850 border border-ink-100/[0.06] flex items-center justify-center text-ink-300 flex-shrink-0">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink-100">{alt.action}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 font-mono text-[11px]">
                    <span className={`px-2 py-0.5 rounded border ${getDifficultyBadge(alt.difficulty)}`}>
                      {alt.difficulty === 'easy' ? 'Low friction' : alt.difficulty === 'medium' ? 'Moderate effort' : 'High effort'}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${getUrgencyBadge(alt.urgency)} flex items-center gap-1`}>
                      <Clock className="w-3 h-3" />
                      {alt.urgency === 'today' ? 'Implement today' : alt.urgency === 'this-week' ? 'This week' : 'Long-term habit'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Details */}
            <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
              <div className="surface-subcard p-3">
                <p className="text-xs font-medium text-rose-300 mb-1 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  Health protection impact
                </p>
                <p className="text-xs text-ink-300 leading-relaxed">{alt.healthImpact}</p>
              </div>
              <div className="surface-subcard p-3">
                <p className="text-xs font-medium text-emerald-300 mb-1 flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5" />
                  Environmental contribution
                </p>
                <p className="text-xs text-ink-300 leading-relaxed">{alt.envImpact}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
