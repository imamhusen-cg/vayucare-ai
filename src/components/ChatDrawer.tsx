import { useState, useRef, useEffect } from 'react';
import { 
  X, Send, Share2, Copy, Check, Sparkles, 
  Bot, Wind, Compass, HeartPulse, Baby, MapPin, Trash2 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sendChatMessage } from '../services/geminiService';
import { AdvisoryModal } from './AdvisoryModal';
import { getAQIBadgeClass, getCPCBScaleCategory } from '../utils/aqi';
import type { ChatMessage } from '../types';

const SMART_PROMPT_CHIPS = [
  { label: 'Outdoor safety for children', icon: Baby, query: 'Can my kids play outside today given current AQI?' },
  { label: 'Home ventilation hours', icon: Wind, query: 'Best time to open windows and ventilate my home today?' },
  { label: 'Commute exposure reduction', icon: Compass, query: 'How should I modify my commute today to reduce inhaled PM2.5?' },
  { label: 'Vulnerable & elder care', icon: HeartPulse, query: 'What precautions should seniors and respiratory patients take right now?' }
];

function formatInlineCopilotMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-ink-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <strong key={i} className="font-semibold text-ink-100">
          {part.slice(1, -1)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <span key={i} className="font-mono text-[11px] px-1 py-0.5 rounded bg-ink-850 text-accent border border-ink-100/[0.08]">
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

function renderCopilotMessage(text: string) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-2 font-sans text-xs leading-relaxed text-ink-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Detect markdown headings: ### Heading or **Heading:** or 1. **Heading**
        if (trimmed.startsWith('###') || /^(?:\d+\.\s*)?\*\*[^*]+(?::\*\*|\*\*)/.test(trimmed)) {
          const cleanHeading = trimmed.replace(/^###\s*/, '').replace(/^\d+\.\s*/, '');
          return (
            <div key={idx} className="font-semibold text-ink-100 text-xs tracking-tight text-accent pt-1.5 border-t border-ink-100/[0.06] first:border-0 first:pt-0">
              {formatInlineCopilotMarkdown(cleanHeading)}
            </div>
          );
        }

        // Detect bullet points: • point or - point or * point
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[•\-*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
              <div className="flex-1">{formatInlineCopilotMarkdown(content)}</div>
            </div>
          );
        }

        return (
          <div key={idx}>
            {formatInlineCopilotMarkdown(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

export function ChatDrawer() {
  const { chatOpen, setChatOpen, chatMessages, addChatMessage, clearChat, profile, aqiData } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Focus input, lock body scroll, and support Escape dismissal when drawer opens
  useEffect(() => {
    if (!chatOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 150);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAdvisoryModalOpen) {
        setChatOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [chatOpen, isAdvisoryModalOpen, setChatOpen]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || !aqiData || isTyping) return;

    const userMsg: ChatMessage = { 
      id: `user-${Date.now()}`, 
      role: 'user', 
      text, 
      timestamp: new Date() 
    };
    addChatMessage(userMsg);
    setInput('');
    setIsTyping(true);

    try {
      const historyTurns = chatMessages.slice(-4).map((m) => ({ role: m.role, text: m.text }));
      const { reply, followUps } = await sendChatMessage(text, profile, aqiData, undefined, historyTurns);
      if (reply && reply.trim()) {
        const defaultFollowUps = [
          profile.hasKids
            ? `Safest outdoor play hours for kids in ${aqiData.city}?`
            : `How to modify my ${profile.commuteMode} commute today?`,
          profile.hasAirPurifier
            ? `Optimal purifier fan schedule for bedrooms tonight?`
            : `Zero-cost ways to reduce indoor particulate dust?`,
          `Exact hours to open windows in ${aqiData.city} today?`
        ];

        addChatMessage({ 
          id: `ai-${Date.now()}`, 
          role: 'assistant', 
          text: reply.trim(), 
          timestamp: new Date(),
          followUps: followUps && followUps.length > 0 ? followUps : defaultFollowUps
        });
      }
    } catch {
      addChatMessage({ 
        id: `ai-${Date.now()}`, 
        role: 'assistant', 
        text: 'Live connection delayed. Based on your current station reading, remember to wear an N95 mask outdoors and keep bedroom windows sealed during peak traffic hours.', 
        timestamp: new Date(),
        followUps: [
          `When will air quality improve in ${aqiData.city}?`,
          `Best indoor exercises to replace outdoor runs?`,
          `How to check if my N95 mask has a proper airtight seal?`
        ]
      });
    } finally {
      setIsTyping(false);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  };

  const shareMessageOnWhatsApp = (text: string) => {
    const shareText = `*VayuCare Advisory for ${aqiData?.city || 'Our Area'}*\n\n${text}\n\n— via VayuCare Copilot`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!chatOpen) return null;

  const aqiNum = aqiData ? Number(aqiData.aqi) : 0;

  return (
    <>
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm z-40"
        onClick={() => setChatOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over Agent Drawer: Bottom Sheet on Mobile (<sm), Side Drawer on Desktop/Tablet (sm:) */}
      <aside
        className="fixed inset-x-0 bottom-0 top-auto sm:top-0 sm:right-0 sm:left-auto w-full sm:w-[440px] h-[88vh] sm:h-full bg-ink-950 border-t sm:border-t-0 sm:border-l border-ink-100/[0.1] z-50 flex flex-col shadow-panel rounded-t-2xl sm:rounded-none overflow-hidden"
        role="dialog"
        aria-label="VayuCare Copilot"
        aria-modal="true"
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="sm:hidden pt-2.5 pb-1 bg-ink-900/80 flex justify-center flex-shrink-0">
          <div className="w-10 h-1 bg-ink-600/70 rounded-full" />
        </div>

        {/* Top Drawer Header */}
        <div className="px-4 sm:px-5 h-12 sm:h-14 border-b border-ink-100/[0.08] bg-ink-900/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ink-850 border border-ink-100/[0.08] flex items-center justify-center text-accent">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-medium text-ink-100">VayuCare Copilot</h2>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 uppercase tracking-wider px-1.5 py-0.2 rounded font-medium">
                  Live Gemini
                </span>
              </div>
              <p className="text-[11px] text-ink-500 font-mono">
                CPCB sensor telemetry & risk profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {chatMessages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="px-2 py-1 text-[11px] text-ink-400 hover:text-ink-100 hover:bg-ink-850 rounded-lg transition-colors inline-flex items-center gap-1"
                title="Clear chat history"
                aria-label="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Clear chat</span>
              </button>
            )}
            <button
              onClick={() => setIsAdvisoryModalOpen(true)}
              className="p-1.5 text-ink-400 hover:text-ink-100 hover:bg-ink-850 rounded-lg transition-colors"
              title="Generate WhatsApp bulletin"
              aria-label="Generate WhatsApp bulletin"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1.5 text-ink-400 hover:text-ink-100 hover:bg-ink-850 rounded-lg transition-colors"
              aria-label="Close copilot"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact Active Context Pills Strip */}
        {aqiData && (
          <div className="px-4 py-2.5 bg-ink-900/50 border-b border-ink-100/[0.06] flex-shrink-0 space-y-1.5">
            {/* Top row: City/Station + AQI + PM2.5 + Commute */}
            <div className="flex items-center flex-wrap gap-1.5 text-[11px] pb-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-ink-850 border border-ink-100/[0.08] text-ink-200 whitespace-nowrap">
                <MapPin className="w-3 h-3 text-accent flex-shrink-0" />
                <span className="font-medium text-ink-100">{aqiData.city}</span>
                <span className="text-ink-400 truncate max-w-[140px]">• {aqiData.stationName}</span>
              </span>

              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-mono text-[10px] font-medium whitespace-nowrap ${getAQIBadgeClass(aqiNum)}`}>
                AQI {aqiNum} • {getCPCBScaleCategory(aqiNum)}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-ink-850 border border-ink-100/[0.08] text-ink-300 font-mono text-[10px] whitespace-nowrap">
                PM2.5: <strong className="text-ink-100">{aqiData.pm25 ?? '—'}</strong> µg/m³{aqiData.pm25Estimated ? ' (est.)' : ''}
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-ink-850 border border-ink-100/[0.08] text-ink-300 text-[10px] whitespace-nowrap">
                <Compass className="w-3 h-3 text-accent flex-shrink-0" />
                <span>{profile.commuteMode}</span>
              </span>
            </div>

            {/* Bottom row: Active Household Profile Badges */}
            <div className="flex items-center flex-wrap gap-1 text-[10px] font-mono">
              <span className="text-ink-400 uppercase tracking-wider text-[10px] mr-0.5">Profile:</span>
              {profile.hasKids && (
                <span className="px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 whitespace-nowrap">
                  Children (+25% lung factor)
                </span>
              )}
              {profile.hasSenior && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-400/10 text-indigo-300 border border-indigo-400/20 whitespace-nowrap">
                  Seniors
                </span>
              )}
              {profile.hasRespiratoryIssues && (
                <span className="px-1.5 py-0.2 rounded bg-rose-400/10 text-rose-300 border border-rose-400/20 whitespace-nowrap">
                  Asthma/COPD
                </span>
              )}
              {profile.hasAirPurifier ? (
                <span className="px-1.5 py-0.2 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 whitespace-nowrap">
                  HEPA Purifier Active
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded bg-ink-850 text-ink-500 border border-ink-100/[0.06] whitespace-nowrap">
                  No Air Purifier
                </span>
              )}
            </div>
          </div>
        )}

        {/* Messages Stream Container */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Welcome Greeting */}
          {chatMessages.length === 0 && (
            <div className="surface-subcard space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink-200">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Live Atmospheric Intelligence Copilot</span>
              </div>
              <p className="text-xs text-ink-400 leading-relaxed">
                Ask about air quality mitigation, home ventilation hours, child and senior safeguards, or route modifications for{' '}
                <strong className="text-ink-200 font-medium">{aqiData?.city || 'your area'}</strong>.
              </p>

              {/* Instant Suggestions */}
              <div className="pt-2 border-t border-ink-100/[0.06] space-y-1.5">
                <span className="text-[10px] text-ink-500 font-mono block">
                  Suggested inquiries:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {SMART_PROMPT_CHIPS.map(chip => {
                    const Icon = chip.icon;
                    return (
                      <button
                        key={chip.label}
                        onClick={() => sendMessage(chip.query)}
                        disabled={isTyping || !aqiData}
                        className="text-left px-3 py-2 rounded-lg bg-ink-800 hover:bg-ink-750 border border-ink-100/[0.06] text-xs text-ink-300 flex items-center justify-between transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-ink-400" />
                          <span>{chip.label}</span>
                        </span>
                        <span className="text-ink-500 group-hover:text-ink-300 text-xs font-mono">→</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Render Conversation Messages */}
          {chatMessages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                {isUser ? (
                  /* User Message: Subtle Cyan-Tinted Bubble */
                  <div className="max-w-[85%] rounded-2xl rounded-br-xs px-4 py-2.5 text-xs bg-accent/12 border border-accent/25 text-ink-100 shadow-sm leading-relaxed">
                    {msg.text}
                  </div>
                ) : (
                  /* AI Message: Clean Structured Markdown Card */
                  <div className="max-w-[94%] rounded-2xl rounded-bl-xs p-3.5 text-xs bg-ink-900/90 backdrop-blur-md border border-ink-100/[0.09] text-ink-100 shadow-panel space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-ink-100/[0.06] text-[11px] text-ink-400">
                      <span className="flex items-center gap-1.5 text-ink-200 font-medium">
                        <Sparkles className="w-3 h-3 text-accent" />
                        VayuCare Copilot
                      </span>
                      <span className="font-mono text-[10px] text-ink-500">
                        {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {renderCopilotMessage(msg.text)}

                    <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-ink-100/[0.06]">
                      <button
                        onClick={() => copyMessage(msg.id, msg.text)}
                        className="text-[10px] font-mono text-ink-400 hover:text-ink-200 px-2 py-0.5 rounded bg-ink-850 hover:bg-ink-800 border border-ink-100/[0.06] flex items-center gap-1 transition-colors"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => shareMessageOnWhatsApp(msg.text)}
                        className="text-[10px] font-mono text-ink-400 hover:text-ink-200 px-2 py-0.5 rounded bg-ink-850 hover:bg-ink-800 border border-ink-100/[0.06] flex items-center gap-1 transition-colors"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="w-3 h-3" />
                        WhatsApp
                      </button>
                    </div>

                    {/* 3 Dynamic One-Click Follow-Up Prompt Chips Tailored to City & Profile */}
                    {msg.followUps && msg.followUps.length > 0 && (
                      <div className="pt-2.5 mt-1 border-t border-ink-100/[0.08] space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-accent">
                          <Sparkles className="w-3 h-3 text-accent" />
                          <span className="uppercase tracking-wider font-semibold">Suggested Inquiries</span>
                          <span className="text-ink-500">• {aqiData?.city}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {msg.followUps.slice(0, 3).map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => sendMessage(chip)}
                              disabled={isTyping}
                              className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-ink-850/80 hover:bg-ink-800 border border-ink-100/[0.08] hover:border-accent/40 text-ink-300 hover:text-ink-100 flex items-center justify-between group transition-all"
                            >
                              <span className="truncate pr-2">{chip}</span>
                              <span className="text-ink-500 group-hover:text-accent font-mono text-[10px] flex-shrink-0">
                                Ask →
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <span className="text-[10px] font-mono text-ink-500 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {/* Smooth Atmospheric Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-ink-900/90 border border-ink-100/[0.08] text-xs text-ink-300 w-fit shadow-subtle backdrop-blur-md">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[11px] text-ink-400 font-mono">
                Synthesizing station telemetry & profile...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Follow-up Chips */}
        {chatMessages.length > 0 && (
          <div className="px-4 py-2 border-t border-ink-100/[0.06] bg-ink-950 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
            {SMART_PROMPT_CHIPS.map(chip => (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.query)}
                disabled={isTyping}
                className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-md bg-ink-900 hover:bg-ink-850 border border-ink-100/[0.06] text-ink-400 hover:text-ink-200 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Input Console */}
        <div className="p-3 sm:p-4 border-t border-ink-100/[0.08] bg-ink-900/60 flex-shrink-0 space-y-2">
          <form
            onSubmit={e => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about exposure, ventilation, or commute..."
              disabled={isTyping || !aqiData}
              className="flex-1 bg-ink-850 border border-ink-100/[0.08] rounded-xl px-3.5 py-2 text-base sm:text-xs text-ink-100 placeholder-ink-500 focus:outline-none focus:ring-1 focus:ring-accent transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping || !aqiData}
              className="btn-primary p-2 rounded-xl disabled:opacity-50 flex-shrink-0 min-h-[38px] min-w-[38px] touch-manipulation flex items-center justify-center"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick WhatsApp Bulletin Button */}
          <button
            onClick={() => setIsAdvisoryModalOpen(true)}
            className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2 min-h-[38px] touch-manipulation"
          >
            <Share2 className="w-3.5 h-3.5 text-ink-400" />
            Format community advisory bulletin
          </button>
        </div>
      </aside>

      {/* Dedicated Community Advisory Modal */}
      <AdvisoryModal
        isOpen={isAdvisoryModalOpen}
        onClose={() => setIsAdvisoryModalOpen(false)}
      />
    </>
  );
}
