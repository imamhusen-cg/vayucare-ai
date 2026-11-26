import { Home, Wind, Leaf, ChefHat, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GuidanceSkeleton } from './GuidanceSkeleton';

function isVentilationPermitted(windowStrategy: string): boolean {
  const lower = windowStrategy.toLowerCase();
  if (/do not open|never open|avoid opening|keep.*closed throughout/.test(lower)) {
    return false;
  }
  return (
    lower.includes('permitted') ||
    lower.includes('open windows') ||
    lower.includes('cross-ventilate') ||
    lower.includes('can be opened')
  );
}

export function IndoorTab() {
  const { guidanceData, isLoadingGuidance, profile, aqiData } = useApp();

  if (isLoadingGuidance || !guidanceData) {
    return <GuidanceSkeleton message="Synthesizing Indoor Air Protocols via Gemini..." cardCount={4} variant="indoor" />;
  }

  const iaq = guidanceData.indoorAQ;
  const aqiNum = aqiData ? Number(aqiData.aqi) : 150;
  const isSevere = aqiNum > 200;

  let windowStrategy = iaq.windowStrategy;
  if (!windowStrategy || windowStrategy.trim().length < 25 || /^(?:open|closed|partial|yes|no)\.?$/i.test(windowStrategy.trim())) {
    windowStrategy = isSevere
      ? 'Keep all exterior doors and windows firmly sealed throughout the day to prevent toxic particulate infiltration. You may briefly cross-ventilate for 15 minutes between 1:30 PM and 2:30 PM when diurnal atmospheric mixing temporarily disperses ground-level smog.'
      : 'Keep windows sealed during early morning and evening rush hours when thermal inversion traps vehicular exhaust near the ground. Open windows for 30–45 minutes around 1:00 PM – 3:30 PM when surface solar warming raises the boundary layer for cleaner air exchange.';
  }

  let purifierAdvice = iaq.purifierAdvice;
  if (!purifierAdvice || purifierAdvice.trim().length < 25) {
    purifierAdvice = profile.hasAirPurifier
      ? 'Run your HEPA air purifier continuously on Auto in main living areas and switch to Turbo speed during cooking and after dusk. Ensure bedroom doors and windows remain sealed at night so the purifier maintains clean CADR air circulation.'
      : 'Since your home lacks a dedicated HEPA air purifier, wet-mop all hard floors twice daily to bind settled soot and prevent dust re-suspension. Place damp rolled towels at the base of exterior doors and avoid indoor incense or candle combustion completely.';
  }

  const canOpen = isVentilationPermitted(windowStrategy);

  return (
    <div className="space-y-4">
      {/* Window Strategy */}
      <div className="surface-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-ink-100 flex items-center gap-2">
            <Home className="w-4 h-4 text-accent" />
            Ventilation strategy
          </h3>
          <span className={`text-xs px-2.5 py-1 rounded-md border font-mono ${
            canOpen
              ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20'
              : 'text-rose-300 bg-rose-400/10 border-rose-400/20'
          }`}>
            {canOpen ? 'Midday Ventilation Permitted' : 'Keep Windows Sealed'}
          </span>
        </div>
        <p className="text-xs text-ink-200 leading-relaxed font-sans">{windowStrategy}</p>
      </div>

      {/* Purifier / Low-Cost Strategy */}
      <div className="surface-card space-y-3">
        <h3 className="text-sm font-medium text-ink-100 flex items-center gap-2">
          <Wind className="w-4 h-4 text-accent" />
          {profile.hasAirPurifier ? 'HEPA filtration schedule' : 'Alternative particulate capture (no purifier)'}
        </h3>
        <p className="text-xs text-ink-200 leading-relaxed font-sans">{purifierAdvice}</p>

        {!profile.hasAirPurifier && iaq.zeroCostTips && iaq.zeroCostTips.length > 0 && (
          <ul className="space-y-2 pt-2 border-t border-ink-100/[0.06]">
            {iaq.zeroCostTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-ink-300 bg-ink-850/80 rounded-lg p-2.5 border border-ink-100/[0.06]">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Kitchen Air Management */}
      <div className="surface-card space-y-3">
        <h3 className="text-sm font-medium text-ink-100 flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-ink-400" />
          Kitchen emission control
        </h3>
        <ul className="space-y-2">
          {iaq.kitchenTips && iaq.kitchenTips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink-300">
              <span className="w-1.5 h-1.5 rounded-full bg-ink-500 mt-1.5 flex-shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bio-Filtration Plants */}
      <div className="surface-card space-y-3">
        <h3 className="text-sm font-medium text-ink-100 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-400" />
          Bio-filtration indoor plants
        </h3>
        <div className="grid sm:grid-cols-3 gap-2.5">
          {iaq.plantSuggestions && iaq.plantSuggestions.map((plant, i) => {
            const [name, benefit] = plant.split('(');
            return (
              <div key={i} className="surface-subcard p-3">
                <p className="text-xs font-medium text-ink-100">{name.trim()}</p>
                {benefit && <p className="text-[11px] text-ink-400 mt-0.5">{benefit.replace(')', '')}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
