import { useState, useMemo, useRef } from 'react';
import { Sun, AlertTriangle, ShieldCheck, Clock, TrendingDown } from 'lucide-react';
import { getCPCBScaleCategory, getAQIColor, getAQIBadgeClass } from '../utils/aqi';

interface DiurnalPoint {
  hour: number;
  timeLabel: string;
  aqi: number;
  category: string;
  isMiddaySafe: boolean;
  isMorningPeak: boolean;
  isEveningPeak: boolean;
}

// Diurnal boundary-layer multipliers reflecting Indian meteorological inversion cycles
const DIURNAL_MULTIPLIERS = [
  1.05, 1.07, 1.10, 1.15, 1.20, 1.26, // 00:00 - 05:00 (Nocturnal inversion & freight corridors)
  1.32, 1.38, 1.35, 1.26, 1.10, 0.90, // 06:00 - 11:00 (Thermal inversion peak & morning rush)
  0.76, 0.68, 0.66, 0.70, 0.78, 0.96, // 12:00 - 17:00 (Midday solar heating & boundary layer expansion)
  1.18, 1.28, 1.24, 1.16, 1.08, 1.04  // 18:00 - 23:00 (Sunset inversion collapse & evening rush)
];

function getDiurnalVerdict(point: DiurnalPoint) {
  const h = point.hour;

  if (point.isMiddaySafe) {
    return {
      badge: 'Midday Safe Window',
      badgeClass: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
      verdict: 'Solar thermal heating expands the boundary layer. Safest window for outdoor errands, light movement & brief ventilation.'
    };
  }

  if (point.isMorningPeak) {
    return {
      badge: 'Morning Inversion Peak',
      badgeClass: 'text-rose-300 bg-rose-400/10 border-rose-400/25',
      verdict: 'Cold ground traps vehicular emissions close to street level. Avoid outdoor cardio/jogging; keep windows sealed.'
    };
  }

  if (point.isEveningPeak) {
    return {
      badge: 'Evening Traffic Surge',
      badgeClass: 'text-orange-300 bg-orange-400/10 border-orange-400/25',
      verdict: 'Atmospheric mixing collapses with evening rush hours. Commute with N95 mask; avoid open two-wheeler routes.'
    };
  }

  if (h >= 22 || h <= 5) {
    return {
      badge: 'Nocturnal Settling',
      badgeClass: 'text-indigo-300 bg-indigo-400/10 border-indigo-400/25',
      verdict: 'Cool overnight air compresses smog near ground. Run bedroom HEPA air purifier on Auto mode with windows shut.'
    };
  }

  return {
    badge: 'Transitional Period',
    badgeClass: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
    verdict: 'Atmospheric particulate levels transitional. Normal light activity permitted; vulnerable family members take precautions.'
  };
}

export function DiurnalAQIChart({ currentAQI }: { currentAQI: number }) {
  const baseAQI = Math.max(20, currentAQI || 150);
  const currentHour = new Date().getHours();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate 24 hourly data points based on current AQI telemetry
  const data: DiurnalPoint[] = useMemo(() => {
    return DIURNAL_MULTIPLIERS.map((mult, h) => {
      const aqi = Math.round(baseAQI * mult);
      const isMiddaySafe = h >= 12 && h <= 16;
      const isMorningPeak = h >= 6 && h <= 9;
      const isEveningPeak = h >= 18 && h <= 21;
      const formattedHour = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;

      return {
        hour: h,
        timeLabel: formattedHour,
        aqi,
        category: getCPCBScaleCategory(aqi),
        isMiddaySafe,
        isMorningPeak,
        isEveningPeak,
      };
    });
  }, [baseAQI]);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 190;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 26;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const minVal = 0;
  const maxVal = Math.max(300, Math.ceil((Math.max(...data.map(d => d.aqi)) * 1.15) / 50) * 50);

  // Compute X and Y coordinates for each hour
  const points = useMemo(() => {
    return data.map((d, i) => {
      const x = padLeft + (i / 23) * chartWidth;
      const y = padTop + (1 - (d.aqi - minVal) / (maxVal - minVal)) * chartHeight;
      return { x, y, ...d };
    });
  }, [data, chartWidth, chartHeight, padLeft, padTop, maxVal]);

  // Generate smooth cubic Bezier spline path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };

    let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const baselineY = (padTop + chartHeight).toFixed(1);
    const area = `${d} L ${points[points.length - 1].x.toFixed(1)},${baselineY} L ${points[0].x.toFixed(1)},${baselineY} Z`;

    return { linePath: d, areaPath: area };
  }, [points, padTop, chartHeight]);

  // Midday safe window boundary coordinates (12 PM to 4 PM, indices 12 to 16)
  const safeWindowX1 = padLeft + (12 / 23) * chartWidth;
  const safeWindowX2 = padLeft + (16 / 23) * chartWidth;
  const safeWindowWidth = safeWindowX2 - safeWindowX1;

  // Active hover point (or defaults to current hour)
  const activeIndex = hoveredIndex !== null ? hoveredIndex : currentHour;
  const activePoint = points[activeIndex] || points[currentHour] || points[12];
  const verdictInfo = getDiurnalVerdict(activePoint);

  // Mouse & Touch interaction handler: supports hover (desktop) & tap/drag (mobile/tablet)
  const updateIndexFromClientX = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    const relX = clientX - rect.left;
    const scale = svgWidth / rect.width;
    const svgX = relX * scale;

    const clampedX = Math.max(padLeft, Math.min(svgWidth - padRight, svgX));
    const normalized = (clampedX - padLeft) / chartWidth;
    const hourIndex = Math.min(23, Math.max(0, Math.round(normalized * 23)));
    setHoveredIndex(hourIndex);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    updateIndexFromClientX(e.clientX, e.currentTarget);
  };

  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches && e.touches.length > 0) {
      updateIndexFromClientX(e.touches[0].clientX, e.currentTarget);
    }
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    updateIndexFromClientX(e.clientX, e.currentTarget);
  };

  const morningPeakVal = points[7]?.aqi || 220;
  const middaySafeVal = points[14]?.aqi || 110;
  const eveningPeakVal = points[19]?.aqi || 210;

  return (
    <div className="surface-subcard space-y-3 pt-3.5" ref={containerRef}>
      {/* Header & Diurnal Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-ink-100/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <TrendingDown className="w-3 h-3" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-ink-100 tracking-tight flex items-center gap-1.5">
              24-Hour Diurnal AQI & Safe Window
            </h3>
            <p className="text-[10px] text-ink-400">
              Hover or tap across hours to preview diurnal inversion & activity verdicts
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-sm bg-emerald-500/80" />
            Midday Safe Window (12–4 PM)
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-sm bg-amber-500/80" />
            Inversion Peak
          </span>
        </div>
      </div>

      {/* SVG Smooth Area Chart with Dynamic Dark Glass Hover & Tap Tooltip */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair select-none overflow-visible touch-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onClick={handleClick}
        >
          <defs>
            {/* Primary Area Fill Gradient */}
            <linearGradient id="diurnalAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>

            {/* Midday Safe Window Highlight Band Gradient */}
            <linearGradient id="safeWindowBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal AQI thresholds) */}
          {[0, Math.round(maxVal / 2), maxVal].map((val, i) => {
            const y = padTop + (1 - val / maxVal) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Midday Safe Window Band (12 PM - 4 PM) */}
          <rect
            x={safeWindowX1}
            y={padTop}
            width={safeWindowWidth}
            height={chartHeight}
            fill="url(#safeWindowBand)"
            className="transition-all"
          />
          <line
            x1={safeWindowX1}
            y1={padTop}
            x2={safeWindowX1}
            y2={padTop + chartHeight}
            stroke="#10b981"
            strokeOpacity="0.4"
            strokeDasharray="2 2"
            strokeWidth="1"
          />
          <line
            x1={safeWindowX2}
            y1={padTop}
            x2={safeWindowX2}
            y2={padTop + chartHeight}
            stroke="#10b981"
            strokeOpacity="0.4"
            strokeDasharray="2 2"
            strokeWidth="1"
          />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#diurnalAreaGradient)" />

          {/* Spline Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Morning Peak Annotation Dot */}
          <circle
            cx={points[7]?.x}
            cy={points[7]?.y}
            r="3.5"
            fill="#f59e0b"
            stroke="#06090F"
            strokeWidth="1.5"
          />

          {/* Midday Safe Trough Annotation Dot */}
          <circle
            cx={points[14]?.x}
            cy={points[14]?.y}
            r="3.5"
            fill="#10b981"
            stroke="#06090F"
            strokeWidth="1.5"
          />

          {/* Current Local Hour Line & Marker */}
          {points[currentHour] && (
            <g>
              <line
                x1={points[currentHour].x}
                y1={padTop}
                x2={points[currentHour].x}
                y2={padTop + chartHeight}
                stroke="rgba(255, 255, 255, 0.35)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle
                cx={points[currentHour].x}
                cy={points[currentHour].y}
                r="4"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="animate-pulse"
              />
            </g>
          )}

          {/* Active Hover / Focus Inspection Needle */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={padTop + chartHeight}
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X-Axis Hour Labels */}
          {[0, 4, 8, 12, 16, 20].map(h => {
            const pt = points[h];
            if (!pt) return null;
            return (
              <text
                key={h}
                x={pt.x}
                y={svgHeight - 8}
                textAnchor="middle"
                fill={h === 12 ? '#34d399' : '#64748b'}
                fontSize="9"
                fontFamily="JetBrains Mono"
                fontWeight={h === 12 ? '600' : '400'}
              >
                {pt.timeLabel}
              </text>
            );
          })}
        </svg>

        {/* Floating Dark Glass Interactive Tooltip */}
        <div
          className="absolute top-1 pointer-events-none z-20 transition-all duration-150 ease-out"
          style={{
            left: `${((activePoint.x / svgWidth) * 100).toFixed(1)}%`,
            transform: activePoint.hour < 5
              ? 'translateX(0%)'
              : activePoint.hour > 18
              ? 'translateX(-100%)'
              : 'translateX(-50%)'
          }}
        >
          <div className="bg-[#090e17]/95 backdrop-blur-xl border border-ink-100/[0.14] rounded-xl p-2.5 sm:p-3 shadow-panel min-w-[190px] sm:min-w-[220px] max-w-[260px] space-y-1.5">
            {/* Header: Hour & Badge */}
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-ink-100/[0.08]">
              <div className="flex items-center gap-1.5 text-xs text-ink-200 font-mono font-medium">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span>{activePoint.timeLabel}</span>
                {activePoint.hour === currentHour && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent/20 text-accent font-semibold">
                    NOW
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-medium ${verdictInfo.badgeClass}`}>
                {verdictInfo.badge}
              </span>
            </div>

            {/* Projected AQI & Category */}
            <div className="flex items-baseline justify-between pt-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-bold font-mono ${getAQIColor(activePoint.aqi)}`}>
                  {activePoint.aqi}
                </span>
                <span className="text-[10px] text-ink-400 font-mono">Projected AQI</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getAQIBadgeClass(activePoint.aqi)}`}>
                {activePoint.category}
              </span>
            </div>

            {/* Activity Verdict */}
            <div className="pt-1.5 border-t border-ink-100/[0.07]">
              <p className="text-[11px] text-ink-200 leading-snug font-sans">
                {verdictInfo.verdict}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Key Diurnal Atmospheric Milestones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-ink-100/[0.06]">
        {/* Morning Inversion */}
        <div className="bg-ink-900/60 border border-ink-100/[0.06] rounded-lg p-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-medium text-ink-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Morning Inversion (6–9 AM)
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-semibold">
              ~{morningPeakVal} AQI
            </span>
          </div>
          <p className="text-[9px] text-ink-500 leading-tight">
            Cool ground traps nocturnal particulates; boundary layer at ~150m.
          </p>
        </div>

        {/* Midday Safe Window */}
        <div className="bg-emerald-500/[0.07] border border-emerald-500/20 rounded-lg p-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-medium text-emerald-300 flex items-center gap-1">
              <Sun className="w-3 h-3 text-emerald-400" />
              Midday Window (12–4 PM)
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
              ~{middaySafeVal} AQI
            </span>
          </div>
          <p className="text-[9px] text-emerald-400/80 leading-tight">
            Solar heating expands mixing height to ~1800m. <strong>Safest movement window.</strong>
          </p>
        </div>

        {/* Evening Traffic Surge */}
        <div className="bg-ink-900/60 border border-ink-100/[0.06] rounded-lg p-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-medium text-ink-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-400" />
              Evening Surge (6–9 PM)
            </span>
            <span className="text-[10px] font-mono text-orange-400 font-semibold">
              ~{eveningPeakVal} AQI
            </span>
          </div>
          <p className="text-[9px] text-ink-500 leading-tight">
            Sunset cool-down compresses mixing height while evening traffic peaks.
          </p>
        </div>
      </div>
    </div>
  );
}
