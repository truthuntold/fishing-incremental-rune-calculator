# Rune Calculator MVP

A production-ready React + TypeScript + Vite application for calculating time-to-obtain runes based on RPS (Runes per Second) and Rune Luck multipliers.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` to use the calculator.

## 📋 Features

- **Smart Input Parsing**: Supports raw integers (`1000000`), scientific notation (`1e9`), and suffix forms (`1.5k`, `499.99T`, `10M`)
- **Real-time Calculations**: Time-to-obtain calculations with RPS × Luck multiplier
- **Advanced Filtering**: Text search, hide instant runes (<1s), and sort by difficulty
- **Persistent State**: Settings saved to localStorage
- **Custom Calculator**: Calculate time for any "1 in N" chance
- **Responsive Design**: Dark mode support with Tailwind CSS
- **Accessibility**: WCAG AA compliant with proper focus management

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with dark mode
- **Testing**: Vitest + React Testing Library + @testing-library/jest-dom
- **Linting**: ESLint with TypeScript rules
- **Build Tool**: Vite with SWC for fast refresh

## 📊 Data Configuration

The app loads data from JSON files that can be configured via environment variables:

```bash
# .env.local (optional)
VITE_RUNES_URL=https://your-domain.com/runes.json
VITE_SCALES_URL=https://your-domain.com/scales.json
```

**Defaults**: `/runes.json` and `/scales.json` from the `public/` directory.

### Runes Data Schema (`public/runes.json`)

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-08-30T00:00:00.000Z",
  "scalesVersion": "1.0",
  "runes": [
    {
      "id": "mythical",
      "name": "Mythical",
      "category": "Starter",
      "rarity": "Mythical",
      "hidden": false,
      "sourceNote": "Starter Rune — coins not capped",
      "chance": { "type": "oneInN", "n": 1500, "display": "1/1.5k" },
      "boosts": [
        { "type": "coins", "mode": "multiplier", "cap": null, "capStatus": "notCapped" }
      ]
    }
  ]
}
```

### Scales Configuration (`public/scales.json`)

```json
{
  "": 1,
  "K": 1000,
  "M": 1000000,
  "B": 1000000000,
  "T": 1000000000000,
  "Qd": 1000000000000000,
  "Qn": 1000000000000000000,
  "Sx": 1000000000000000000000,
  "Sp": 1000000000000000000000000
}
```

**Parser Features**:
- Case-insensitive (`k`, `K` both work)
- Decimal support (`2.5M`, `499.99T`)
- Scientific notation (`1e9`, `1.5E6`)
- Ambiguity warnings for conflicting suffixes

## 🧮 Core Calculation Logic

Time to obtain a rune:

```
timeSeconds = chanceN / (rps × luck)
```

- **RPS ≤ 0** or **Luck ≤ 0** → `Infinity` (with warning banner)
- **Results < 1s** → "Instant"
- **Next Target**: First rune with `1s ≤ time < 3600s` gets a badge

## 📝 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
```

## ✅ Adding New Runes

Edit `public/runes.json` manually following the schema:

```json
{
  "id": "unique-id",
  "name": "Display Name",
  "category": "Starter" | "Magical" | "Space",
  "rarity": "Optional rarity text",
  "hidden": true | false,
  "sourceNote": "Description text",
  "chance": { 
    "type": "oneInN", 
    "n": 1000000, 
    "display": "1/1M" 
  },
  "boosts": [
    {
      "type": "coins",
      "mode": "multiplier",
      "cap": null | number,
      "capStatus": "notCapped" | "capped" | "notMaxedYet" | "unknown"
    }
  ]
}
```

**Common Pitfalls**:
- Ensure `chance.n` is a valid number (no suffixes)
- Use consistent category values
- Include both `cap: null` and `capStatus: "notCapped"` for uncapped boosts

## 🧪 Testing

The test suite covers:

**Core Logic** (`src/core/rune-core.test.ts`):
- Number parsing: `"1.5k"` → `1500`, `"1e9"` → `1e9`
- Time calculations: `rps=10, luck=2, N=1e6` → `50,000s`
- Filtering and sorting logic

**UI Components** (`src/features/rune-calculator/RuneCalculatorPanel.test.tsx`):
- Input parsing and warnings
- Filter functionality
- Hide instant toggle
- Sort order changes
- Custom calculator

**Utilities** (`src/lib/formatters.test.ts`):
- Time formatting: `3665s` → `"1 hour, 1 minute, 5 seconds"`

## 🎯 Acceptance Criteria Checklist

- ✅ Loads local/remote JSON with configurable URLs
- ✅ Correct calculations: `RPS=10, Luck=2, N=1e6` → `50,000s` (`≈ 13h 53m 20s`)
- ✅ Hidden badge display and rarity information
- ✅ Hide Instant filter (`<1s`)
- ✅ Deterministic filtering and sorting
- ✅ localStorage persistence (`rps`, `luck`, `filter`, `sort`)
- ✅ All tests pass
- ✅ Lint-free codebase
- ✅ Production build succeeds

## 🔒 Security

- No `eval()` or `dangerouslySetInnerHTML`
- CORS-aware fetch with graceful error handling  
- Input sanitization for all user data
- No hardcoded secrets or sensitive information

## 🌟 Future Enhancements

- **Charts**: Time progression visualization
- **Virtualization**: Handle 1000+ runes efficiently  
- **BigNumber**: Support for numbers > 1e306
- **Export**: CSV/JSON export functionality
- **Themes**: Additional color schemes