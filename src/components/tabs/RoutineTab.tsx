import { 
  Sun, Sunset, Moon, Car, Package, AlertTriangle, 
  CheckCircle, Shield, Baby, HeartHandshake, Activity, Sparkles 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TimeWindow } from '../../types';

function getDiurnalBadge(period: 'morning' | 'afternoon' | 'evening', _window: TimeWindow, aqi: number) {
  if (period === 'afternoon') {
    // In Indian urban meteorology, solar heating expands the boundary layer (12 PM – 4 PM),
    // dispersing surface particulate. This is the optimal window for outdoor movement and errands.
    if (aqi <= 100) {
      return {
        text: 'Best Errand Window',
        className: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
        icon: CheckCircle
      };
    } else if (aqi <= 250) {
      return {
        text: 'Best Errand Window',
        className: 'text-sky-300 bg-sky-400/10 border-sky-400/25',
        icon: Sun
      };
    } else {
      return {
        text: 'Safest Movement Hours',
        className: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
        icon: Sun
      };
    }
  }

  if (period === 'morning') {
    if (aqi > 200) {
      return {
        text: 'Thermal Inversion Peak',
        className: 'text-rose-300 bg-rose-400/10 border-rose-400/25',
        icon: AlertTriangle
      };
    } else if (aqi > 100) {
      return {
        text: 'Morning Smog Trapping',
        className: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
        icon: AlertTriangle
      };
    } else {
      return {
        text: 'Light Morning Exertion',
        className: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
        icon: CheckCircle
      };
    }
  }

  // Evening (5:00 PM – 9:00 PM)
  if (aqi > 200) {
    return {
      text: 'Rush Hour Smog Surge',
      className: 'text-rose-300 bg-rose-400/10 border-rose-400/25',
      icon: AlertTriangle
    };
  } else if (aqi > 100) {
    return {
      text: 'Evening Traffic Surge',
      className: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
      icon: AlertTriangle
    };
  } else {
    return {
      text: 'Evening Caution',
      className: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
      icon: CheckCircle
    };
  }
}

function TimeWindowCard({ 
  window, 
  label, 
  icon: Icon, 
  period, 
  aqi 
}: {
  window: TimeWindow;
  label: string;
  icon: React.ElementType;
  period: 'morning' | 'afternoon' | 'evening';
  aqi: number;
}) {
  const badge = getDiurnalBadge(period, window, aqi);
  const BadgeIcon = badge.icon;

  return (
    <div className="surface-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ink-850 border border-ink-100/[0.08] flex items-center justify-center text-ink-300">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-100">{label}</h3>
            <p className="text-xs text-ink-500 font-mono">{window.timeWindow}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {window.maskRequired && (
            <span className="text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" />
              N95 recommended
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${badge.className}`}>
            <BadgeIcon className="w-3 h-3 flex-shrink-0" />
            <span>{badge.text}</span>
          </span>
        </div>
      </div>

      <p className="text-xs text-ink-300 leading-relaxed">{window.recommendation}</p>

      <ul className="space-y-1.5 pt-1 border-t border-ink-100/[0.06]">
        {window.actions.map((action, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-ink-400">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-1.5 flex-shrink-0" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuidanceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-mono text-accent py-1.5 px-3 rounded-lg bg-accent/10 border border-accent/20 w-fit">
        <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
        <span>Synthesizing Diurnal Routine via Gemini...</span>
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="surface-card space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />
          <div className="flex justify-between items-center">
            <div className="h-4 w-36 bg-ink-800 rounded-md animate-pulse" />
            <div className="h-5 w-24 bg-ink-800 rounded-md animate-pulse" />
          </div>
          <div className="h-10 w-full bg-ink-850 rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-ink-900 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function getGuidanceBadgeInfo(source: string | null | undefined): { label: string; isGemini: boolean } {
  if (!source) {
    return { label: 'Local Telemetry Rules • Grounded in CPCB Data', isGemini: false };
  }
  const lower = source.toLowerCase();
  if (
    lower.includes('fallback') ||
    lower.includes('error') ||
    lower.includes('status code') ||
    lower.includes('failed') ||
    lower.includes('local telemetry') ||
    lower.includes('awaiting activation') ||
    lower.includes('rule')
  ) {
    return { label: 'Local Telemetry Rules • Grounded in CPCB Data', isGemini: false };
  }
  return { label: source, isGemini: true };
}

export function RoutineTab() {
  const { guidanceData, isLoadingGuidance, guidanceError, guidanceSource, aqiData } = useApp();

  if (isLoadingGuidance) return <GuidanceSkeleton />;

  if (guidanceError) {
    return (
      <div className="surface-card border-amber-500/20 bg-amber-500/[0.04]">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          <p className="text-xs">{guidanceError}</p>
        </div>
      </div>
    );
  }

  if (!guidanceData) return <GuidanceSkeleton />;

  const r = guidanceData.routinePlanner;
  const aqiNum = aqiData ? Number(aqiData.aqi) : 120;
  const badge = getGuidanceBadgeInfo(guidanceSource);

  return (
    <div className="space-y-4">
      {/* Telemetry Grounding Header */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500 bg-ink-900/60 border border-ink-100/[0.06] px-3 py-1.5 rounded-lg">
        <span className={`w-1.5 h-1.5 rounded-full ${badge.isGemini ? 'bg-accent' : 'bg-emerald-400'}`} />
        <span>Guidance engine: <strong className="text-ink-200 font-medium">{badge.label}</strong></span>
        {badge.isGemini && (
          <span className="hidden sm:inline text-ink-500">• Grounded in active CPCB telemetry</span>
        )}
      </div>

      {/* Summary Alert */}
      <div className={`p-4 rounded-xl border ${
        guidanceData.summary.alertLevel === 'good' ? 'bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-300' :
        guidanceData.summary.alertLevel === 'satisfactory' ? 'bg-lime-500/[0.04] border-lime-500/20 text-lime-300' :
        guidanceData.summary.alertLevel === 'moderate' ? 'bg-amber-500/[0.04] border-amber-500/20 text-amber-300' :
        guidanceData.summary.alertLevel === 'poor' ? 'bg-orange-500/[0.04] border-orange-500/20 text-orange-300' :
        'bg-rose-500/[0.04] border-rose-500/20 text-rose-300'
      }`}>
        <p className="text-sm font-medium text-ink-100">{guidanceData.summary.headline}</p>
        <p className="text-xs text-ink-400 mt-1">{guidanceData.summary.mainRisk}</p>
      </div>

      {/* Dynamic Diurnal Time Windows */}
      <TimeWindowCard window={r.morning} label="Morning" icon={Sun} period="morning" aqi={aqiNum} />
      <TimeWindowCard window={r.afternoon} label="Afternoon" icon={Sunset} period="afternoon" aqi={aqiNum} />
      <TimeWindowCard window={r.evening} label="Evening" icon={Moon} period="evening" aqi={aqiNum} />

      {/* Commute & Errand Cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="surface-card space-y-2">
          <h3 className="text-xs font-medium text-ink-200 flex items-center gap-2">
            <Car className="w-3.5 h-3.5 text-accent" />
            Commute guidance
          </h3>
          <p className="text-xs text-ink-400 leading-relaxed">{r.commuteAdvice}</p>
        </div>
        <div className="surface-card space-y-2">
          <h3 className="text-xs font-medium text-ink-200 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-accent" />
            Errand scheduling
          </h3>
          <p className="text-xs text-ink-400 leading-relaxed">{r.errandBundling}</p>
        </div>
      </div>

      {/* Vulnerable Group Alerts */}
      {Object.entries(guidanceData.vulnerableGroupAlerts).some(([, v]) => v) && (
        <div className="surface-card border-amber-500/20 bg-amber-500/[0.03] space-y-3">
          <h3 className="text-xs font-medium text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            Targeted safeguards for sensitive individuals
          </h3>
          <div className="space-y-2 text-xs text-ink-300">
            {guidanceData.vulnerableGroupAlerts.children && (
              <div className="flex items-start gap-2">
                <Baby className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p><strong className="text-ink-200 font-medium">Children:</strong> {guidanceData.vulnerableGroupAlerts.children}</p>
              </div>
            )}
            {guidanceData.vulnerableGroupAlerts.seniors && (
              <div className="flex items-start gap-2">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p><strong className="text-ink-200 font-medium">Seniors:</strong> {guidanceData.vulnerableGroupAlerts.seniors}</p>
              </div>
            )}
            {guidanceData.vulnerableGroupAlerts.respiratory && (
              <div className="flex items-start gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p><strong className="text-ink-200 font-medium">Respiratory:</strong> {guidanceData.vulnerableGroupAlerts.respiratory}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
