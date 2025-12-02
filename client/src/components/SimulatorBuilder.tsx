import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { SimpleLoading } from './ui/SimpleLoading';
import { SimulatorResults } from './SimulatorResults';
import axios from 'axios';
import { environment } from '../config/environment';

interface PriceRange {
  min: number;
  max: number;
}

interface SimulatorRecommendations {
  launch_monitors: any[];
  projectors: any[];
  hitting_mats: any[];
  impact_screens: any[];
  computers: any[];
  software: any[];
  valid_combinations: any[];
  room_width_note: string;
  total_combinations_found: number;
  price_ranges: {
    launch_monitors: PriceRange;
    projectors: PriceRange;
    hitting_mats: PriceRange;
    impact_screens: PriceRange;
    computers: PriceRange;
    software: PriceRange;
  };
  min_budget_utilization: number;
  input: {
    ceiling: number;
    width: number;
    depth: number;
    budget: number;
  };
}

type Priority = 'low' | 'medium' | 'high';

interface CategoryPriorities {
  launch_monitor: Priority;
  projector: Priority;
  hitting_mat: Priority;
  impact_screen: Priority;
  computer: Priority;
}

export const SimulatorBuilder: React.FC = () => {
  const [formData, setFormData] = useState({
    ceiling: '10',
    width: '15',
    depth: '20',
    budget: '10000',
    minBudgetUtilization: '75'
  });

  const [priorities, setPriorities] = useState<CategoryPriorities>({
    launch_monitor: 'high',
    projector: 'medium',
    hitting_mat: 'low',
    impact_screen: 'medium',
    computer: 'medium'
  });

  const [results, setResults] = useState<SimulatorRecommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePriorityChange = (category: keyof CategoryPriorities, priority: Priority) => {
    setPriorities(prev => ({ ...prev, [category]: priority }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(
        `${environment.apiBaseUrl}/simulator/recommendations`,
        {
          ceiling: parseFloat(formData.ceiling),
          width: parseFloat(formData.width),
          depth: parseFloat(formData.depth),
          budget: parseFloat(formData.budget),
          minBudgetUtilization: parseFloat(formData.minBudgetUtilization) / 100,
          priorities: priorities
        }
      );

      setResults(response.data);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.response?.data?.error || 'Failed to fetch recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      ceiling: '10',
      width: '15',
      depth: '20',
      budget: '10000',
      minBudgetUtilization: '75'
    });
    setPriorities({
      launch_monitor: 'high',
      projector: 'medium',
      hitting_mat: 'low',
      impact_screen: 'medium',
      computer: 'medium'
    });
    setResults(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-brand-dark-green mb-2">
          Golf Simulator Builder
        </h1>
        <p className="text-gray-600">
          Find the perfect golf simulator setup for your space and budget
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Input Form */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <h2 className="text-2xl font-bold text-brand-dark-green mb-6">
            Room Dimensions & Budget
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Input
                label="Ceiling Height (feet)"
                type="number"
                step="0.5"
                min="7"
                max="20"
                value={formData.ceiling}
                onChange={(e) => handleInputChange('ceiling', e.target.value)}
                required
                placeholder="10"
              />

              <Input
                label="Room Width (feet)"
                type="number"
                step="0.5"
                min="8"
                max="30"
                value={formData.width}
                onChange={(e) => handleInputChange('width', e.target.value)}
                required
                placeholder="15"
              />

              <Input
                label="Room Depth (feet)"
                type="number"
                step="0.5"
                min="10"
                max="40"
                value={formData.depth}
                onChange={(e) => handleInputChange('depth', e.target.value)}
                required
                placeholder="20"
              />

              <Input
                label="Total Budget ($)"
                type="number"
                step="100"
                min="1000"
                max="100000"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                required
                placeholder="10000"
              />
            </div>

            {/* Budget Utilization Slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Budget Utilization: {formData.minBudgetUtilization}%
              </label>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={formData.minBudgetUtilization}
                onChange={(e) => handleInputChange('minBudgetUtilization', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50% - More options</span>
                <span>95% - Best value</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Only show setups that use at least {formData.minBudgetUtilization}% of your budget.
                Higher values filter out under-budget combinations.
              </p>
            </div>

            {/* Category Priorities */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                What's most important to you?
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                Set your priorities for each category. High priority = best quality options, Low priority = budget options.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'launch_monitor' as const, label: 'Launch Monitor', icon: '🎯' },
                  { key: 'projector' as const, label: 'Projector', icon: '📽️' },
                  { key: 'hitting_mat' as const, label: 'Hitting Mat', icon: '🟢' },
                  { key: 'impact_screen' as const, label: 'Impact Screen', icon: '🎬' },
                  { key: 'computer' as const, label: 'Computer', icon: '💻' }
                ].map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      {icon} {label}
                    </span>
                    <div className="flex gap-1">
                      {(['low', 'medium', 'high'] as const).map(priority => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => handlePriorityChange(key, priority)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            priorities[key] === priority
                              ? priority === 'high'
                                ? 'bg-green-600 text-white'
                                : priority === 'medium'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {priority === 'low' ? 'Budget' : priority === 'medium' ? 'Mid' : 'Best'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="flex-1 md:flex-initial"
              >
                {loading ? 'Finding Recommendations...' : 'Get Recommendations'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </Button>
            </div>
          </form>

          {/* Quick Tips */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-brand-dark-green mb-3">💡 Quick Tips</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• <strong>Minimum space:</strong> 10' ceiling × 11' width × 13' depth</li>
              <li>• <strong>Optimal space:</strong> 10' ceiling × 16' width × 20' depth</li>
              <li>• <strong>Budget tiers:</strong> Entry ($3K-$7K) | Mid ($7K-$15K) | Premium ($15K+)</li>
              <li>• <strong>Room width:</strong> Determines if you can accommodate both left and right-handed players</li>
            </ul>
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card variant="elevated" padding="lg" className="text-center">
            <SimpleLoading />
            <p className="mt-4 text-gray-600">
              Analyzing {formData.ceiling}' × {formData.width}' × {formData.depth}' space
              with ${parseFloat(formData.budget).toLocaleString()} budget...
            </p>
          </Card>
        )}

        {/* Results */}
        {!loading && results && (
          <SimulatorResults
            results={results}
            onNewSearch={handleReset}
          />
        )}
      </div>
    </div>
  );
};
