import { useState, useEffect, useRef } from 'react';
import { 
  Users, Car, Search, X, Loader2, Navigation, 
  Baby, HeartHandshake, Activity, Wind,
  Check, ShieldCheck, Bike, Bus, Train, Home,
  AlertTriangle, Flame
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { searchStations } from '../services/aqiService';
import { getAQIBadgeClass, isMetroCity } from '../utils/aqi';
import { calculateExposureMetrics, normalizeCommuteMode } from '../utils/exposure';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import type { UserProfile, StationSearchResult, CommuteMode } from '../types';
import type { LucideIcon } from 'lucide-react';

const POPULAR_INDIAN_CITIES = [
  'Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Hyderabad',
  'Chennai', 'Pune', 'Kota', 'Kochi', 'Jaipur', 'Lucknow'
];

export function ProfileBar() {
  const { profile, setProfile, selectStation, selectCurrentLocation, isLocating, isLoadingAQI, aqiData } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Transit awareness & dynamic 24-hour PM2.5 inhaled dose & protection percentage
  const hasMetro = isMetroCity(profile.city);
  const exposure = calculateExposureMetrics(profile, aqiData);
  const activeNormalizedCommute = normalizeCommuteMode(profile.commuteMode);

  // Micro-interaction: Animated number transitions over 350ms
  const animatedBaselineDose = useAnimatedNumber(exposure.baselineUnprotectedDoseUg, 350, 0);
  const animatedProtectedDose = useAnimatedNumber(exposure.totalProtectedDoseUg, 350, 0);
  const animatedMitigationPct = useAnimatedNumber(exposure.totalMitigationPct, 350, 0);
  const animatedHomeAirPct = useAnimatedNumber(exposure.homeAirProtectionPct, 350, 0);
  const animatedCommutePct = useAnimatedNumber(exposure.commuteProtectionPct, 350, 0);
  const animatedCigsBefore = useAnimatedNumber(exposure.cigsBefore, 350, 1);
  const animatedCigsAfter = useAnimatedNumber(exposure.cigsAfter, 350, 1);

  const commuteOptions: { mode: CommuteMode; label: string; icon: LucideIcon; shortDesc: string }[] = [
    { mode: 'Cycle', label: 'Cycle', icon: Bike, shortDesc: 'High exertion' },
    { mode: 'Auto/Open Transit', label: 'Auto / Open', icon: Bus, shortDesc: 'Roadside air' },
    { mode: 'Car with AC', label: 'Car with AC', icon: Car, shortDesc: 'Cabin filter' },
    { mode: 'Metro', label: hasMetro ? 'Metro' : 'AC City Bus', icon: hasMetro ? Train : Bus, shortDesc: hasMetro ? 'Sealed rail' : 'Enclosed bus' },
    { mode: 'Work From Home', label: 'WFH', icon: Home, shortDesc: 'Zero transit' },
  ];

  // Debounced Indian station search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchStations(searchQuery.trim());
        setSearchResults(results);
        setIsDropdownOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener to dismiss autocomplete
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile({ ...profile, [key]: value });
  };

  const handleSelectStation = async (station: StationSearchResult) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    await selectStation(station.uid, station.city || profile.city);
  };

  const handleQuickCity = (city: string) => {
    setProfile({ ...profile, city });
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
      <div ref={searchContainerRef} className="relative space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="indian-station-search" className="text-xs font-medium text-ink-300 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-ink-400" />
            Search city or monitoring station
          </label>
          <span className="text-[10px] text-ink-500 font-mono">
            CPCB India stations
          </span>
        </div>

        <div className="relative">
          <input
            id="indian-station-search"
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchResults.length > 0) setIsDropdownOpen(true);
            }}
            placeholder="Type city or locality (e.g. Kota, Kochi, Bandra, Dwarka)..."
            className="w-full bg-ink-850 border border-ink-100/[0.08] rounded-xl pl-9 pr-9 py-2 text-base sm:text-xs text-ink-100 placeholder-ink-500 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            autoComplete="off"
          />
          <Search className="w-3.5 h-3.5 text-ink-500 absolute left-3 top-2.5 pointer-events-none" />
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 text-ink-400 absolute right-3 top-2.5 animate-spin" />
          ) : searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setIsDropdownOpen(false);
              }}
              className="absolute right-3 top-2.5 text-ink-500 hover:text-ink-200 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* Autocomplete Results Dropdown */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-ink-900 border border-ink-100/[0.1] rounded-xl shadow-panel z-50 max-h-72 overflow-y-auto divide-y divide-ink-100/[0.06]">
            <div className="px-3.5 py-2 bg-ink-950/80 text-[10px] font-medium text-ink-500 flex items-center justify-between">
              <span>Verified monitoring stations</span>
              <span className="font-mono">{searchResults.length} stations</span>
            </div>
            {searchResults.map((station) => {
              const aqiNum = typeof station.aqi === 'number' ? station.aqi : Number(station.aqi);
              return (
                <button
                  key={station.uid}
                  onClick={() => handleSelectStation(station)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-ink-800 flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-200 group-hover:text-ink-100 truncate flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      {station.name}
                    </p>
                    <p className="text-[10px] text-ink-500 mt-0.5 font-mono">
                      CPCB #{station.uid} {station.time ? `• ${station.time}` : ''}
                    </p>
                  </div>
                  {!isNaN(aqiNum) && aqiNum > 0 ? (
                    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${getAQIBadgeClass(aqiNum)} flex-shrink-0`}>
                      AQI {aqiNum}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-ink-500 bg-ink-850 px-2 py-0.5 rounded border border-ink-100/[0.06] flex-shrink-0">
                      Live sensor
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {isDropdownOpen && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-ink-900 border border-ink-100/[0.08] rounded-xl p-3 text-xs text-ink-400 text-center shadow-panel z-50">
            No matching stations found for "{searchQuery}". Try typing the district or nearby city.
          </div>
        )}

        {/* Quick Indian City Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-ink-500 mr-0.5 sm:mr-1">Quick select:</span>
          {POPULAR_INDIAN_CITIES.map(c => (
            <button
              key={c}
              onClick={() => handleQuickCity(c)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors touch-manipulation min-h-[30px] flex items-center ${
                profile.city.toLowerCase() === c.toLowerCase()
                  ? 'bg-ink-800 border-ink-100/[0.15] text-ink-100 font-medium shadow-subtle'
                  : 'bg-ink-850/60 border-ink-100/[0.06] text-ink-400 hover:text-ink-200 hover:bg-ink-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

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

        {/* 1-Click Interactive Commute Mode Pills: 2x2 grid on small phones (+ 1 full-width 5th item), 3-col on tablet, 5-col on desktop */}
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

      {/* Household Risk Factors & Equipment: 2x2 grid on phones, 4-col on tablet/desktop */}
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
          {[
            { key: 'hasKids' as const, label: 'Children', desc: 'Higher lung intake (+25%)', icon: Baby },
            { key: 'hasSenior' as const, label: 'Seniors', desc: 'Cardiovascular risk (+15%)', icon: HeartHandshake },
            { key: 'hasRespiratoryIssues' as const, label: 'Asthma / COPD', desc: 'Airway sensitivity (+30%)', icon: Activity },
            { key: 'hasAirPurifier' as const, label: 'Air purifier', desc: 'HEPA filtration (-82%)', icon: Wind },
          ].map(item => {
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

                  {/* Clear Active Checkmark Pill or Inactive State Indicator */}
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

      {/* Compact 24-Hour Exposure & Commute Impact Summary Bar */}
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

            {/* Grounded telemetry badge */}
            <div className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-ink-900 border border-ink-100/[0.08] text-ink-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              CPCB Telemetry: {exposure.ambientPM25} μg/m³ ambient PM2.5
            </div>
          </div>

          {/* Primary Dual Impact Grid: Baseline Unprotected vs Active Protected Dose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            {/* Baseline Unprotected Dose */}
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

            {/* Active Protected Dose */}
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
                  : `Switch commute or toggle HEPA to shield lungs`}
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

            {/* 2-Part Stacked Gauge Bar */}
            <div className="w-full h-2.5 bg-ink-950 rounded-full overflow-hidden border border-ink-100/[0.08] flex">
              {/* Home HEPA Segment (Emerald) */}
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${animatedHomeAirPct}%` }}
                title={`Home Air Protection: ${animatedHomeAirPct}%`}
              />
              {/* Commute Shield Segment (Sky) */}
              <div
                className="h-full bg-sky-400 transition-all duration-300"
                style={{ width: `${animatedCommutePct}%` }}
                title={`Commute Protection: ${animatedCommutePct}%`}
              />
            </div>

            {/* Breakdown Legend */}
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
            {/* HEPA Factor */}
            <div className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
              profile.hasAirPurifier
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
            }`}>
              <Wind className="w-3 h-3 flex-shrink-0" />
              <span>{exposure.purifierEfficiencyText}</span>
            </div>

            {/* Commute Mode Factor */}
            <div className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
              activeNormalizedCommute === 'Car with AC' || activeNormalizedCommute === 'Metro' || activeNormalizedCommute === 'Work From Home'
                ? 'bg-sky-500/10 text-sky-300 border-sky-500/25'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
            }`}>
              {activeNormalizedCommute === 'Cycle' ? <Bike className="w-3 h-3 flex-shrink-0" /> :
               activeNormalizedCommute === 'Metro' ? (hasMetro ? <Train className="w-3 h-3 flex-shrink-0" /> : <Bus className="w-3 h-3 flex-shrink-0" />) :
               activeNormalizedCommute === 'Work From Home' ? <Home className="w-3 h-3 flex-shrink-0" /> :
               activeNormalizedCommute === 'Auto/Open Transit' ? <Bus className="w-3 h-3 flex-shrink-0" /> :
               <Car className="w-3 h-3 flex-shrink-0" />}
              <span>{exposure.commuteEfficiencyText}</span>
            </div>

            {/* Vulnerability Alert Factor */}
            {exposure.vulnerabilityLabel && (
              <div className="text-[10px] px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/25 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>Physiological burden: {exposure.vulnerabilityLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
