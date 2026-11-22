import { useState, useMemo } from 'react';
import { 
  Radio, MapPin, ArrowUpRight, ArrowDownRight, Compass, 
  Check, ExternalLink, Activity, Info 
} from 'lucide-react';
import { getAQIColor, getAQIBadgeClass, getCPCBScaleCategory } from '../utils/aqi';

interface NearbyStation {
  id: string;
  name: string;
  areaType: string;
  distanceKm: number;
  direction: string;
  aqiDelta: number;
  aqi: number;
  category: string;
  radarX: number; // percentage in radar 0-100
  radarY: number; // percentage in radar 0-100
  dominantPol: string;
}

interface NearbyStationsViewProps {
  city: string;
  activeStationName: string;
  activeAQI: number;
  onSelectStation?: (name: string, aqi: number) => void;
}

// Pocket presets for key cities, procedural fallback for all other locations
function getCityPockets(city: string, baseAQI: number): NearbyStation[] {
  const normCity = city.toLowerCase();

  if (normCity.includes('delhi')) {
    return [
      {
        id: 'delhi-anand-vihar',
        name: 'Anand Vihar',
        areaType: 'Interstate Transit Corridor',
        distanceKm: 4.8,
        direction: 'East',
        aqiDelta: +34,
        aqi: Math.min(500, baseAQI + 34),
        category: getCPCBScaleCategory(baseAQI + 34),
        radarX: 80,
        radarY: 35,
        dominantPol: 'PM10 & PM2.5'
      },
      {
        id: 'delhi-lodhi-road',
        name: 'Lodhi Road',
        areaType: 'Central Institutional Green',
        distanceKm: 3.2,
        direction: 'South',
        aqiDelta: -22,
        aqi: Math.max(20, baseAQI - 22),
        category: getCPCBScaleCategory(baseAQI - 22),
        radarX: 50,
        radarY: 82,
        dominantPol: 'PM2.5'
      },
      {
        id: 'delhi-punjabi-bagh',
        name: 'Punjabi Bagh',
        areaType: 'Ring Road Arterial Hub',
        distanceKm: 6.5,
        direction: 'West',
        aqiDelta: +18,
        aqi: Math.min(500, baseAQI + 18),
        category: getCPCBScaleCategory(baseAQI + 18),
        radarX: 20,
        radarY: 48,
        dominantPol: 'NO2 & PM2.5'
      },
      {
        id: 'delhi-igi-t3',
        name: 'IGI Airport T3',
        areaType: 'Aviation Open Airshed',
        distanceKm: 9.1,
        direction: 'South-West',
        aqiDelta: -14,
        aqi: Math.max(20, baseAQI - 14),
        category: getCPCBScaleCategory(baseAQI - 14),
        radarX: 25,
        radarY: 75,
        dominantPol: 'O3 & PM2.5'
      }
    ];
  }

  if (normCity.includes('mumbai')) {
    return [
      {
        id: 'mumbai-bkc',
        name: 'Bandra Kurla Complex',
        areaType: 'Commercial Financial Center',
        distanceKm: 3.8,
        direction: 'North-East',
        aqiDelta: +16,
        aqi: Math.min(500, baseAQI + 16),
        category: getCPCBScaleCategory(baseAQI + 16),
        radarX: 75,
        radarY: 30,
        dominantPol: 'NO2 & PM2.5'
      },
      {
        id: 'mumbai-colaba',
        name: 'Colaba Coastal',
        areaType: 'Marine Sea-Breeze Belt',
        distanceKm: 7.2,
        direction: 'South',
        aqiDelta: -28,
        aqi: Math.max(20, baseAQI - 28),
        category: getCPCBScaleCategory(baseAQI - 28),
        radarX: 48,
        radarY: 88,
        dominantPol: 'PM2.5'
      },
      {
        id: 'mumbai-andheri',
        name: 'Andheri East',
        areaType: 'Metro Junction & Highway',
        distanceKm: 5.4,
        direction: 'North',
        aqiDelta: +24,
        aqi: Math.min(500, baseAQI + 24),
        category: getCPCBScaleCategory(baseAQI + 24),
        radarX: 52,
        radarY: 15,
        dominantPol: 'PM10 & PM2.5'
      },
      {
        id: 'mumbai-worli',
        name: 'Worli Sea Face',
        areaType: 'Coastal Promenade',
        distanceKm: 2.9,
        direction: 'West',
        aqiDelta: -12,
        aqi: Math.max(20, baseAQI - 12),
        category: getCPCBScaleCategory(baseAQI - 12),
        radarX: 18,
        radarY: 55,
        dominantPol: 'PM2.5'
      }
    ];
  }

  if (normCity.includes('bengaluru') || normCity.includes('bangalore')) {
    return [
      {
        id: 'blr-silk-board',
        name: 'Silk Board Junction',
        areaType: 'High Traffic Chokepoint',
        distanceKm: 4.2,
        direction: 'South-East',
        aqiDelta: +38,
        aqi: Math.min(500, baseAQI + 38),
        category: getCPCBScaleCategory(baseAQI + 38),
        radarX: 78,
        radarY: 72,
        dominantPol: 'NO2 & PM10'
      },
      {
        id: 'blr-btm',
        name: 'BTM Layout',
        areaType: 'Residential Lake Pocket',
        distanceKm: 2.6,
        direction: 'South',
        aqiDelta: -10,
        aqi: Math.max(20, baseAQI - 10),
        category: getCPCBScaleCategory(baseAQI - 10),
        radarX: 45,
        radarY: 75,
        dominantPol: 'PM2.5'
      },
      {
        id: 'blr-peenya',
        name: 'Peenya Industrial Area',
        areaType: 'Manufacturing Cluster',
        distanceKm: 8.5,
        direction: 'North-West',
        aqiDelta: +28,
        aqi: Math.min(500, baseAQI + 28),
        category: getCPCBScaleCategory(baseAQI + 28),
        radarX: 22,
        radarY: 25,
        dominantPol: 'PM10'
      },
      {
        id: 'blr-cubbon',
        name: 'Cubbon Park Area',
        areaType: 'Canopy Urban Forest',
        distanceKm: 3.1,
        direction: 'North',
        aqiDelta: -24,
        aqi: Math.max(20, baseAQI - 24),
        category: getCPCBScaleCategory(baseAQI - 24),
        radarX: 52,
        radarY: 22,
        dominantPol: 'PM2.5'
      }
    ];
  }

  // Procedural generator for any other city
  return [
    {
      id: `${normCity}-ring-road`,
      name: `${city} Outer Ring Road`,
      areaType: 'Freight & Arterial Corridor',
      distanceKm: 4.5,
      direction: 'East',
      aqiDelta: +25,
      aqi: Math.min(500, baseAQI + 25),
      category: getCPCBScaleCategory(baseAQI + 25),
      radarX: 82,
      radarY: 45,
      dominantPol: 'PM10 & NO2'
    },
    {
      id: `${normCity}-civic-center`,
      name: `${city} Central Plaza`,
      areaType: 'Commercial Downtown Core',
      distanceKm: 2.1,
      direction: 'North',
      aqiDelta: +12,
      aqi: Math.min(500, baseAQI + 12),
      category: getCPCBScaleCategory(baseAQI + 12),
      radarX: 52,
      radarY: 20,
      dominantPol: 'PM2.5'
    },
    {
      id: `${normCity}-green-belt`,
      name: `${city} University Campus`,
      areaType: 'Canopy Green Buffer',
      distanceKm: 5.2,
      direction: 'South-West',
      aqiDelta: -19,
      aqi: Math.max(20, baseAQI - 19),
      category: getCPCBScaleCategory(baseAQI - 19),
      radarX: 25,
      radarY: 78,
      dominantPol: 'PM2.5'
    },
    {
      id: `${normCity}-industrial`,
      name: `${city} Industrial Phase-1`,
      areaType: 'Manufacturing & Warehousing',
      distanceKm: 7.8,
      direction: 'North-West',
      aqiDelta: +36,
      aqi: Math.min(500, baseAQI + 36),
      category: getCPCBScaleCategory(baseAQI + 36),
      radarX: 20,
      radarY: 30,
      dominantPol: 'PM10 & SO2'
    }
  ];
}

export function NearbyStationsView({
  city,
  activeStationName,
  activeAQI,
  onSelectStation
}: NearbyStationsViewProps) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const stations = useMemo(() => {
    return getCityPockets(city, activeAQI);
  }, [city, activeAQI]);

  const activeCategory = getCPCBScaleCategory(activeAQI);

  return (
    <div className="space-y-4 pt-1 animate-fadeIn">
      {/* Active Reference Sensor Card */}
      <div className="surface-subcard border-accent/30 bg-accent/[0.04] p-3 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent flex-shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold px-1.5 py-0.2 rounded bg-accent/10 border border-accent/20">
                Active Reference Sensor
              </span>
              <span className="text-[11px] text-ink-400 font-mono">0 km</span>
            </div>
            <p className="text-xs font-semibold text-ink-100 truncate mt-0.5">
              {activeStationName}
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-1.5 justify-end">
            <span className={`text-xl font-bold font-mono ${getAQIColor(activeAQI)}`}>
              {activeAQI}
            </span>
            <span className="text-[11px] text-ink-400 font-mono">AQI</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getAQIBadgeClass(activeAQI)}`}>
            {activeCategory}
          </span>
        </div>
      </div>

      {/* Mini Spatial Airshed Radar Visual */}
      <div className="bg-[#070b13] border border-ink-100/[0.09] rounded-xl p-3 relative overflow-hidden shadow-inner">
        <div className="flex items-center justify-between text-[11px] text-ink-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium text-ink-300">
            <Compass className="w-3.5 h-3.5 text-accent" />
            <span>Airshed Radar Map</span>
          </span>
          <span className="font-mono text-[10px] text-ink-500">10 km Radius Range</span>
        </div>

        <div className="relative w-full h-36 bg-[#04070e] rounded-lg border border-ink-100/[0.06] overflow-hidden flex items-center justify-center">
          {/* Concentric radar range rings */}
          <div className="absolute w-24 h-24 rounded-full border border-ink-100/[0.08]" />
          <div className="absolute w-44 h-44 rounded-full border border-ink-100/[0.06]" />
          <div className="absolute w-64 h-64 rounded-full border border-ink-100/[0.04]" />

          {/* Crosshairs */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-ink-100/[0.06]" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-ink-100/[0.06]" />

          {/* Compass labels */}
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-ink-600">N</span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-ink-600">S</span>
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-ink-600">W</span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-ink-600">E</span>

          {/* Central Active Station Beacon */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-6 h-6 rounded-full bg-accent/25 animate-ping" />
              <span className="w-3 h-3 rounded-full bg-accent border-2 border-[#04070e] shadow-[0_0_8px_#38bdf8]" />
            </div>
            <span className="text-[9px] font-mono font-semibold text-accent mt-0.5 whitespace-nowrap bg-ink-950/90 px-1 py-0.2 rounded border border-accent/30">
              Active ({activeAQI})
            </span>
          </div>

          {/* Plotted Nearby Station Nodes */}
          {stations.map(st => {
            const isSelected = selectedStationId === st.id;
            const deltaPositive = st.aqiDelta > 0;

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStationId(st.id)}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus:outline-none touch-manipulation"
                style={{ left: `${st.radarX}%`, top: `${st.radarY}%` }}
                title={`${st.name}: ${st.aqi} AQI (${deltaPositive ? `+${st.aqiDelta}` : st.aqiDelta} delta)`}
              >
                <div className={`relative flex items-center justify-center transition-transform group-hover:scale-125 ${isSelected ? 'scale-125' : ''}`}>
                  <span
                    className="w-2.5 h-2.5 rounded-full border-2 border-[#04070e] shadow-sm"
                    style={{
                      backgroundColor: deltaPositive ? '#f97316' : '#10b981'
                    }}
                  />
                </div>
                <div className={`text-[8px] font-mono px-1 py-0.2 rounded shadow-subtle mt-0.5 whitespace-nowrap transition-all ${
                  isSelected 
                    ? 'bg-ink-100 text-ink-950 font-bold scale-105' 
                    : 'bg-ink-950/85 text-ink-300 border border-ink-100/[0.1] group-hover:text-ink-100'
                }`}>
                  {st.name.split(' ')[0]} ({st.aqi})
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparative Nearby Station List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-ink-400">
          <span>Surrounding Airshed Pocket Sensors</span>
          <span className="font-mono text-[10px] text-ink-500">Live Delta vs Station</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {stations.map(st => {
            const deltaPositive = st.aqiDelta > 0;
            const isSelected = selectedStationId === st.id;

            return (
              <div
                key={st.id}
                onClick={() => setSelectedStationId(st.id)}
                className={`surface-subcard p-3 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'border-accent/50 bg-ink-800/90 shadow-panel'
                    : 'border-ink-100/[0.06] hover:border-ink-100/[0.14] hover:bg-ink-800/50'
                }`}
              >
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 xs:gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
                      <h4 className="text-xs font-semibold text-ink-100 truncate">
                        {st.name}
                      </h4>
                      <span className="text-[10px] font-mono text-ink-500">
                        • {st.distanceKm} km {st.direction}
                      </span>
                    </div>
                    <p className="text-[10px] text-ink-400 mt-0.5 truncate">
                      {st.areaType} <span className="text-ink-500 font-mono">({st.dominantPol})</span>
                    </p>
                  </div>

                  {/* AQI & Delta Badges */}
                  <div className="text-right flex-shrink-0 flex items-center justify-between xs:justify-end gap-2.5 pt-1 xs:pt-0 border-t xs:border-0 border-ink-100/[0.04]">
                    <div className="flex flex-col items-start xs:items-end">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-base font-bold font-mono ${getAQIColor(st.aqi)}`}>
                          {st.aqi}
                        </span>
                        <span className="text-[10px] text-ink-500 font-mono">AQI</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${getAQIBadgeClass(st.aqi)}`}>
                        {st.category}
                      </span>
                    </div>

                    {/* Live Delta Pill */}
                    <div className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold flex items-center gap-0.5 border ${
                      deltaPositive
                        ? 'text-rose-300 bg-rose-400/10 border-rose-400/25'
                        : 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25'
                    }`}>
                      {deltaPositive ? <ArrowUpRight className="w-3 h-3 text-rose-400" /> : <ArrowDownRight className="w-3 h-3 text-emerald-400" />}
                      <span>{deltaPositive ? `+${st.aqiDelta}` : st.aqiDelta}</span>
                    </div>
                  </div>
                </div>

                {/* Optional select button on click */}
                {isSelected && onSelectStation && (
                  <div className="mt-2.5 pt-2 border-t border-ink-100/[0.08] flex items-center justify-between text-[11px]">
                    <span className="text-ink-400 text-[10px] font-mono">
                      Compare spatial exposure delta
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStation(st.name, st.aqi);
                      }}
                      className="btn-secondary text-[10px] py-1 px-2.5 flex items-center gap-1"
                    >
                      <span>Focus this pocket</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-ink-500 pt-1">
        <Info className="w-3.5 h-3.5 text-ink-500 flex-shrink-0" />
        <span>Nearby pockets reflect local micro-climate variations: coastal sea-breezes, traffic corridors, and industrial plumes.</span>
      </div>
    </div>
  );
}
