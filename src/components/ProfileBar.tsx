import { useMemo } from 'react';
import {
  Users, Car, Baby, HeartHandshake, Activity, Wind,
  Check, Bike, Bus, Train, Home
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isMetroCity } from '../utils/aqi';
import { calculateExposureMetrics, normalizeCommuteMode } from '../utils/exposure';
import { StationSearch } from './StationSearch';
import { ExposureSummaryCard } from './ExposureSummaryCard';
import type { UserProfile, CommuteMode } from '../types';
import type { LucideIcon } from 'lucide-react';

const HOUSEHOLD_RISK_ITEMS = [
  { key: 'hasKids' as const, label: 'Children', desc: 'Higher lung intake (+25%)', icon: Baby },
  { key: 'hasSenior' as const, label: 'Seniors', desc: 'Cardiovascular risk (+15%)', icon: HeartHandshake },
  { key: 'hasRespiratoryIssues' as const, label: 'Asthma / COPD', desc: 'Airway sensitivity (+30%)', icon: Activity },
  { key: 'hasAirPurifier' as const, label: 'Air purifier', desc: 'HEPA filtration (-82%)', icon: Wind },
];

export function ProfileBar() {
  const { profile, setProfile, selectStation, aqiData } = useApp();

  const hasMetro = isMetroCity(profile.city);
  const exposure = useMemo(() => calculateExposureMetrics(profile, aqiData), [profile, aqiData]);
  const activeNormalizedCommute = normalizeCommuteMode(profile.commuteMode);

  const commuteOptions: { mode: CommuteMode; label: string; icon: LucideIcon; shortDesc: string }[] = useMemo(() => [
    { mode: 'Cycle', label: 'Cycle', icon: Bike, shortDesc: 'High exertion' },
    { mode: 'Auto/Open Transit', label: 'Auto / Open', icon: Bus, shortDesc: 'Roadside air' },
    { mode: 'Car with AC', label: 'Car with AC', icon: Car, shortDesc: 'Cabin filter' },
    { mode: 'Metro', label: hasMetro ? 'Metro' : 'AC City Bus', icon: hasMetro ? Train : Bus, shortDesc: hasMetro ? 'Sealed rail' : 'Enclosed bus' },
    { mode: 'Work From Home', label: 'WFH', icon: Home, shortDesc: 'Zero transit' },
  ], [hasMetro]);

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile({ ...profile, [key]: value });
  };

  return (
    <div className="surface-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-ink-100/[0.06]">
        <h2 className="text-sm font-medium text-ink-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-ink-400" />
          Location & household profile
        </h2>
        <span className="text-[11px] font-mono text-ink-500 hidden sm:inline">
          Exposure parameters & risk factors
        </span>
      </div>

      {/* Primary Indian City & Locality Search Bar */}
      <StationSearch
        activeCity={profile.city}
        onSelectCity={city => update('city', city)}
        onSelectStation={selectStation}
      />

      {/* Daily Commute Mode Selector */}
      <div className="pt-2 border-t border-ink-100/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-ink-300 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-ink-400" /> Daily commute mode
          </label>
          <span className="text-[10px] font-mono text-ink-500">
            Affects roadside PM2.5 inhalation
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {commuteOptions.map(opt => {
            const isSelected = activeNormalizedCommute === opt.mode || profile.commuteMode === opt.mode;
            const Icon = opt.icon;
            const isFullWidthMobile = opt.mode === 'Work From Home';
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => update('commuteMode', opt.mode)}
                aria-pressed={isSelected}
                className={`p-2.5 rounded-xl border text-left transition-all min-h-[58px] touch-manipulation ${
                  isFullWidthMobile ? 'col-span-2 sm:col-span-1' : ''
                } ${
                  isSelected
                    ? 'bg-accent/[0.1] border-accent/70 shadow-[0_2px_12px_-1px_rgba(56,189,248,0.22)] text-ink-100'
                    : 'bg-ink-850/60 border-ink-100/[0.06] text-ink-400 hover:text-ink-200 hover:bg-ink-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-accent' : 'text-ink-500'}`} />
                    <span className={`text-xs font-medium truncate ${isSelected ? 'text-accent' : 'text-ink-200'}`}>
                      {opt.label}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-3.5 h-3.5 rounded-full bg-accent text-ink-950 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-ink-500 truncate">{opt.shortDesc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Household Risk Factors & Equipment */}
      <div className="pt-2 border-t border-ink-100/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-ink-400">
            Household profile and air equipment:
          </span>
          <span className="text-[10px] font-mono text-ink-500">
            Toggles HEPA & vulnerability multipliers
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {HOUSEHOLD_RISK_ITEMS.map(item => {
            const isActive = profile[item.key];
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => update(item.key, !isActive)}
                aria-pressed={isActive}
                className={`relative p-2.5 sm:p-3 rounded-xl text-left border transition-all min-h-[64px] touch-manipulation ${
                  isActive
                    ? 'bg-accent/[0.08] border-accent/60 shadow-[0_2px_12px_-1px_rgba(56,189,248,0.16)] text-ink-100'
                    : 'bg-ink-850/60 border-ink-100/[0.06] text-ink-400 hover:border-ink-100/[0.14] hover:bg-ink-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-ink-500'}`} />
                    <span className={`text-xs font-medium truncate ${isActive ? 'text-accent' : 'text-ink-300'}`}>
                      {item.label}
                    </span>
                  </div>

                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isActive
                        ? 'bg-accent text-ink-950 shadow-sm'
                        : 'border border-ink-100/[0.12] bg-ink-900/60'
                    }`}
                  >
                    {isActive ? (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-ink-600" />
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-ink-500 leading-tight">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Isolated Animated 24-Hour Exposure & Commute Impact Summary Bar */}
      <ExposureSummaryCard
        exposure={exposure}
        hasAirPurifier={profile.hasAirPurifier}
        activeNormalizedCommute={activeNormalizedCommute}
      />
    </div>
  );
}
