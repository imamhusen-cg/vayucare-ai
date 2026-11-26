import { Users, TrainFront, Bike, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEMO_PRESETS } from '../constants/presets';

export function PresetBanner() {
  const { loadPreset, profile } = useApp();

  return (
    <div className="h-10 border-b border-ink-100/[0.06] bg-ink-900/40 backdrop-blur-md flex items-center overflow-hidden">
      <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar touch-pan-x">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] sm:text-[11px] font-mono text-ink-500 uppercase tracking-wider flex items-center gap-1.5 mr-0.5 sm:mr-1 flex-shrink-0">
            <SlidersHorizontal className="w-3 h-3 text-accent" />
            <span className="hidden xs:inline">Scenarios:</span>
          </span>
          <div className="flex items-center gap-1.5">
            {DEMO_PRESETS.map(preset => {
              const p = preset.profile;
              const isSelected =
                profile.city === p.city &&
                profile.hasKids === p.hasKids &&
                profile.hasSenior === p.hasSenior &&
                profile.hasRespiratoryIssues === p.hasRespiratoryIssues &&
                profile.commuteMode === p.commuteMode &&
                profile.hasAirPurifier === p.hasAirPurifier;
              const Icon = preset.icon === 'users' ? Users : preset.icon === 'train' ? TrainFront : Bike;

              return (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset.id)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-medium border flex items-center gap-1.5 transition-all flex-shrink-0 touch-manipulation ${
                    isSelected
                      ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-sm'
                      : 'bg-ink-850/60 border-ink-100/[0.06] text-ink-400 hover:text-ink-200 hover:bg-ink-800/60'
                  }`}
                  title={preset.description}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="whitespace-nowrap">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <span className="text-[10px] font-mono text-ink-500 hidden md:inline flex-shrink-0">
          One-click simulation profiles
        </span>
      </div>
    </div>
  );
}
