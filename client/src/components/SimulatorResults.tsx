import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Tabs } from './ui/Tabs';

interface PriceRange {
  min: number;
  max: number;
}

interface SimulatorCombination {
  launch_monitor: {
    name: string;
    price: number;
    technology: string;
    placement: string;
    purchase_url: string;
  };
  projector: {
    name: string;
    price: number;
    throw_ratio: number;
    max_image_size: number;
    purchase_url: string;
  };
  hitting_mat: {
    name: string;
    price: number;
    rating: number;
    purchase_url: string;
  };
  impact_screen: {
    name: string;
    price: number;
    dimensions: string;
    material: string;
    purchase_url: string;
  };
  computer: {
    name: string;
    price: number;
    processor: string;
    graphics_card: string;
    performance_tier: string;
    purchase_url: string;
  };
  recommended_software: {
    name: string;
    price: number;
    pricing_model: string;
    purchase_url: string;
  } | null;
  total_price: number;
  total_rating: number;
  budget_remaining: number;
}

interface SimulatorResultsProps {
  results: {
    launch_monitors: any[];
    projectors: any[];
    hitting_mats: any[];
    impact_screens: any[];
    computers: any[];
    software: any[];
    valid_combinations: SimulatorCombination[];
    room_width_note: string;
    total_combinations_found: number;
    price_ranges?: {
      launch_monitors: PriceRange;
      projectors: PriceRange;
      hitting_mats: PriceRange;
      impact_screens: PriceRange;
      computers: PriceRange;
      software: PriceRange;
    };
    min_budget_utilization?: number;
    input: {
      ceiling: number;
      width: number;
      depth: number;
      budget: number;
    };
  };
  onNewSearch: () => void;
}

export const SimulatorResults: React.FC<SimulatorResultsProps> = ({
  results,
  onNewSearch
}) => {
  const [selectedTab, setSelectedTab] = useState<string>('combinations');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Budget allocation bar component with standardized scale
  const BudgetAllocationBar: React.FC<{
    price: number;
    totalBudget: number;
    color: string;
    label: string;
  }> = ({ price, totalBudget, color, label }) => {
    const percentage = (price / totalBudget) * 100;

    return (
      <div className="mb-3">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-medium text-gray-700">{label}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-gray-900">{formatCurrency(price)}</span>
            <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
          </div>
        </div>
        <div className="relative h-6 bg-gray-100 rounded overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-300 flex items-center justify-end pr-2`}
            style={{ width: `${percentage}%` }}
          >
            {percentage > 15 && (
              <span className="text-xs font-medium text-white">
                {percentage.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 45) return 'text-green-600';
    if (rating >= 40) return 'text-blue-600';
    if (rating >= 35) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 35) return <Badge variant="success">Excellent</Badge>;
    if (rating >= 30) return <Badge variant="info">Great</Badge>;
    if (rating >= 25) return <Badge variant="warning">Good</Badge>;
    return <Badge variant="default">Basic</Badge>;
  };

  const tabs = [
    { id: 'combinations', label: `Complete Setups (${results.valid_combinations.length})` },
    { id: 'launch-monitors', label: `Launch Monitors (${results.launch_monitors.length})` },
    { id: 'projectors', label: `Projectors (${results.projectors.length})` },
    { id: 'hitting-mats', label: `Hitting Mats (${results.hitting_mats.length})` },
    { id: 'impact-screens', label: `Impact Screens (${results.impact_screens.length})` },
    { id: 'computers', label: `Computers (${results.computers.length})` },
    { id: 'software', label: `Software (${results.software.length})` }
  ];

  return (
    <div className="space-y-6">
      {/* Room Width Note */}
      {results.room_width_note && (
        <Card
          variant="outlined"
          padding="md"
          className={`${
            results.input.width < 11
              ? 'border-red-500 bg-red-50'
              : results.input.width < 13
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-blue-500 bg-blue-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {results.input.width < 11 ? '⚠️' : results.input.width < 13 ? '⚡' : '✅'}
            </span>
            <div>
              <h3 className="font-semibold mb-1">Room Width Analysis</h3>
              <p className="text-sm">{results.room_width_note}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="elevated" padding="md">
          <div className="text-sm text-gray-600">Your Budget</div>
          <div className="text-2xl font-bold text-brand-dark-green">
            {formatCurrency(results.input.budget)}
          </div>
          {results.min_budget_utilization && (
            <div className="text-xs text-gray-500 mt-1">
              Min {(results.min_budget_utilization * 100).toFixed(0)}% utilized
            </div>
          )}
        </Card>

        <Card variant="elevated" padding="md">
          <div className="text-sm text-gray-600">Room Size</div>
          <div className="text-2xl font-bold text-brand-dark-green">
            {results.input.ceiling}' × {results.input.width}' × {results.input.depth}'
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="text-sm text-gray-600">Complete Setups Found</div>
          <div className="text-2xl font-bold text-brand-dark-green">
            {results.valid_combinations.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Top rated combinations
          </div>
        </Card>

        <Card variant="elevated" padding="md">
          <div className="text-sm text-gray-600">Total Combinations</div>
          <div className="text-2xl font-bold text-gray-700">
            {results.total_combinations_found.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Filtered by budget use
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card variant="elevated" padding="none">
        <Tabs
          tabs={tabs}
          value={selectedTab}
          onChange={setSelectedTab}
          variant="pill"
        />

        <div className="p-6">
          {/* Complete Combinations */}
          {selectedTab === 'combinations' && (
            <div className="space-y-6">
              {results.valid_combinations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-600 mb-4">
                    No complete simulator setups found within your budget and room constraints.
                  </p>
                  <p className="text-gray-500 mb-6">
                    Try increasing your budget or adjusting your room dimensions.
                  </p>
                  <Button variant="primary" onClick={onNewSearch}>
                    Adjust Search
                  </Button>
                </div>
              ) : (
                results.valid_combinations.map((combo, index) => (
                  <Card
                    key={index}
                    variant="outlined"
                    padding="lg"
                    className="hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-brand-dark-green">
                          Setup #{index + 1}
                        </h3>
                        <div className="flex gap-2 mt-2">
                          {getRatingBadge(combo.total_rating)}
                          <Badge variant="default">
                            Rating: {combo.total_rating.toFixed(1)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-brand-dark-green">
                          {formatCurrency(combo.total_price)}
                        </div>
                        <div className="text-sm text-green-600">
                          {formatCurrency(combo.budget_remaining)} remaining
                        </div>
                      </div>
                    </div>

                    {/* Budget Allocation Visualization */}
                    <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span>💰</span>
                        Budget Breakdown
                        <span className="ml-auto text-xs font-normal text-gray-600">
                          All bars scaled to total budget
                        </span>
                      </h4>
                      <BudgetAllocationBar
                        price={combo.launch_monitor.price}
                        totalBudget={results.input.budget}
                        color="bg-blue-600"
                        label="🎯 Launch Monitor"
                      />
                      <BudgetAllocationBar
                        price={combo.projector.price}
                        totalBudget={results.input.budget}
                        color="bg-purple-600"
                        label="📽️ Projector"
                      />
                      <BudgetAllocationBar
                        price={combo.hitting_mat.price}
                        totalBudget={results.input.budget}
                        color="bg-green-600"
                        label="🟢 Hitting Mat"
                      />
                      <BudgetAllocationBar
                        price={combo.impact_screen.price}
                        totalBudget={results.input.budget}
                        color="bg-orange-600"
                        label="🎬 Impact Screen"
                      />
                      <BudgetAllocationBar
                        price={combo.computer.price}
                        totalBudget={results.input.budget}
                        color="bg-red-600"
                        label="💻 Computer"
                      />
                      {combo.recommended_software && (
                        <BudgetAllocationBar
                          price={combo.recommended_software.price}
                          totalBudget={results.input.budget}
                          color="bg-indigo-600"
                          label="🎮 Software"
                        />
                      )}
                      <div className="mt-4 pt-3 border-t border-gray-300">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-medium text-gray-700">Total Allocated</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-brand-dark-green">
                              {formatCurrency(combo.total_price)}
                            </span>
                            <span className="text-xs text-gray-600">
                              ({((combo.total_price / results.input.budget) * 100).toFixed(1)}% of budget)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Launch Monitor */}
                      <div className="border-l-4 border-blue-500 pl-4">
                        <div className="text-xs text-gray-500 uppercase mb-1">Launch Monitor</div>
                        <div className="font-semibold">{combo.launch_monitor.name}</div>
                        <div className="text-sm text-gray-600">
                          {combo.launch_monitor.technology} • {combo.launch_monitor.placement}
                        </div>
                        <div className="text-sm font-bold text-blue-600 mt-1">
                          {formatCurrency(combo.launch_monitor.price)}
                        </div>
                      </div>

                      {/* Projector */}
                      <div className="border-l-4 border-purple-500 pl-4">
                        <div className="text-xs text-gray-500 uppercase mb-1">Projector</div>
                        <div className="font-semibold">{combo.projector.name}</div>
                        <div className="text-sm text-gray-600">
                          Throw Ratio: {combo.projector.throw_ratio} • {combo.projector.max_image_size}"
                        </div>
                        <div className="text-sm font-bold text-purple-600 mt-1">
                          {formatCurrency(combo.projector.price)}
                        </div>
                      </div>

                      {/* Hitting Mat */}
                      <div className="border-l-4 border-green-500 pl-4">
                        <div className="text-xs text-gray-500 uppercase mb-1">Hitting Mat</div>
                        <div className="font-semibold">{combo.hitting_mat.name}</div>
                        <div className="text-sm text-gray-600">
                          Rating: {combo.hitting_mat.rating}/10
                        </div>
                        <div className="text-sm font-bold text-green-600 mt-1">
                          {formatCurrency(combo.hitting_mat.price)}
                        </div>
                      </div>

                      {/* Impact Screen */}
                      <div className="border-l-4 border-orange-500 pl-4">
                        <div className="text-xs text-gray-500 uppercase mb-1">Impact Screen</div>
                        <div className="font-semibold">{combo.impact_screen.name}</div>
                        <div className="text-sm text-gray-600">
                          {combo.impact_screen.dimensions} • {combo.impact_screen.material}
                        </div>
                        <div className="text-sm font-bold text-orange-600 mt-1">
                          {formatCurrency(combo.impact_screen.price)}
                        </div>
                      </div>

                      {/* Computer */}
                      <div className="border-l-4 border-red-500 pl-4">
                        <div className="text-xs text-gray-500 uppercase mb-1">Computer</div>
                        <div className="font-semibold">{combo.computer.name}</div>
                        <div className="text-sm text-gray-600">
                          {combo.computer.graphics_card} • {combo.computer.performance_tier}
                        </div>
                        <div className="text-sm font-bold text-red-600 mt-1">
                          {formatCurrency(combo.computer.price)}
                        </div>
                      </div>

                      {/* Software Recommendation */}
                      {combo.recommended_software && (
                        <div className="border-l-4 border-indigo-500 pl-4">
                          <div className="text-xs text-gray-500 uppercase mb-1">Compatible Software</div>
                          <div className="font-semibold">
                            {combo.recommended_software.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {combo.recommended_software.pricing_model}
                          </div>
                          <div className="text-sm font-bold text-indigo-600 mt-1">
                            {formatCurrency(combo.recommended_software.price)}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Individual Equipment Lists */}
          {selectedTab !== 'combinations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(results as any)[selectedTab.replace('-', '_')]?.map((item: any, index: number) => (
                <Card key={index} variant="outlined" padding="md">
                  <h4 className="font-semibold mb-2">{item.name}</h4>
                  <div className="text-sm text-gray-600 space-y-1 mb-3">
                    {item.technology && <div>• {item.technology}</div>}
                    {item.processor && <div>• {item.processor}</div>}
                    {item.graphics_card && <div>• {item.graphics_card}</div>}
                    {item.performance_tier && <div>• {item.performance_tier}</div>}
                    {item.pricing_model && <div>• {item.pricing_model}</div>}
                    {item.rating && <div>• Rating: {item.rating}/10</div>}
                    {item.score && <div>• Score: {item.score}/10</div>}
                  </div>
                  <div className="text-lg font-bold text-brand-dark-green">
                    {formatCurrency(item.price)}
                  </div>
                  {item.purchase_url && (
                    <a
                      href={item.purchase_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                    >
                      View Product →
                    </a>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button variant="primary" onClick={onNewSearch}>
          New Search
        </Button>
      </div>
    </div>
  );
};
