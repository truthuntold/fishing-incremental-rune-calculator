import { describe, it, expect } from 'vitest';
import { formatTimeHuman } from './formatters';

describe('formatTimeHuman', () => {
  it('should format instant times', () => {
    expect(formatTimeHuman(0.5)).toBe('Instant');
    expect(formatTimeHuman(0)).toBe('Instant');
  });

  it('should format seconds', () => {
    expect(formatTimeHuman(45)).toBe('45 seconds');
    expect(formatTimeHuman(1)).toBe('1 second');
  });

  it('should format minutes and seconds', () => {
    expect(formatTimeHuman(90)).toBe('1 minute, 30 seconds');
    expect(formatTimeHuman(125)).toBe('2 minutes, 5 seconds');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatTimeHuman(3665)).toBe('1 hour, 1 minute, 5 seconds');
    expect(formatTimeHuman(7325)).toBe('2 hours, 2 minutes, 5 seconds');
  });

  it('should format complex times with up to 3 units', () => {
    const oneDay = 24 * 60 * 60;
    expect(formatTimeHuman(oneDay + 3665)).toBe('1 day, 1 hour, 1 minute');
  });

  it('should handle infinite values', () => {
    expect(formatTimeHuman(Infinity)).toBe('Never');
    expect(formatTimeHuman(-Infinity)).toBe('Never');
  });

  it('should handle absurdly large values', () => {
    const veryLarge = 1e30; // Extremely large number of seconds (way more than threshold)
    expect(formatTimeHuman(veryLarge)).toBe('…');
  });
});