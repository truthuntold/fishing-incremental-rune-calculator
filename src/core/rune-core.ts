import type { RuneRecord, Scales } from '../types';

export interface ParseResult {
  value: number;
  warning: string | null;
}

export interface ScaleUtils {
  scaleEntries: Array<[string, number]>;
  lowerCaseScaleMap: Record<string, string[]>;
  conflictingLowerCaseSuffixes: Set<string>;
}

export function buildScaleUtils(scales: Scales): ScaleUtils {
  const scaleEntries = Object.entries(scales)
    .filter(([key]) => key !== '') // Exclude empty string (base case)
    .sort(([, a], [, b]) => b - a); // Sort desc by multiplier
  
  const lowerCaseScaleMap: Record<string, string[]> = {};
  const conflictingLowerCaseSuffixes = new Set<string>();
  
  // Build lowercase mapping and detect conflicts
  for (const [suffix] of scaleEntries) {
    const lower = suffix.toLowerCase();
    if (!lowerCaseScaleMap[lower]) {
      lowerCaseScaleMap[lower] = [];
    }
    lowerCaseScaleMap[lower].push(suffix);
    
    if (lowerCaseScaleMap[lower].length > 1) {
      conflictingLowerCaseSuffixes.add(lower);
    }
  }
  
  return {
    scaleEntries: [['', 1], ...scaleEntries], // Include base case
    lowerCaseScaleMap,
    conflictingLowerCaseSuffixes
  };
}

export function parseScaled(input: string, su: ScaleUtils): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { value: 0, warning: 'Empty input' };
  }
  
  // Try scientific notation first
  if (trimmed.includes('e') || trimmed.includes('E')) {
    const num = parseFloat(trimmed);
    if (isNaN(num) || !isFinite(num)) {
      return { value: 0, warning: 'Invalid scientific notation' };
    }
    return { value: num, warning: null };
  }
  
  // Check for suffix notation
  let numPart = trimmed;
  let suffix = '';
  let multiplier = 1;
  
  // Find the longest matching suffix
  for (const [scaleSuffix, scaleMultiplier] of su.scaleEntries) {
    if (scaleSuffix && trimmed.toLowerCase().endsWith(scaleSuffix.toLowerCase())) {
      const potentialNumPart = trimmed.slice(0, -scaleSuffix.length);
      const num = parseFloat(potentialNumPart);
      
      if (!isNaN(num) && isFinite(num)) {
        numPart = potentialNumPart;
        suffix = scaleSuffix;
        multiplier = scaleMultiplier;
        break;
      }
    }
  }
  
  // If no suffix found, try parsing as raw number
  if (suffix === '') {
    const num = parseFloat(trimmed);
    if (isNaN(num) || !isFinite(num)) {
      return { value: 0, warning: 'Invalid number format' };
    }
    return { value: num, warning: null };
  }
  
  const baseNum = parseFloat(numPart);
  if (isNaN(baseNum) || !isFinite(baseNum)) {
    return { value: 0, warning: 'Invalid number part before suffix' };
  }
  
  const result = baseNum * multiplier;
  if (!isFinite(result)) {
    return { value: 0, warning: 'Result too large' };
  }
  
  // Check for ambiguous suffix warning
  const lowerSuffix = suffix.toLowerCase();
  let warning: string | null = null;
  
  if (su.conflictingLowerCaseSuffixes.has(lowerSuffix)) {
    const alternatives = su.lowerCaseScaleMap[lowerSuffix].filter(s => s !== suffix);
    if (alternatives.length > 0) {
      warning = `Ambiguous suffix "${suffix}" - could also mean: ${alternatives.join(', ')}`;
    }
  }
  
  return { value: result, warning };
}

export function formatScaled(num: number, su: ScaleUtils): string {
  if (!isFinite(num) || num === 0) {
    return num.toString();
  }
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  // For small numbers, don't use suffix
  if (absNum < 1000) {
    return num.toString();
  }
  
  // Find appropriate suffix
  for (const [suffix, multiplier] of su.scaleEntries) {
    if (suffix && absNum >= multiplier) {
      const scaled = absNum / multiplier;
      const formatted = scaled.toPrecision(3);
      return `${sign}${formatted} ${suffix}`;
    }
  }
  
  return num.toString();
}

export function timeSeconds(rps: number, luck: number, chanceN: number): number {
  if (rps <= 0 || luck <= 0 || chanceN <= 0) {
    return Infinity;
  }
  
  return chanceN / (rps * luck);
}

export interface ProcessOptions {
  text?: string;
  hideInstant?: boolean;
  sort?: 'asc' | 'desc';
}

export interface ProcessedRune extends RuneRecord {
  time?: number;
  isSpecial: boolean;
}

export function processRunes(
  runes: RuneRecord[],
  rps: number,
  luck: number,
  opts: ProcessOptions = {}
): ProcessedRune[] {
  let processed = runes.map((rune): ProcessedRune => {
    const time = timeSeconds(rps, luck, rune.chance.n);
    return {
      ...rune,
      time,
      isSpecial: false // Always false for this dataset
    };
  });
  
  // Apply text filter
  if (opts.text) {
    const searchText = opts.text.toLowerCase();
    processed = processed.filter(rune => 
      rune.name.toLowerCase().includes(searchText) ||
      rune.sourceNote.toLowerCase().includes(searchText)
    );
  }
  
  // Apply hide instant filter
  if (opts.hideInstant) {
    processed = processed.filter(rune => 
      rune.time === undefined || rune.time >= 1
    );
  }
  
  // Apply sorting
  if (opts.sort) {
    processed.sort((a, b) => {
      const timeA = a.time ?? Infinity;
      const timeB = b.time ?? Infinity;
      
      if (opts.sort === 'asc') {
        return timeA - timeB;
      } else {
        return timeB - timeA;
      }
    });
  }
  
  return processed;
}

export function findNextUnderHour(processed: ProcessedRune[]): string | null {
  const candidate = processed.find(rune => 
    rune.time !== undefined && 
    rune.time >= 1 && 
    rune.time < 3600
  );
  
  return candidate?.id ?? null;
}