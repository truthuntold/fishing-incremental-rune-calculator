import { useState, useMemo, useEffect } from 'react';
import { 
  buildScaleUtils, 
  parseScaled, 
  formatScaled, 
  processRunes, 
  findNextUnderHour, 
  timeSeconds,
  type ProcessOptions,
  type ScaleUtils
} from '../../core/rune-core';
import { formatTimeHuman } from '../../lib/formatters';
import type { RuneRecord, Scales } from '../../types';

// Icons as simple SVG components
const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

interface Props {
  runes: RuneRecord[];
  scales: Scales;
  initialRps?: string;
  initialLuck?: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Local storage hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      
      // Special handling for Set types
      if (initialValue instanceof Set) {
        const parsed = JSON.parse(item);
        return new Set(Array.isArray(parsed) ? parsed : []) as T;
      }
      
      return JSON.parse(item);
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      // Special handling for Set types
      if (valueToStore instanceof Set) {
        window.localStorage.setItem(key, JSON.stringify(Array.from(valueToStore)));
      } else {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch {
      // Ignore storage errors
    }
  };

  return [storedValue, setValue] as const;
}

export default function RuneCalculatorPanel({ runes, scales, initialRps = '1M', initialLuck = '1' }: Props) {
  const [rpsInput, setRpsInput] = useLocalStorage('runeCalc_rps', initialRps);
  const [luckInput, setLuckInput] = useLocalStorage('runeCalc_luck', initialLuck);
  const [filterText, setFilterText] = useLocalStorage('runeCalc_filter', '');
  const [hideInstant, setHideInstant] = useLocalStorage('runeCalc_hideInstant', false);
  const [sortOrder, setSortOrder] = useLocalStorage<'asc' | 'desc'>('runeCalc_sort', 'asc');
  const [customChanceInput, setCustomChanceInput] = useState('');
  const [isDarkMode, setIsDarkMode] = useLocalStorage('runeCalc_darkMode', false);
  const [obtainedRunes, setObtainedRunes] = useLocalStorage<Set<string>>('runeCalc_obtained', new Set());
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('runeCalc_viewMode', 'list');
  const [showOnlyTargets, setShowOnlyTargets] = useLocalStorage('runeCalc_showOnlyTargets', false);
  const [copiedText, setCopiedText] = useState<string>('');

  const debouncedFilterText = useDebounce(filterText, 150);

  const scaleUtils = useMemo(() => buildScaleUtils(scales), [scales]);

  const rpsResult = useMemo(() => parseScaled(rpsInput, scaleUtils), [rpsInput, scaleUtils]);
  const luckResult = useMemo(() => parseScaled(luckInput, scaleUtils), [luckInput, scaleUtils]);

  const processOptions = useMemo((): ProcessOptions => ({
    text: debouncedFilterText,
    hideInstant,
    sort: sortOrder
  }), [debouncedFilterText, hideInstant, sortOrder]);

  const processedRunes = useMemo(() => 
    processRunes(runes, rpsResult.value, luckResult.value, processOptions),
    [runes, rpsResult.value, luckResult.value, processOptions]
  );

  const nextTarget = useMemo(() => 
    findNextUnderHour(processedRunes),
    [processedRunes]
  );

  const customTime = useMemo(() => {
    const customResult = parseScaled(customChanceInput, scaleUtils);
    if (customResult.value > 0) {
      return timeSeconds(rpsResult.value, luckResult.value, customResult.value);
    }
    return null;
  }, [customChanceInput, rpsResult.value, luckResult.value, scaleUtils]);

  // Bidirectional converter for scientific/short format
  const converterResult = useMemo(() => {
    const customResult = parseScaled(customChanceInput, scaleUtils);
    if (customResult.value <= 0) return null;
    
    const scientific = customResult.value.toExponential();
    const shortFormat = formatScaled(customResult.value, scaleUtils);
    
    return {
      value: customResult.value,
      scientific,
      shortFormat,
      warning: customResult.warning
    };
  }, [customChanceInput, scaleUtils]);

  const hasValidInputs = rpsResult.value > 0 && luckResult.value > 0;

  // Quick preset values
  const quickPresets = [
    { label: '1M', rps: '1M', luck: '1' },
    { label: '10M', rps: '10M', luck: '1' },
    { label: '100M', rps: '100M', luck: '1' },
    { label: '1B', rps: '1B', luck: '1' },
    { label: 'High Luck', rps: '100M', luck: '10' },
    { label: 'Max Setup', rps: '1B', luck: '50' }
  ];

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Toggle obtained rune
  const toggleObtainedRune = (runeId: string) => {
    setObtainedRunes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runeId)) {
        newSet.delete(runeId);
      } else {
        newSet.add(runeId);
      }
      return newSet;
    });
  };

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Statistics
  const stats = useMemo(() => {
    const obtained = processedRunes.filter(r => obtainedRunes.has(r.id)).length;
    const instant = processedRunes.filter(r => r.time !== undefined && r.time < 1).length;
    const underHour = processedRunes.filter(r => r.time !== undefined && r.time >= 1 && r.time < 3600).length;
    
    return { obtained, instant, underHour, total: processedRunes.length };
  }, [processedRunes, obtainedRunes]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <div className="max-w-7xl mx-auto p-4 space-y-8">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <StarIcon />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Rune Calculator
                </h1>
                <p className="text-gray-600 dark:text-gray-400">Calculate time-to-obtain for {runes.length} runes</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Stats Overview */}
              <div className="hidden md:flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.obtained}</div>
                  <div className="text-gray-500">Obtained</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.instant}</div>
                  <div className="text-gray-500">Instant</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.underHour}</div>
                  <div className="text-gray-500">Under 1h</div>
                </div>
              </div>
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Toggle dark mode"
              >
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setRpsInput(preset.rps);
                  setLuckInput(preset.luck);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-md text-sm font-medium"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Controls */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label htmlFor="rps-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                RPS (Runes per Second)
              </label>
              <div className="relative">
                <input
                  id="rps-input"
                  type="text"
                  value={rpsInput}
                  onChange={(e) => setRpsInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-lg font-mono"
                  placeholder="e.g. 1M, 1.5k, 1e9"
                />
                <button
                  onClick={() => copyToClipboard(formatScaled(rpsResult.value, scaleUtils), 'RPS')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Copy parsed value"
                >
                  {copiedText === 'RPS' ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Parsed: <span className="font-mono font-semibold">{formatScaled(rpsResult.value, scaleUtils)}</span>
                </span>
                {rpsResult.warning && (
                  <span className="text-amber-600 dark:text-amber-400 text-xs">⚠ {rpsResult.warning}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="luck-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Rune Luck (Multiplier)
              </label>
              <div className="relative">
                <input
                  id="luck-input"
                  type="text"
                  value={luckInput}
                  onChange={(e) => setLuckInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-lg font-mono"
                  placeholder="e.g. 1, 2.5, 1K"
                />
                <button
                  onClick={() => copyToClipboard(formatScaled(luckResult.value, scaleUtils), 'Luck')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Copy parsed value"
                >
                  {copiedText === 'Luck' ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Parsed: <span className="font-mono font-semibold">{formatScaled(luckResult.value, scaleUtils)}</span>
                </span>
                {luckResult.warning && (
                  <span className="text-amber-600 dark:text-amber-400 text-xs">⚠ {luckResult.warning}</span>
                )}
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          {!hasValidInputs && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center text-red-700 dark:text-red-300">
                <span className="mr-2">⚠️</span>
                <span className="font-medium">Invalid inputs: RPS and Luck must be greater than 0</span>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Custom Calculator & Converter */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">∞</span>
            </div>
            Custom Calculator & Format Converter
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="custom-chance" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Enter chance (1 in ...)
                </label>
                <input
                  id="custom-chance"
                  type="text"
                  value={customChanceInput}
                  onChange={(e) => setCustomChanceInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all text-lg font-mono"
                  placeholder="e.g. 1000, 1.5M, 1e9, 1SxDe"
                />
              </div>
              
              {/* Time Result */}
              <div className="p-4 bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time to obtain</div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {customTime !== null ? formatTimeHuman(customTime) : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Format Conversion */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Format Conversion</h4>
              
              {converterResult && (
                <div className="space-y-3">
                  {/* Short Format */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Short Format</div>
                      <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
                        {converterResult.shortFormat}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(converterResult.shortFormat, 'short')}
                      className="p-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors"
                      title="Copy short format"
                    >
                      {copiedText === 'short' ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>

                  {/* Scientific Format */}
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Scientific Format</div>
                      <div className="font-mono font-bold text-purple-700 dark:text-purple-300">
                        {converterResult.scientific}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(converterResult.scientific, 'scientific')}
                      className="p-2 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-lg transition-colors"
                      title="Copy scientific format"
                    >
                      {copiedText === 'scientific' ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>

                  {/* Raw Value */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Raw Value</div>
                      <div className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                        {converterResult.value}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(converterResult.value.toString(), 'raw')}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy raw value"
                    >
                      {copiedText === 'raw' ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>

                  {converterResult.warning && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="text-amber-700 dark:text-amber-300 text-sm">
                        ⚠️ {converterResult.warning}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Filter & Sort Controls */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Search Filter */}
            <div className="space-y-2">
              <label htmlFor="filter-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Search Runes
              </label>
              <input
                id="filter-input"
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                placeholder="Search name or description..."
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <label htmlFor="sort-select" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sort by Time
              </label>
              <select
                id="sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-4 py-3 bg-white/50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
              >
                <option value="asc">Easiest First</option>
                <option value="desc">Hardest First</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                View Mode
              </label>
              <div className="flex rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Grid
                </button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Quick Filters
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hideInstant}
                    onChange={(e) => setHideInstant(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Hide Instant (&lt;1s)</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showOnlyTargets}
                    onChange={(e) => setShowOnlyTargets(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Only Targets (&lt;1h)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Runes List */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                  <StarIcon />
                </div>
                Runes Collection
              </h2>
              <div className="flex items-center space-x-4 text-sm">
                <div className="px-3 py-1 bg-white/50 dark:bg-gray-700/50 rounded-full border">
                  <span className="font-semibold">{processedRunes.length}</span> runes
                </div>
                {nextTarget && (
                  <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full border border-yellow-200 dark:border-yellow-800">
                    Next Target: {processedRunes.find(r => r.id === nextTarget)?.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Runes Grid/List */}
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6' : 'divide-y divide-gray-200 dark:divide-gray-700'}`}>
            {processedRunes
              .filter(rune => {
                if (showOnlyTargets && rune.time !== undefined && (rune.time < 1 || rune.time >= 3600)) {
                  return false;
                }
                return true;
              })
              .map((rune) => (
                <EnhancedRuneCard 
                  key={rune.id} 
                  rune={rune} 
                  scaleUtils={scaleUtils}
                  isNextTarget={nextTarget === rune.id}
                  isObtained={obtainedRunes.has(rune.id)}
                  onToggleObtained={() => toggleObtainedRune(rune.id)}
                  viewMode={viewMode}
                  onCopyChance={(text) => copyToClipboard(text, `chance-${rune.id}`)}
                  copiedText={copiedText}
                />
              ))}
          </div>
          
          {processedRunes.filter(rune => {
            if (showOnlyTargets && rune.time !== undefined && (rune.time < 1 || rune.time >= 3600)) {
              return false;
            }
            return true;
          }).length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <StarIcon />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No runes match your filters</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filter settings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface EnhancedRuneCardProps {
  rune: import('../../core/rune-core').ProcessedRune;
  scaleUtils: ScaleUtils;
  isNextTarget: boolean;
  isObtained: boolean;
  onToggleObtained: () => void;
  viewMode: 'grid' | 'list';
  onCopyChance: (text: string) => void;
  copiedText: string;
}

function EnhancedRuneCard({ 
  rune, 
  scaleUtils, 
  isNextTarget, 
  isObtained, 
  onToggleObtained, 
  viewMode, 
  onCopyChance, 
  copiedText 
}: EnhancedRuneCardProps) {
  const formattedChance = formatScaled(rune.chance.n, scaleUtils);
  const scientificHint = rune.chance.n >= 1e6 ? ` (~${rune.chance.n.toExponential(1)})` : '';
  
  const categoryColors = {
    'Starter': {
      bg: 'from-green-400 to-emerald-500',
      text: 'text-green-700 dark:text-green-300',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    },
    'Magical': {
      bg: 'from-purple-400 to-pink-500',
      text: 'text-purple-700 dark:text-purple-300',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    },
    'Space': {
      bg: 'from-blue-400 to-cyan-500',
      text: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  };

  const colors = categoryColors[rune.category];

  if (viewMode === 'grid') {
    return (
      <div className={`
        relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-white/40 dark:border-gray-600/40 p-6 
        transition-all duration-300 hover:shadow-xl hover:scale-105 hover:bg-white/80 dark:hover:bg-gray-800/80
        ${isObtained ? 'ring-2 ring-green-500 bg-green-50/50 dark:bg-green-900/10' : ''}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${colors.bg} rounded-xl flex items-center justify-center shadow-md`}>
              <StarIcon />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{rune.name}</h3>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-lg ${colors.badge}`}>
                  {rune.category}
                </span>
                {rune.rarity && rune.rarity !== rune.category && (
                  <span className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {rune.rarity}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onToggleObtained}
            className={`
              w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
              ${isObtained 
                ? 'bg-green-500 border-green-500 text-white' 
                : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
              }
            `}
            title={isObtained ? 'Mark as not obtained' : 'Mark as obtained'}
          >
            {isObtained && <CheckIcon />}
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {rune.hidden && (
            <span className="px-2 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
              Hidden
            </span>
          )}
          {isNextTarget && (
            <span className="px-2 py-1 text-xs font-medium rounded-lg bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 animate-pulse">
              🎯 Next Target
            </span>
          )}
        </div>

        {/* Chance */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Chance:</span>
            <button
              onClick={() => onCopyChance(formattedChance)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copy chance"
            >
              {copiedText === `chance-${rune.id}` ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">
            1 / {formattedChance}
          </div>
          {scientificHint && (
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{scientificHint}</div>
          )}
        </div>

        {/* Time */}
        <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Time to obtain</div>
          <div className={`text-xl font-bold ${colors.text}`}>
            {rune.time !== undefined ? formatTimeHuman(rune.time) : '—'}
          </div>
        </div>

        {/* Boosts */}
        {rune.boosts.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Boosts:</div>
            <div className="flex flex-wrap gap-1">
              {rune.boosts.map((boost, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  title={`${boost.type} ${boost.mode}${boost.cap ? ` (${boost.cap}x)` : ''}${boost.capStatus === 'notCapped' ? ' ∞' : ''}`}
                >
                  {boost.type}
                  {boost.cap && ` (${boost.cap}x)`}
                  {boost.capStatus === 'notCapped' && ' ∞'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Source Note */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">{rune.sourceNote}</p>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className={`
      px-6 py-4 transition-all duration-200 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 
      dark:hover:from-purple-900/10 dark:hover:to-blue-900/10
      ${isObtained ? 'bg-green-50/30 dark:bg-green-900/10' : ''}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onToggleObtained}
              className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                ${isObtained 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                }
              `}
              title={isObtained ? 'Mark as not obtained' : 'Mark as obtained'}
            >
              {isObtained && <CheckIcon />}
            </button>

            <div className={`w-8 h-8 bg-gradient-to-br ${colors.bg} rounded-lg flex items-center justify-center shadow-sm flex-shrink-0`}>
              <StarIcon />
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {rune.name}
            </h3>
            
            <span className={`px-2 py-1 text-xs font-medium rounded-lg ${colors.badge} flex-shrink-0`}>
              {rune.category}
            </span>
            
            {rune.rarity && rune.rarity !== rune.category && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 flex-shrink-0">
                {rune.rarity}
              </span>
            )}
            
            {rune.hidden && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 flex-shrink-0">
                Hidden
              </span>
            )}
            
            {isNextTarget && (
              <span className="px-2 py-1 text-xs font-medium rounded-lg bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 animate-pulse flex-shrink-0">
                🎯 Next Target
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {rune.sourceNote}
          </p>
          
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">Chance:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">1 / {formattedChance}</span>
              <span className="text-gray-500 dark:text-gray-400">{scientificHint}</span>
              <button
                onClick={() => onCopyChance(formattedChance)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title="Copy chance"
              >
                {copiedText === `chance-${rune.id}` ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
            
            {rune.boosts.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">Boosts:</span>
                <div className="flex flex-wrap gap-1">
                  {rune.boosts.map((boost, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      title={`${boost.type} ${boost.mode}${boost.cap ? ` (${boost.cap}x)` : ''}${boost.capStatus === 'notCapped' ? ' ∞' : ''}`}
                    >
                      {boost.type}
                      {boost.cap && ` (${boost.cap}x)`}
                      {boost.capStatus === 'notCapped' && ' ∞'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right flex-shrink-0 ml-6">
          <div className={`text-2xl font-bold ${colors.text}`}>
            {rune.time !== undefined ? formatTimeHuman(rune.time) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}