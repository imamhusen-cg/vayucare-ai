import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { PresetBanner } from './components/PresetBanner';
import { AQIDashboard } from './components/AQIDashboard';
import { ProfileBar } from './components/ProfileBar';
import { TabNav } from './components/tabs/TabNav';
import { RoutineTab } from './components/tabs/RoutineTab';
import { IndoorTab } from './components/tabs/IndoorTab';
import { SustainableTab } from './components/tabs/SustainableTab';
import { ChatDrawer } from './components/ChatDrawer';
import { MessageSquare } from 'lucide-react';

function AppContent() {
  const { activeTab, chatOpen, setChatOpen, aqiData } = useApp();

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 flex flex-col selection:bg-accent/20 selection:text-ink-100 overflow-x-hidden w-full">
      {/* Top Header */}
      <Header />

      {/* Preset Profiles Bar */}
      <PresetBanner />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 overflow-x-hidden">
        {/* Real-time AQI and Profile Bar: Single-column on mobile (<768px), 2-col Bento on desktop (>=1024px) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          <AQIDashboard />
          <ProfileBar />
        </div>

        {/* 3 Action Tabs Section */}
        <section aria-label="Actionable Air Quality Recommendations" className="space-y-4">
          <TabNav />
          <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="focus:outline-none">
            {activeTab === 'routine' && <RoutineTab />}
            {activeTab === 'indoor' && <IndoorTab />}
            {activeTab === 'sustainable' && <SustainableTab />}
          </div>
        </section>
      </main>

      {/* Atmospheric Floating Copilot Trigger Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 bg-ink-900/95 hover:bg-ink-850 text-ink-100 backdrop-blur-md rounded-full py-2 sm:py-2.5 px-3.5 sm:px-4 border border-accent/30 hover:border-accent/60 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.6),0_0_16px_rgba(56,189,248,0.18)] hover:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.7),0_0_24px_rgba(56,189,248,0.35)] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent flex items-center gap-2 group min-h-[44px] touch-manipulation"
        aria-label={chatOpen ? "Close copilot" : "Open copilot"}
        aria-expanded={chatOpen}
      >
        <div className="relative flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-accent transition-transform duration-200 group-hover:scale-110" />
          {aqiData && !chatOpen && (
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-ink-900 ${
                aqiData.aqi > 200 ? 'bg-rose-500' : aqiData.aqi > 100 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              title={`Current AQI: ${aqiData.aqi}`}
            />
          )}
        </div>
        <span className="text-xs font-medium text-ink-200 group-hover:text-ink-100">
          Copilot
        </span>
      </button>

      {/* Context-aware Chat Drawer */}
      <ChatDrawer />

      {/* Quiet Footer */}
      <footer className="border-t border-ink-100/[0.08] bg-ink-950 py-6 text-xs text-ink-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
            <strong className="text-ink-400 font-normal">VayuCare</strong> — Urban atmospheric health intelligence
          </p>
          <p className="font-mono text-[11px] text-ink-500">
            CPCB sensor telemetry & Google Gemini
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
