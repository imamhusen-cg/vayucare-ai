import { ShieldCheck, Wind, Car, Bike, Bus, Train, Home, AlertTriangle, Flame } from 'lucide-react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import type { ExposureMetrics } from '../utils/exposure';

interface ExposureSummaryCardProps {
  exposure: ExposureMetrics;
  hasAirPurifier: boolean;
  activeNormalizedCommute: 'Cycle' | 'Auto/Open Transit' | 'Car with AC' | 'Metro' | 'Work From Home';
}

export function ExposureSummaryCard({
  exposure,
  hasAirPurifier,
  activeNormalizedCommute,
}: ExposureSummaryCardProps) {
  // Isolating animated numbers inside this leaf card prevents frame updates from re-rendering ProfileBar
  const animatedBaselineDose = useAnimatedNumber(exposure.baselineUnprotectedDoseUg, 350, 0);
  const animatedProtectedDose = useAnimatedNumber(exposure.totalProtectedDoseUg, 350, 0);
  const animatedMitigationPct = useAnimatedNumber(exposure.totalMitigationPct, 350, 0);
  const animatedHomeAirPct = useAnimatedNumber(exposure.homeAirProtectionPct, 350, 0);
  const animatedCommutePct = useAnimatedNumber(exposure.commuteProtectionPct, 350, 0);
  const animatedCigsBefore = useAnimatedNumber(exposure.cigsBefore, 350, 1);
  const animatedCigsAfter = useAnimatedNumber(exposure.cigsAfter, 350, 1);

  return (
    <div className="pt-2 border-t border-ink-100/[0.06]">
      <div className="bg-ink-850/85 border border-ink-100/[0.09] border-t-ink-100/[0.14] rounded-xl p-3.5 shadow-subtle space-y-3">
        {/* Summary Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-ink-100 tracking-tight flex items-center gap-1.5">
                24-Hour Exposure & Commute Impact
              </h3>
              <p className="text-[10px] text-ink-400">
                Dynamic microenvironment inhalation model • CPCB IND-AQI grounded
              </p>
            </div>
          </div>

          <div className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-ink-900 border border-ink-100/[0.08] text-ink-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            CPCB Telemetry: {exposure.ambientPM25} μg/m³ ambient PM2.5
          </div>
        </div>

        {/* Primary Dual Impact Grid: Baseline Unprotected vs Active Protected Dose */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
          <div className="bg-ink-900/90 border border-ink-100/[0.07] rounded-lg p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-medium text-ink-400">
                Baseline Unprotected Dose
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-rose-400 bg-rose-400/10 border-rose-400/25">
                Open / No HEPA
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-ink-300 tracking-tight">
                {animatedBaselineDose}
              </span>
              <span className="text-xs text-ink-500 font-mono">μg / day</span>
            </div>
            <p className="text-[10px] text-ink-500 mt-1">
              Natural ventilation infiltration + open roadside transit
            </p>
          </div>

          <div className="bg-ink-900/90 border border-ink-100/[0.07] rounded-lg p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-medium text-ink-400">
                Active Protected Dose
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${exposure.riskBadgeClass}`}>
                {exposure.riskCategory} Burden
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-ink-100 tracking-tight">
                {animatedProtectedDose}
              </span>
              <span className="text-xs text-ink-400 font-mono">μg / day</span>
            </div>
            <p className="text-[10px] text-emerald-400 font-medium mt-1">
              {exposure.totalSavedDoseUg > 0
                ? `Saves ~${exposure.totalSavedDoseUg} μg/day with active shielding`
                : 'Switch commute or toggle HEPA to shield lungs'}
            </p>
          </div>
        </div>

        {/* 2-Part Atmospheric Mitigation Breakdown Bar (Home HEPA vs Commute Shield) */}
        <div className="bg-ink-900/80 border border-ink-100/[0.07] rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-ink-300">
              2-Part Mitigation Shield Breakdown
            </span>
            <span className={`font-mono font-semibold ${exposure.protectionColorClass}`}>
              {animatedMitigationPct}% Total Shield
            </span>
          </div>

          <div className="w-full h-2.5 bg-ink-950 rounded-full overflow-hidden border border-ink-100/[0.08] flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${animatedHomeAirPct}%` }}
              title={`Home Air Protection: ${animatedHomeAirPct}%`}
            />
            <div
              className="h-full bg-sky-400 transition-all duration-300"
              style={{ width: `${animatedCommutePct}%` }}
              title={`Commute Protection: ${animatedCommutePct}%`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-ink-400 pt-0.5 gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-emerald-500 flex-shrink-0" />
              <span>Home HEPA: <strong className="text-emerald-400 font-semibold">{animatedHomeAirPct}%</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-sky-400 flex-shrink-0" />
              <span>Commute Shield: <strong className="text-sky-300 font-semibold">{animatedCommutePct}%</strong></span>
            </span>
            <span className="text-ink-500">
              Unmitigated: {Math.max(0, 100 - animatedMitigationPct)}%
            </span>
          </div>
        </div>

        {/* Berkeley Earth "Cigarette Equivalent" Readout */}
        <div className="bg-ink-900/90 border border-ink-100/[0.07] rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-medium text-ink-200 flex items-center gap-1.5">
                Berkeley Earth Cigarette Equivalent
              </span>
              <p className="text-[10px] text-ink-500">
                24h inhaled PM2.5 ÷ 22 μg/m³ continuous breathing equivalent
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
            <div className="font-mono text-xs font-semibold text-ink-100 flex items-center gap-1.5">
              <span className="text-rose-400/80 line-through text-[11px]">{animatedCigsBefore}</span>
              <span className="text-ink-500">→</span>
              <span className="text-emerald-400 text-sm">{animatedCigsAfter}</span>
              <span className="text-[10px] text-ink-400 font-normal">cigs/day</span>
            </div>
            {exposure.cigsSaved > 0 ? (
              <span className="text-[10px] font-mono text-emerald-400 font-medium">
                (-{exposure.cigsSaved} cigs/day avoided)
              </span>
            ) : (
              <span className="text-[10px] font-mono text-ink-500">
                No active filtration
              </span>
            )}
          </div>
        </div>

        {/* Real-Time Micro-Impact Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-ink-100/[0.05]">
          <div className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
            hasAirPurifier
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
          }`}>
            <Wind className="w-3 h-3 flex-shrink-0" />
            <span>{exposure.purifierEfficiencyText}</span>
          </div>

          <div className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
            activeNormalizedCommute === 'Car with AC' || activeNormalizedCommute === 'Metro' || activeNormalizedCommute === 'Work From Home'
              ? 'bg-sky-500/10 text-sky-300 border-sky-500/25'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
          }`}>
            {activeNormalizedCommute === 'Cycle' ? <Bike className="w-3 h-3 flex-shrink-0" /> :
             activeNormalizedCommute === 'Metro' ? (exposure.hasMetro ? <Train className="w-3 h-3 flex-shrink-0" /> : <Bus className="w-3 h-3 flex-shrink-0" />) :
             activeNormalizedCommute === 'Work From Home' ? <Home className="w-3 h-3 flex-shrink-0" /> :
             activeNormalizedCommute === 'Auto/Open Transit' ? <Bus className="w-3 h-3 flex-shrink-0" /> :
             <Car className="w-3 h-3 flex-shrink-0" />}
            <span>{exposure.commuteEfficiencyText}</span>
          </div>

          {exposure.vulnerabilityLabel && (
            <div className="text-[10px] px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/25 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>Physiological burden: {exposure.vulnerabilityLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
