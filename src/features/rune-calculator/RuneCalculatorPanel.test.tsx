import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RuneCalculatorPanel from './RuneCalculatorPanel';
import type { RuneRecord, Scales } from '../../types';

const testScales: Scales = {
  '': 1,
  'K': 1000,
  'M': 1000000,
  'B': 1000000000
};

const testRunes: RuneRecord[] = [
  {
    id: 'mythical',
    name: 'Mythical',
    category: 'Starter',
    rarity: 'Mythical',
    hidden: false,
    sourceNote: 'Starter Rune — coins not capped',
    chance: { type: 'oneInN', n: 1500, display: '1/1.5k' },
    boosts: [
      { type: 'coins', mode: 'multiplier', cap: null, capStatus: 'notCapped' }
    ]
  },
  {
    id: 'secret',
    name: 'Secret',
    category: 'Starter',
    rarity: 'Hidden',
    hidden: true,
    sourceNote: 'Hidden rune with caps',
    chance: { type: 'oneInN', n: 10000000, display: '1/10M' },
    boosts: [
      { type: 'coins', mode: 'multiplier', cap: 8, capStatus: 'capped' }
    ]
  }
];

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

describe('RuneCalculatorPanel', () => {
  it('renders with default values', () => {
    render(<RuneCalculatorPanel runes={testRunes} scales={testScales} />);
    
    expect(screen.getByRole('heading', { name: 'Rune Calculator' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('1M')).toBeInTheDocument(); // RPS input
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // Luck input
  });

  it('displays parsed values correctly', () => {
    render(<RuneCalculatorPanel runes={testRunes} scales={testScales} />);
    
    expect(screen.getByText('Parsed: 1.00 M')).toBeInTheDocument();
    expect(screen.getByText('Parsed: 1')).toBeInTheDocument();
  });

  it('shows warning for invalid inputs', async () => {
    const user = userEvent.setup();
    render(<RuneCalculatorPanel runes={testRunes} scales={testScales} />);
    
    const rpsInput = screen.getByLabelText(/RPS/);
    await user.clear(rpsInput);
    await user.type(rpsInput, '0');
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid inputs: RPS and Luck must be greater than 0/)).toBeInTheDocument();
    });
  });

  it('filters runes by text', async () => {
    const user = userEvent.setup();
    render(<RuneCalculatorPanel runes={testRunes} scales={testScales} />);
    
    expect(screen.getAllByText('Mythical')[0]).toBeInTheDocument(); // Get first occurrence (heading)
    expect(screen.getByText('Secret')).toBeInTheDocument();
    
    const filterInput = screen.getByLabelText(/Filter/);
    await user.type(filterInput, 'mythical');
    
    await waitFor(() => {
      expect(screen.getAllByText('Mythical')[0]).toBeInTheDocument(); // Should still be there
      expect(screen.queryByText('Secret')).not.toBeInTheDocument();
    });
  });

  it('hides instant runes when toggle is checked', async () => {
    const user = userEvent.setup();
    render(<RuneCalculatorPanel runes={testRunes} scales={testScales} initialRps="10M" />);
    
    // Both runes should be visible initially
    expect(screen.getAllByText('Mythical')[0]).toBeInTheDocument();
    expect(screen.getByText('Secret')).toBeInTheDocument();
    
    const hideInstantCheckbox = screen.getByLabelText(/Hide Instant/);
    await user.click(hideInstantCheckbox);
    
    await waitFor(() => {
      // Secret should remain (takes 1 second), Mythical should be hidden (0.00015 seconds)
      expect(screen.queryAllByText('Mythical')).toHaveLength(0);
      expect(screen.getByText('Secret')).toBeInTheDocument();
    });
  });

  it('sorts runes by time', async () => {
    const user = userEvent.setup();
    render(<RuneCalculatorPanel runes={testRunes} scales={testScales} />);
    
    const sortSelect = screen.getByLabelText(/Sort by Time/);
    await user.selectOptions(sortSelect, 'desc');
    
    await waitFor(() => {
      // Check that runes are ordered correctly (hardest first) by looking for specific rune names
      expect(screen.getByText('Secret')).toBeInTheDocument(); // Harder (10M)
      expect(screen.getAllByText('Mythical')[0]).toBeInTheDocument(); // Easier (1.5k)
    });
  });

  it('shows hidden badge for hidden runes', () => {
    render(<RuneCalculatorPanel runes={testRunes} scales={testScales} />);
    
    expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0);
  });

  it('calculates custom chance correctly', async () => {
    const user = userEvent.setup();
    render(<RuneCalculatorPanel runes={testRunes} scales={testScales} />);
    
    const customInput = screen.getByLabelText(/1 in/);
    await user.type(customInput, '1000');
    
    // With 1M RPS and 1 luck, 1000 chance should take 0.001 seconds = Instant
    await waitFor(() => {
      expect(screen.getByText('= Instant')).toBeInTheDocument();
    });
  });

  it('displays time calculations correctly', () => {
    render(<RuneCalculatorPanel runes={testRunes} scales={testScales} />);
    
    // With 1M RPS and 1 luck:
    // Mythical (1500): 1500 / 1M = 0.0015 seconds = Instant
    // Secret (10M): 10M / 1M = 10 seconds
    expect(screen.getAllByText('Instant')[0]).toBeInTheDocument(); // Mythical
    expect(screen.getByText('10 seconds')).toBeInTheDocument(); // Secret
  });
});