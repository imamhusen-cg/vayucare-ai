import { useState } from 'react';
import { AlertTriangle, Database, MapPin, Clock, Info, Activity, Radio } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  getAQIColor, 
  getAQIBadgeClass, 
  getCPCBScaleCategory, 
  formatPollutant, 
  formatTimestamp, 
  formatTimeAgo, 
  getWHOMultiplier,
  getAQIAmbientGlowColor
} from '../utils/aqi';
import { DiurnalAQIChart } from './DiurnalAQIChart';
import { NearbyStationsView } from './NearbyStationsView';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

function AQISkeleton() {
  return (
    <div className="surface-card space-y-4 animate-pulse">
      <div className="flex justify-between items-center pb-3 border-b border-ink-100/[0.06]">
        <div className="h-4 w-32 bg-ink-800 rounded" />
        <div className="h-4 w-24 bg-ink-800 rounded" />
      </div>
      <div className="h-16 w-48 bg-ink-800 rounded" />
      <div className="h-4 w-full bg-ink-800 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-ink-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

const CPCB_TICKS = [
  { val: 0, pct: 0 },
  { val: 50, pct: 10 },
  { val: 100, pct: 20 },
  { val: 200, pct: 40 },
  { val: 300, pct: 60 },
  { val: 400, pct: 80 },
  { val: 500, pct: 100 },
];

export function AQIDashboard() {
  const { aqiData, isLoadingAQI, aqiError, refreshAQI } = useApp();
  const [heroView, setHeroView] = useState<'telemetry' | 'nearby'>('telemetry');

  // Rules of Hooks: Unconditionally declare hook at top level before any early returns
  const aqi = aqiData ? aqiData.aqi : 0;
  const animatedAQI = useAnimatedNumber(aqi, 350, 0);

  if (isLoadingAQI && !aqiData) return <AQISkeleton />;

  if (aqiError && !aqiData) {
    return (
      <div className="surface-card border-red-500/20 bg-red-500/[0.04]">
        <div className="flex items-start gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink-100">Unable to load air quality telemetry</p>
            <p className="text-xs text-ink-400">{aqiError}</p>
          </div>
        </div>
        <button
          onClick={refreshAQI}
          className="mt-4 btn-secondary text-xs"
        >
          Retry connection
        </button>
      </div>
    );
  }

  if (!aqiData) return <AQISkeleton />;

  const whoMult = getWHOMultiplier(aqiData.pm25);
  const recordedTime = aqiData.stationRecordedAt || aqiData.lastUpdated;
  const ageHours = (Date.now() - new Date(recordedTime).getTime()) / 3600000;
  const isStaleReading = Number.isFinite(ageHours) && ageHours >= 3;
  const cpcbCategory = getCPCBScaleCategory(aqi);
  const clampedPercent = Math.min(Math.max((aqi / 500) * 100, 1.5), 98.5);
  const ambientGlow = getAQIAmbientGlowColor(aqi);

  return (
    <div className="relative group">
      {/* Soft atmospheric radial glow keyed to active CPCB hazard category */}
      <div 
        className="absolute -inset-3 sm:-inset-5 rounded-3xl opacity-75 blur-3xl pointer-events-none transition-all duration-700 ease-out"
        style={{ background: ambientGlow.gradient }}
      />

      <div className="relative z-10 surface-card space-y-5">
        {/* Inline Refresh Failure Banner while Cached Data remains visible */}
        {aqiError && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-400/25 text-red-200 text-xs"
          >
            <span>{aqiError}</span>
            <button
              type="button"
              onClick={refreshAQI}
              className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-100 font-medium flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Prominent Demo / Fallback Disclosure Banner */}
        {(aqiData.isDemoData || aqiData.status === 'fallback') && (
          <div
            role="status"
            className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-amber-300">Demo / Offline Baseline Mode Active (AQI {aqi}): </strong>
              <span>
                Live WAQI station telemetry is unavailable{aqiData.fallbackReason ? ` (${aqiData.fallbackReason})` : ''}. Displaying simulated CPCB baseline values for demonstration.
              </span>
            </div>
          </div>
        )}

        {/* Telemetry & Spatial View Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-ink-100/[0.06]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium ${
              aqiData.isDemoData
                ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {aqiData.isDemoData ? 'Estimated feed' : 'Live station telemetry'}
            </span>
            <span className="text-xs text-ink-500 flex items-center gap-1">
              <Database className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px] xs:max-w-none">{aqiData.source}</span>
            </span>
          </div>

          {/* Top-Right: Telemetry | Nearby Stations Segmented Toggle & Timestamp */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="inline-flex rounded-lg bg-ink-850 p-0.5 border border-ink-100/[0.08] text-xs font-mono">
              <button
                type="button"
                onClick={() => setHeroView('telemetry')}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] transition-all flex items-center gap-1 sm:gap-1.5 min-h-[32px] touch-manipulation ${
                  heroView === 'telemetry'
                    ? 'bg-ink-700 text-ink-100 font-medium shadow-sm'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>Telemetry</span>
              </button>
              <button
                type="button"
                onClick={() => setHeroView('nearby')}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] transition-all flex items-center gap-1 sm:gap-1.5 min-h-[32px] touch-manipulation ${
                  heroView === 'nearby'
                    ? 'bg-accent text-ink-950 font-semibold shadow-sm'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>Nearby Stations</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-400 font-mono">
              <Clock className={`w-3.5 h-3.5 ${isStaleReading ? 'text-amber-400' : 'text-ink-500'}`} />
              <span>{formatTimestamp(recordedTime)}</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded border ${
                  isStaleReading
                    ? 'text-amber-300 bg-amber-500/15 border-amber-400/30 font-medium'
                    : 'text-ink-400 bg-ink-850 border-ink-100/[0.06]'
                }`}
                title={isStaleReading ? 'Station reading is over 3 hours old' : undefined}
              >
                {aqiData.cachedAt
                  ? `Cached ${formatTimeAgo(aqiData.cachedAt)}${isLoadingAQI ? ' • Refreshing…' : ''}`
                  : isStaleReading
                    ? `Station reading ${Math.floor(ageHours)}h ago (stale)`
                    : `Station ${formatTimeAgo(recordedTime)}`}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher: Telemetry vs Nearby Stations */}
        {heroView === 'nearby' ? (
          <NearbyStationsView
            city={aqiData.city}
            activeStationName={aqiData.stationName}
            activeAQI={aqi}
          />
        ) : (
          <>
            {/* Main AQI Instrument Readout (CPCB IND-AQI Standard) with animated counter */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400 mb-2">
                <MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <span className="truncate">{aqiData.stationName}</span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
                <span className={`text-4xl xs:text-5xl font-semibold tabular-nums tracking-tight ${getAQIColor(aqi)}`}>
                  {animatedAQI}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-medium ${getAQIColor(aqi)}`}>
                      {cpcbCategory}
                    </span>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${getAQIBadgeClass(aqi)}`}>
                      IND-AQI
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">National Air Quality Index (CPCB standard)</p>
                </div>
              </div>

              {whoMult && (
                <p className="text-xs text-ink-400 mt-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>Fine particulate PM2.5 is <strong className="text-rose-300 font-medium">{whoMult}</strong> <span className="text-ink-500 font-mono text-[11px]">(WHO 24h guideline: 15 μg/m³)</span></span>
                </p>
              )}
            </div>

            {/* 6-Segment CPCB Scale Bar & Ticks: 0, 50, 100, 200, 300, 400, 500 */}
            <div className="space-y-1.5 pt-1">
              <div className="relative pt-4 pb-1">
                {/* Needle / Marker */}
                <div
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
                  style={{ left: `${clampedPercent}%` }}
                >
                  <span className="text-[10px] font-mono font-medium text-ink-200 px-1.5 py-0.2 rounded bg-ink-800 border border-ink-100/[0.1] shadow-subtle mb-0.5">
                    {animatedAQI}
                  </span>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-ink-200" />
                </div>

                {/* 6-Segment CPCB Scale Bar */}
                <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-ink-850">
                  <div style={{ width: '10%' }} className="bg-[#4cc38a]" title="Good (0–50)" />
                  <div style={{ width: '10%' }} className="bg-[#84cc16]" title="Satisfactory (51–100)" />
                  <div style={{ width: '20%' }} className="bg-[#eab308]" title="Moderate (101–200)" />
                  <div style={{ width: '20%' }} className="bg-[#f97316]" title="Poor (201–300)" />
                  <div style={{ width: '20%' }} className="bg-[#ef4444]" title="Very Poor (301–400)" />
                  <div style={{ width: '20%' }} className="bg-[#991b1b]" title="Severe (401–500)" />
                </div>
              </div>

              {/* Spectrum Scale Labels: 0, 50, 100, 200, 300, 400, 500 */}
              <div className="relative h-4 text-[10px] font-mono text-ink-500">
                {CPCB_TICKS.map((tick, idx) => {
                  let alignClass = '-translate-x-1/2';
                  if (idx === 0) alignClass = 'translate-x-0';
                  if (idx === CPCB_TICKS.length - 1) alignClass = '-translate-x-full';
                  return (
                    <span
                      key={tick.val}
                      className={`absolute top-0 ${alignClass}`}
                      style={{ left: `${tick.pct}%` }}
                    >
                      {tick.val}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Pollutant Breakdown Grid: 2x2 on phones, 4-column on tablet and desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-2 border-t border-ink-100/[0.06]">
              {[
                { label: 'PM2.5 (Fine)', value: formatPollutant(aqiData.pm25), sub: aqiData.pm25Estimated ? 'Est. from AQI' : 'Measured station', isEstimated: Boolean(aqiData.pm25Estimated), isDominant: aqiData.dominentPol === 'pm25' },
                { label: 'PM10 (Coarse)', value: formatPollutant(aqiData.pm10), sub: aqiData.pm10Estimated ? 'Est. from AQI' : 'Measured station', isEstimated: Boolean(aqiData.pm10Estimated), isDominant: aqiData.dominentPol === 'pm10' },
                { label: 'NO₂ (Nitrogen)', value: formatPollutant(aqiData.no2), sub: 'Vehicular emissions', isEstimated: false, isDominant: aqiData.dominentPol === 'no2' },
                { label: 'O₃ (Ozone)', value: formatPollutant(aqiData.o3), sub: 'Photochemical smog', isEstimated: false, isDominant: aqiData.dominentPol === 'o3' },
              ].map(pol => (
                <div
                  key={pol.label}
                  className={`surface-subcard p-2.5 sm:p-3 transition-colors ${
                    pol.isDominant ? 'border-accent/30 bg-ink-800/80' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <span className="text-[11px] text-ink-300 font-medium truncate">{pol.label}</span>
                    {pol.isDominant && (
                      <span className="text-[9px] font-mono text-accent uppercase tracking-wider px-1 py-0.2 rounded bg-accent/10 border border-accent/20 flex-shrink-0">
                        Lead
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base font-semibold tabular-nums text-ink-100 font-mono">
                    {pol.value}
                  </p>
                  <p className={`text-[10px] mt-0.5 truncate ${pol.isEstimated ? 'text-amber-400/90 font-medium' : 'text-ink-400'}`}>
                    {pol.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* 24-Hour Diurnal Inversion & Safe Window Analysis with Interactive Hover Tooltip */}
            <DiurnalAQIChart currentAQI={aqi} />

            {/* Telemetry Cycle Note */}
            <div className="flex items-center gap-1.5 text-[11px] text-ink-500 pt-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-ink-500" />
              <span>CPCB broadcast cycle: sensors stream hourly averages. VayuCare syncs the latest available station packet.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
