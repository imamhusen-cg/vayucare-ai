import { Wind, RefreshCw, LocateFixed, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function Header() {
  const { refreshAQI, isLoadingAQI, profile, selectCurrentLocation, isLocating } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-ink-950/85 backdrop-blur-md border-b border-ink-100/[0.08] h-14">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-full flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-ink-850 border border-ink-100/[0.08] flex items-center justify-center text-accent shadow-sm flex-shrink-0">
            <Wind className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm font-semibold text-ink-100 tracking-tight">VayuCare</span>
              <span className="text-[9px] sm:text-[10px] font-mono text-ink-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-ink-850/80 border border-ink-100/[0.06]">
                CPCB Feed
              </span>
            </div>
            <p className="text-xs text-ink-500 hidden md:block">Atmospheric health intelligence</p>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {/* Top Navbar GPS Current Location Button */}
          <button
            type="button"
            onClick={selectCurrentLocation}
            disabled={isLocating || isLoadingAQI}
            title="Detect nearest CPCB station via device GPS"
            aria-label="Detect nearest CPCB station via device GPS"
            className="btn-secondary text-xs py-1.5 px-2 sm:px-2.5 flex items-center gap-1.5 text-accent hover:text-white flex-shrink-0 min-h-[36px] touch-manipulation"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Current location'}</span>
          </button>

          {/* Top Navbar Active City Badge */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs text-ink-200 bg-ink-900 border border-ink-100/[0.08] px-2 sm:px-2.5 py-1.5 rounded-lg font-mono min-w-0 flex-shrink min-h-[36px]">
            <MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[160px] font-medium">{profile.city}</span>
          </div>

          {/* Sync Button */}
          <button
            onClick={refreshAQI}
            disabled={isLoadingAQI}
            aria-label="Refresh telemetry data"
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-2.5 sm:px-3 flex-shrink-0 min-h-[36px] touch-manipulation"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-ink-400 ${isLoadingAQI ? 'animate-spin text-accent' : ''}`} />
            <span className="hidden xs:inline">{isLoadingAQI ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
