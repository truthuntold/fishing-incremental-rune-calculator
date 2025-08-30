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
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
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

  const hasValidInputs = rpsResult.value > 0 && luckResult.value > 0;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Rune Calculator
        </h1>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="rps-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              RPS (Runes per Second)
            </label>
            <input
              id="rps-input"
              type="text"
              value={rpsInput}
              onChange={(e) => setRpsInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g. 1M, 1.5k, 1e9"
              aria-describedby="rps-help"
            />
            <div id="rps-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Parsed: {formatScaled(rpsResult.value, scaleUtils)}
              {rpsResult.warning && (
                <span className="text-amber-600 dark:text-amber-400 block">⚠ {rpsResult.warning}</span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="luck-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rune Luck (Multiplier)
            </label>
            <input
              id="luck-input"
              type="text"
              value={luckInput}
              onChange={(e) => setLuckInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g. 1, 2.5, 1K"
              aria-describedby="luck-help"
            />
            <div id="luck-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Parsed: {formatScaled(luckResult.value, scaleUtils)}
              {luckResult.warning && (
                <span className="text-amber-600 dark:text-amber-400 block">⚠ {luckResult.warning}</span>
              )}
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        {!hasValidInputs && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
            <div className="text-red-700 dark:text-red-300">
              ⚠ Invalid inputs: RPS and Luck must be greater than 0
            </div>
          </div>
        )}

        {/* Filter and Sort Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="filter-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter (name/source)
            </label>
            <input
              id="filter-input"
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Search runes..."
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hideInstant}
                onChange={(e) => setHideInstant(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:ring-blue-500 dark:bg-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Hide Instant (&lt;1s)</span>
            </label>
          </div>

          <div>
            <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort by Time
            </label>
            <select
              id="sort-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="asc">Easiest First</option>
              <option value="desc">Hardest First</option>
            </select>
          </div>
        </div>

        {/* Custom Calculator */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Custom Calculator
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="custom-chance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                1 in ...
              </label>
              <input
                id="custom-chance"
                type="text"
                value={customChanceInput}
                onChange={(e) => setCustomChanceInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. 1000, 1.5M"
              />
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              = {customTime !== null ? formatTimeHuman(customTime) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Runes List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Runes ({processedRunes.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {processedRunes.map((rune) => (
            <RuneCard 
              key={rune.id} 
              rune={rune} 
              scaleUtils={scaleUtils}
              isNextTarget={nextTarget === rune.id}
            />
          ))}
          
          {processedRunes.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              No runes match your filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RuneCardProps {
  rune: import('../../core/rune-core').ProcessedRune;
  scaleUtils: ScaleUtils;
  isNextTarget: boolean;
}

function RuneCard({ rune, scaleUtils, isNextTarget }: RuneCardProps) {
  const formattedChance = formatScaled(rune.chance.n, scaleUtils);
  const scientificHint = rune.chance.n >= 1e6 ? ` (~${rune.chance.n.toExponential(1)})` : '';
  
  const categoryColor = {
    'Starter': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Magical': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'Space': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  }[rune.category];

  return (
    <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {rune.name}
            </h3>
            
            <span className={`px-2 py-1 text-xs font-medium rounded ${categoryColor}`}>
              {rune.category}
            </span>
            
            {rune.rarity && rune.rarity !== rune.category && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300">
                {rune.rarity}
              </span>
            )}
            
            {rune.hidden && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                Hidden
              </span>
            )}
            
            {isNextTarget && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                Next Target (&lt; 1 hour)
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {rune.sourceNote}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Chance:</span> 1 / {formattedChance}{scientificHint}
            </div>
            
            {rune.boosts.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {rune.boosts.map((boost, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {boost.type}
                    {boost.cap && ` (${boost.cap}x)`}
                    {boost.capStatus === 'notCapped' && ' ∞'}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {rune.time !== undefined ? formatTimeHuman(rune.time) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}