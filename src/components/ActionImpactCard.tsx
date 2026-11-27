import { Sparkles, CheckCircle2, Info } from 'lucide-react';
import { useMemo } from 'react';
import { rankTopActions } from '../utils/actionImpact';
import type { AQIData, UserProfile } from '../types';

interface ActionImpactCardProps {
  profile: UserProfile;
  aqiData: AQIData | null;
  isLoading?: boolean;
}

export function ActionImpactCard({ profile, aqiData, isLoading = false }: ActionImpactCardProps) {
  const actions = useMemo(() => rankTopActions(profile, aqiData), [profile, aqiData]);

  return (
    <section
      aria-label="Biggest moves for you today"
      className="bg-ink-900/90 border border-ink-100/[0.08] rounded-xl p-3 space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <h4 className="text-xs font-semibold text-ink-100 tracking-tight">
            Biggest moves for you today
          </h4>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-850 border border-ink-100/[0.08] text-ink-400">
          Model estimate
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse" aria-busy="true">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="h-10 rounded-lg bg-ink-850/80" />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>You&apos;re already doing the top protective actions for your profile.</span>
        </div>
      ) : (
        <ol className="space-y-1.5 list-none m-0 p-0">
          {actions.map((item, idx) => (
            <li
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 px-2.5 py-2 rounded-lg bg-ink-850/75 border border-ink-100/[0.06]"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-[11px] font-mono font-semibold text-accent mt-0.5 flex-shrink-0">
                  {idx + 1}.
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-ink-100">{item.title}</div>
                  <div className="text-[10px] text-ink-400 leading-snug">{item.subtitle}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:flex-shrink-0 pl-4 sm:pl-0">
                <span className="text-[11px] font-mono font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded whitespace-nowrap">
                  −{item.savedUg} μg/day (−{item.savedPct}%)
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      <details className="group text-[10px] text-ink-400 pt-0.5">
        <summary className="cursor-pointer inline-flex items-center gap-1 text-ink-400 hover:text-ink-200 select-none focus-visible:ring-1 focus-visible:ring-accent rounded">
          <Info className="w-3 h-3" />
          <span>How is this calculated?</span>
        </summary>
        <p className="mt-1.5 pl-4 text-ink-400 leading-relaxed">
          Ranks un-adopted interventions by re-running our deterministic 24-hour inhalation model (~15 m³/day air volume, 82% indoor HEPA factor, conservative ~45% N95 fit assumption). Savings are model estimates to prioritize actions, not clinical measurements.
        </p>
      </details>
    </section>
  );
}
