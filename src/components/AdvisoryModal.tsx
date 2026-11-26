import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Copy, Check, Share2, Users, Home, GraduationCap,
  RefreshCw, MessageCircle, FileText, CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateAdvisory } from '../services/geminiService';
import { getCPCBScaleCategory } from '../utils/aqi';
import {
  buildFallbackAdvisory,
  type AdvisoryAudience,
  type AdvisoryLanguage,
} from '../utils/advisories';

interface AdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type { AdvisoryAudience, AdvisoryLanguage };

function formatInlineWhatsApp(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <strong key={i} className="font-semibold text-ink-100">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return part;
  });
}

function renderWhatsAppPreview(text: string) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-2 font-sans text-xs sm:text-[13px] leading-relaxed text-ink-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        const isHeader = trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.slice(1, -1).includes('*');
        if (isHeader) {
          return (
            <div
              key={idx}
              className="font-semibold text-accent text-xs sm:text-sm tracking-tight pt-1 pb-0.5 border-b border-ink-100/[0.06] first:pt-0"
            >
              {trimmed.slice(1, -1)}
            </div>
          );
        }

        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
        if (isBullet) {
          const content = trimmed.replace(/^[•\-]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5 text-ink-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <div className="flex-1">{formatInlineWhatsApp(content)}</div>
            </div>
          );
        }

        if (trimmed.startsWith('—') || trimmed.startsWith('--')) {
          return (
            <div key={idx} className="text-[11px] text-ink-400 italic pt-2 border-t border-ink-100/[0.08]">
              {formatInlineWhatsApp(trimmed)}
            </div>
          );
        }

        return (
          <div key={idx} className="text-ink-200">
            {formatInlineWhatsApp(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

export function AdvisoryModal({ isOpen, onClose }: AdvisoryModalProps) {
  const { profile, aqiData } = useApp();
  const [advisoryText, setAdvisoryText] = useState('');
  const [audience, setAudience] = useState<AdvisoryAudience>('rwa');
  const [language, setLanguage] = useState<AdvisoryLanguage>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);

  const lastLoadedCityRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGenerate = useCallback(async (
    targetAudience: AdvisoryAudience,
    targetLang: AdvisoryLanguage
  ) => {
    if (!aqiData) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const reqId = ++requestIdRef.current;

    setIsLoading(true);
    try {
      const customProfile = { ...profile, targetAudience };
      const bulletin = await generateAdvisory(customProfile, aqiData, targetAudience, targetLang, controller.signal);
      if (reqId === requestIdRef.current) {
        setAdvisoryText(bulletin);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (reqId === requestIdRef.current) {
        setAdvisoryText(buildFallbackAdvisory(aqiData, targetAudience, targetLang));
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [aqiData, profile]);

  useEffect(() => {
    if (isOpen && aqiData) {
      const cityKey = `${aqiData.city}-${aqiData.aqi}`;
      if (!advisoryText || lastLoadedCityRef.current !== cityKey) {
        lastLoadedCityRef.current = cityKey;
        handleGenerate(audience, language);
      }
    }
  }, [isOpen, aqiData, advisoryText, audience, language, handleGenerate]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    if (!advisoryText) return;
    navigator.clipboard.writeText(advisoryText);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    if (!advisoryText) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(advisoryText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const onAudienceSelect = (target: AdvisoryAudience) => {
    setAudience(target);
    handleGenerate(target, language);
  };

  const onLanguageSelect = (target: AdvisoryLanguage) => {
    setLanguage(target);
    handleGenerate(audience, target);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-950/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Community Advisory">
      <div className="relative w-full sm:max-w-lg bg-ink-900 border-t sm:border border-ink-100/[0.1] rounded-t-2xl sm:rounded-2xl shadow-panel overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[92vh]">
        {/* Mobile Drag Indicator Bar */}
        <div className="sm:hidden pt-2.5 pb-1 bg-ink-950/80 flex justify-center flex-shrink-0">
          <div className="w-10 h-1 bg-ink-600/70 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-ink-100/[0.08] flex items-center justify-between bg-ink-950/70 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-ink-100 truncate">
                  Community Advisory
                </h3>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 font-medium whitespace-nowrap">
                  WhatsApp Ready
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-ink-500 font-mono truncate">
                {aqiData?.city} • AQI {aqiData?.aqi} ({aqiData ? getCPCBScaleCategory(aqiData.aqi) : 'CPCB'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <div className="inline-flex rounded-lg bg-ink-850 p-0.5 border border-ink-100/[0.08] text-xs font-medium">
              <button
                type="button"
                onClick={() => onLanguageSelect('en')}
                disabled={isLoading}
                className={`px-2 py-1 rounded-md text-[11px] transition-colors touch-manipulation ${
                  language === 'en'
                    ? 'bg-accent text-ink-950 font-semibold shadow-sm'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onLanguageSelect('hi')}
                disabled={isLoading}
                className={`px-2 py-1 rounded-md text-[11px] transition-colors touch-manipulation ${
                  language === 'hi'
                    ? 'bg-accent text-ink-950 font-semibold shadow-sm'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                हिन्दी
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-400 hover:text-ink-100 rounded-lg hover:bg-ink-800 transition-colors touch-manipulation"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain space-y-3.5 sm:space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-300 block mb-2">
              Select target community audience:
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {[
                { id: 'rwa' as const, label: 'Neighborhood RWA', shortLabel: 'RWA', sub: 'Society & guards', icon: Home },
                { id: 'family' as const, label: 'Household & elders', shortLabel: 'Family', sub: 'Senior safeguards', icon: Users },
                { id: 'school' as const, label: 'School & parents', shortLabel: 'School', sub: 'Bus commutes & PT', icon: GraduationCap },
              ].map(item => {
                const Icon = item.icon;
                const isSelected = audience === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onAudienceSelect(item.id)}
                    disabled={isLoading}
                    className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-xs font-medium transition-all touch-manipulation min-h-[58px] ${
                      isSelected
                        ? 'bg-ink-800 border-accent/40 text-ink-100 shadow-panel ring-1 ring-accent/30'
                        : 'bg-ink-850/60 border-ink-100/[0.06] text-ink-400 hover:border-ink-100/[0.12] hover:text-ink-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mb-1 ${isSelected ? 'text-accent' : 'text-ink-400'}`} />
                    <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight">
                      <span className="hidden xs:inline">{item.label}</span>
                      <span className="xs:hidden">{item.shortLabel}</span>
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-ink-500 font-mono mt-0.5 hidden xs:inline">{item.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                WhatsApp Message Preview
              </span>
              <button
                type="button"
                onClick={() => setShowRawMarkdown(!showRawMarkdown)}
                className="text-[10px] font-mono text-ink-400 hover:text-ink-200 flex items-center gap-1 transition-colors"
              >
                {showRawMarkdown ? <CheckCircle2 className="w-3 h-3 text-accent" /> : <FileText className="w-3 h-3" />}
                {showRawMarkdown ? 'Formatted preview' : 'View raw markdown'}
              </button>
            </div>

            <div className="bg-ink-950/90 border border-ink-100/[0.09] rounded-xl p-4 shadow-subtle min-h-[180px] max-h-72 overflow-y-auto">
              {isLoading ? (
                <div className="py-10 flex flex-col items-center justify-center text-ink-400 space-y-3">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-ink-300 font-mono">
                    Generating {audience.toUpperCase()} bulletin in {language === 'hi' ? 'Hindi' : 'English'}...
                  </p>
                </div>
              ) : showRawMarkdown ? (
                <div className="font-mono text-xs text-ink-300 whitespace-pre-wrap leading-relaxed select-all">
                  {advisoryText}
                </div>
              ) : (
                <div className="bg-[#0b141a]/60 border border-[#25d366]/20 rounded-lg p-3.5 shadow-inner">
                  {renderWhatsAppPreview(advisoryText)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-t border-ink-100/[0.08] bg-ink-950/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleGenerate(audience, language)}
            disabled={isLoading}
            className="w-full sm:w-auto btn-secondary text-xs flex items-center justify-center gap-1.5 min-h-[40px] touch-manipulation"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-ink-400 ${isLoading ? 'animate-spin' : ''}`} />
            {advisoryText ? 'Refresh bulletin' : 'Generate bulletin'}
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={copyToClipboard}
              disabled={isLoading || !advisoryText}
              className="flex-1 sm:flex-none btn-secondary text-xs flex items-center justify-center gap-1.5 min-h-[40px] touch-manipulation"
              title="Copy WhatsApp text with *bold* markdown intact"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={shareViaWhatsApp}
              disabled={isLoading || !advisoryText}
              className="flex-1 sm:flex-none btn-primary text-xs flex items-center justify-center gap-1.5 min-h-[40px] touch-manipulation"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
