import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Navigation } from 'lucide-react';
import { searchStations } from '../services/aqiService';
import { getAQIBadgeClass } from '../utils/aqi';
import type { StationSearchResult } from '../types';

const POPULAR_INDIAN_CITIES = [
  'Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'Hyderabad',
  'Chennai', 'Pune', 'Kota', 'Kochi', 'Jaipur', 'Lucknow'
];

interface StationSearchProps {
  activeCity: string;
  onSelectCity: (city: string) => void;
  onSelectStation: (uid: number, stationCity?: string) => Promise<void>;
}

export function StationSearch({ activeCity, onSelectCity, onSelectStation }: StationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced Indian station search with AbortController to prevent stale dropdown results
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchStations(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setSearchResults(results);
          setIsDropdownOpen(true);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStation = async (station: StationSearchResult) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    await onSelectStation(station.uid, station.city || activeCity);
  };

  return (
    <div ref={searchContainerRef} className="relative space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="indian-station-search" className="text-xs font-medium text-ink-300 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-ink-400" />
          Search city or monitoring station
        </label>
        <span className="text-[10px] text-ink-500 font-mono">
          CPCB India stations
        </span>
      </div>

      <div className="relative">
        <input
          id="indian-station-search"
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => {
            if (searchResults.length > 0) setIsDropdownOpen(true);
          }}
          placeholder="Type city or locality (e.g. Kota, Kochi, Bandra, Dwarka)..."
          className="w-full bg-ink-850 border border-ink-100/[0.08] rounded-xl pl-9 pr-9 py-2 text-base sm:text-xs text-ink-100 placeholder-ink-500 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
          autoComplete="off"
        />
        <Search className="w-3.5 h-3.5 text-ink-500 absolute left-3 top-2.5 pointer-events-none" />
        {isSearching ? (
          <Loader2 className="w-3.5 h-3.5 text-ink-400 absolute right-3 top-2.5 animate-spin" />
        ) : searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
              setIsDropdownOpen(false);
            }}
            className="absolute right-3 top-2.5 text-ink-500 hover:text-ink-200 p-0.5"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Results Dropdown */}
      {isDropdownOpen && searchResults.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-ink-900 border border-ink-100/[0.1] rounded-xl shadow-panel z-50 max-h-72 overflow-y-auto divide-y divide-ink-100/[0.06]">
          <div className="px-3.5 py-2 bg-ink-950/80 text-[10px] font-medium text-ink-500 flex items-center justify-between">
            <span>Verified monitoring stations</span>
            <span className="font-mono">{searchResults.length} stations</span>
          </div>
          {searchResults.map((station) => {
            const aqiNum = typeof station.aqi === 'number' ? station.aqi : Number(station.aqi);
            return (
              <button
                key={station.uid}
                type="button"
                onClick={() => handleSelectStation(station)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-ink-800 flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink-200 group-hover:text-ink-100 truncate flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    {station.name}
                  </p>
                  <p className="text-[10px] text-ink-500 mt-0.5 font-mono">
                    CPCB #{station.uid} {station.time ? `• ${station.time}` : ''}
                  </p>
                </div>
                {!isNaN(aqiNum) && aqiNum > 0 ? (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${getAQIBadgeClass(aqiNum)} flex-shrink-0`}>
                    AQI {aqiNum}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-ink-500 bg-ink-850 px-2 py-0.5 rounded border border-ink-100/[0.06] flex-shrink-0">
                    Live sensor
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isDropdownOpen && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-ink-900 border border-ink-100/[0.08] rounded-xl p-3 text-xs text-ink-400 text-center shadow-panel z-50">
          No matching stations found for "{searchQuery}". Try typing the district or nearby city.
        </div>
      )}

      {/* Quick Indian City Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] text-ink-500 mr-0.5 sm:mr-1">Quick select:</span>
        {POPULAR_INDIAN_CITIES.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onSelectCity(c)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors touch-manipulation min-h-[30px] flex items-center ${
              activeCity.toLowerCase() === c.toLowerCase()
                ? 'bg-ink-800 border-ink-100/[0.15] text-ink-100 font-medium shadow-subtle'
                : 'bg-ink-850/60 border-ink-100/[0.06] text-ink-400 hover:text-ink-200 hover:bg-ink-800'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
