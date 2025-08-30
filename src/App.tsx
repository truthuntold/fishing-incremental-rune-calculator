import { useState, useEffect } from 'react';
import RuneCalculatorPanel from './features/rune-calculator/RuneCalculatorPanel';
import type { RunesData, Scales } from './types';

interface LoadingState {
  runes: 'loading' | 'loaded' | 'error';
  scales: 'loading' | 'loaded' | 'error';
}

interface ErrorState {
  runes: string | null;
  scales: string | null;
}

function App() {
  const [runesData, setRunesData] = useState<RunesData | null>(null);
  const [scalesData, setScalesData] = useState<Scales | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    runes: 'loading',
    scales: 'loading'
  });
  const [errors, setErrors] = useState<ErrorState>({
    runes: null,
    scales: null
  });

  useEffect(() => {
    async function loadData() {
      // Get URLs from environment or use defaults
      const runesUrl = import.meta.env.VITE_RUNES_URL || '/runes.json';
      const scalesUrl = import.meta.env.VITE_SCALES_URL || '/scales.json';

      // Load runes data
      try {
        const runesResponse = await fetch(runesUrl);
        if (!runesResponse.ok) {
          throw new Error(`Failed to load runes: ${runesResponse.status} ${runesResponse.statusText}`);
        }
        const runes: RunesData = await runesResponse.json();
        setRunesData(runes);
        setLoading(prev => ({ ...prev, runes: 'loaded' }));
      } catch (error) {
        console.error('Error loading runes:', error);
        setErrors(prev => ({ ...prev, runes: error instanceof Error ? error.message : 'Failed to load runes data' }));
        setLoading(prev => ({ ...prev, runes: 'error' }));
      }

      // Load scales data
      try {
        const scalesResponse = await fetch(scalesUrl);
        if (!scalesResponse.ok) {
          throw new Error(`Failed to load scales: ${scalesResponse.status} ${scalesResponse.statusText}`);
        }
        const scales: Scales = await scalesResponse.json();
        setScalesData(scales);
        setLoading(prev => ({ ...prev, scales: 'loaded' }));
      } catch (error) {
        console.error('Error loading scales:', error);
        setErrors(prev => ({ ...prev, scales: error instanceof Error ? error.message : 'Failed to load scales data' }));
        setLoading(prev => ({ ...prev, scales: 'error' }));
      }
    }

    loadData();
  }, []);

  // Loading state
  if (loading.runes === 'loading' || loading.scales === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading rune calculator...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loading.runes === 'error' || loading.scales === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="text-red-700 dark:text-red-300">
              <h2 className="text-lg font-semibold mb-2">Failed to Load Data</h2>
              {errors.runes && (
                <p className="mb-2">
                  <span className="font-medium">Runes:</span> {errors.runes}
                </p>
              )}
              {errors.scales && (
                <p className="mb-2">
                  <span className="font-medium">Scales:</span> {errors.scales}
                </p>
              )}
              <p className="text-sm mt-4">
                Check your network connection or verify that the data files are available.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Successful load
  if (runesData && scalesData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RuneCalculatorPanel 
          runes={runesData.runes}
          scales={scalesData}
          initialRps="1M"
          initialLuck="1"
        />
      </div>
    );
  }

  // Fallback (shouldn't happen)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <p className="text-gray-600 dark:text-gray-400">Something went wrong...</p>
    </div>
  );
}

export default App;