import { Calendar, Home, Leaf } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const TABS = [
  { id: 'routine' as const, label: 'Daily routine & commute', icon: Calendar, shortLabel: 'Routine' },
  { id: 'indoor' as const, label: 'Indoor air management', icon: Home, shortLabel: 'Indoor AQ' },
  { id: 'sustainable' as const, label: 'Sustainable alternatives', icon: Leaf, shortLabel: 'Sustainable' },
];

export function TabNav() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="flex gap-1 sm:gap-1.5 bg-ink-900 border border-ink-100/[0.08] rounded-xl p-1 overflow-x-auto no-scrollbar touch-pan-x" role="tablist">
      {TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs font-medium transition-colors touch-manipulation min-h-[42px] ${
              isActive
                ? 'bg-ink-800 text-ink-100 border border-ink-100/[0.1] shadow-subtle'
                : 'text-ink-400 hover:text-ink-200 hover:bg-ink-850/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden md:inline truncate">{tab.label}</span>
            <span className="md:hidden truncate">{tab.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
