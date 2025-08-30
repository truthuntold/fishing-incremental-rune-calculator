// Data types for the rune calculator application

export interface RuneChance {
  type: 'oneInN';
  n: number;
  display: string;
}

export interface RuneBoost {
  type: string;
  mode: 'multiplier';
  cap: number | null;
  capStatus: 'notCapped' | 'capped' | 'notMaxedYet' | 'unknown';
  notes?: string[];
}

export interface RuneRecord {
  id: string;
  name: string;
  category: 'Starter' | 'Magical' | 'Space';
  rarity?: string;
  hidden: boolean;
  sourceNote: string;
  chance: RuneChance;
  boosts: RuneBoost[];
}

export interface RunesData {
  version: string;
  generatedAt: string;
  scalesVersion: string;
  runes: RuneRecord[];
}

export type Scales = Record<string, number>;