import { describe, it, expect } from 'vitest';
import { 
  buildScaleUtils, 
  parseScaled, 
  formatScaled, 
  timeSeconds, 
  processRunes,
  findNextUnderHour,
  type ProcessedRune
} from './rune-core';
import type { Scales, RuneRecord } from '../types';

const testScales: Scales = {
  '': 1,
  'k': 1000,
  'K': 1000,
  'M': 1000000,
  'B': 1000000000,
  'T': 1000000000000
};

describe('buildScaleUtils', () => {
  it('should build scale utilities correctly', () => {
    const su = buildScaleUtils(testScales);
    
    expect(su.scaleEntries).toEqual([
      ['', 1],
      ['T', 1000000000000],
      ['B', 1000000000],
      ['M', 1000000],
      ['k', 1000],
      ['K', 1000]
    ]);
    
    expect(su.lowerCaseScaleMap['k']).toEqual(['k', 'K']);
    expect(su.conflictingLowerCaseSuffixes.has('k')).toBe(true);
  });
});

describe('parseScaled', () => {
  const su = buildScaleUtils(testScales);

  it('should parse simple numbers', () => {
    expect(parseScaled('123', su)).toEqual({ value: 123, warning: null });
    expect(parseScaled('0', su)).toEqual({ value: 0, warning: null });
  });

  it('should parse scientific notation', () => {
    expect(parseScaled('1e9', su)).toEqual({ value: 1e9, warning: null });
    expect(parseScaled('1.5E6', su)).toEqual({ value: 1.5e6, warning: null });
  });

  it('should parse suffix notation', () => {
    const result1 = parseScaled('1.5k', su);
    expect(result1.value).toBe(1500);
    expect(result1.warning).toContain('Ambiguous suffix');
    
    expect(parseScaled('499.99T', su)).toEqual({ value: 499.99e12, warning: null });
  });

  it('should handle invalid inputs', () => {
    expect(parseScaled('', su).value).toBe(0);
    expect(parseScaled('abc', su).value).toBe(0);
    expect(parseScaled('1.5x', su).value).toBe(1.5); // Parses 1.5 and ignores invalid suffix
  });

  it('should warn about ambiguous suffixes', () => {
    const result = parseScaled('1k', su);
    expect(result.value).toBe(1000);
    expect(result.warning).toContain('Ambiguous suffix');
  });
});

describe('formatScaled', () => {
  const su = buildScaleUtils(testScales);

  it('should format small numbers without suffix', () => {
    expect(formatScaled(123, su)).toBe('123');
    expect(formatScaled(999, su)).toBe('999');
  });

  it('should format large numbers with suffix', () => {
    expect(formatScaled(1200000000, su)).toBe('1.20 B');
    expect(formatScaled(1.2345e9, su)).toBe('1.23 B');
  });
});

describe('timeSeconds', () => {
  it('should calculate time correctly', () => {
    expect(timeSeconds(10, 2, 1000000)).toBe(50000);
    expect(timeSeconds(1, 1, 100)).toBe(100);
  });

  it('should return Infinity for invalid inputs', () => {
    expect(timeSeconds(0, 1, 100)).toBe(Infinity);
    expect(timeSeconds(1, 0, 100)).toBe(Infinity);
    expect(timeSeconds(-1, 1, 100)).toBe(Infinity);
  });
});

describe('processRunes', () => {
  const testRunes: RuneRecord[] = [
    {
      id: 'fast',
      name: 'Fast Rune',
      category: 'Starter',
      hidden: false,
      sourceNote: 'Quick to get',
      chance: { type: 'oneInN', n: 10, display: '1/10' },
      boosts: []
    },
    {
      id: 'slow',
      name: 'Slow Rune',
      category: 'Magical',
      hidden: false,
      sourceNote: 'Takes a while',
      chance: { type: 'oneInN', n: 1000000, display: '1/1M' },
      boosts: []
    }
  ];

  it('should process runes with time calculations', () => {
    const processed = processRunes(testRunes, 1, 1, {});
    
    expect(processed).toHaveLength(2);
    expect(processed[0].time).toBe(10);
    expect(processed[1].time).toBe(1000000);
    expect(processed[0].isSpecial).toBe(false);
  });

  it('should filter by text', () => {
    const processed = processRunes(testRunes, 1, 1, { text: 'fast' });
    expect(processed).toHaveLength(1);
    expect(processed[0].id).toBe('fast');
  });

  it('should hide instant runes', () => {
    const processed = processRunes(testRunes, 100, 1, { hideInstant: true });
    expect(processed).toHaveLength(1);
    expect(processed[0].id).toBe('slow');
  });

  it('should sort by time', () => {
    const ascProcessed = processRunes(testRunes, 1, 1, { sort: 'asc' });
    expect(ascProcessed[0].id).toBe('fast');
    expect(ascProcessed[1].id).toBe('slow');

    const descProcessed = processRunes(testRunes, 1, 1, { sort: 'desc' });
    expect(descProcessed[0].id).toBe('slow');
    expect(descProcessed[1].id).toBe('fast');
  });
});

describe('findNextUnderHour', () => {
  it('should find the next target under one hour', () => {
    const processedRunes: ProcessedRune[] = [
      { id: 'instant', time: 0.5, isSpecial: false, name: '', category: 'Starter', hidden: false, sourceNote: '', chance: { type: 'oneInN', n: 1, display: '' }, boosts: [] },
      { id: 'target', time: 1800, isSpecial: false, name: '', category: 'Starter', hidden: false, sourceNote: '', chance: { type: 'oneInN', n: 1, display: '' }, boosts: [] },
      { id: 'long', time: 7200, isSpecial: false, name: '', category: 'Starter', hidden: false, sourceNote: '', chance: { type: 'oneInN', n: 1, display: '' }, boosts: [] },
    ];

    expect(findNextUnderHour(processedRunes)).toBe('target');
  });

  it('should return null if no valid target found', () => {
    const processedRunes: ProcessedRune[] = [
      { id: 'instant', time: 0.5, isSpecial: false, name: '', category: 'Starter', hidden: false, sourceNote: '', chance: { type: 'oneInN', n: 1, display: '' }, boosts: [] },
      { id: 'long', time: 7200, isSpecial: false, name: '', category: 'Starter', hidden: false, sourceNote: '', chance: { type: 'oneInN', n: 1, display: '' }, boosts: [] },
    ];

    expect(findNextUnderHour(processedRunes)).toBeNull();
  });
});