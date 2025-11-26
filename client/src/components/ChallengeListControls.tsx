import React from 'react';
import { Filter, SortAsc, Target } from 'lucide-react';

export type ChallengeSortOption = 'ending' | 'newest' | 'pot' | 'entries';
export type ChallengeFilterOption = 'all' | 'not_entered' | 'entered' | 'needs_submission';

interface ChallengeListControlsProps {
  sortBy: ChallengeSortOption;
  onSortChange: (sort: ChallengeSortOption) => void;
  filterBy: ChallengeFilterOption;
  onFilterChange: (filter: ChallengeFilterOption) => void;
  totalChallenges: number;
  filteredCount: number;
}

const ChallengeListControls: React.FC<ChallengeListControlsProps> = ({
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  totalChallenges,
  filteredCount
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-gray-200">
      <div className="flex items-center gap-2 text-gray-600">
        <Target className="w-5 h-5 text-indigo-500" />
        <p>
          <span className="font-semibold text-gray-900">{filteredCount}</span>
          {filteredCount !== totalChallenges && (
            <span className="text-gray-500"> of {totalChallenges}</span>
          )}
          {' '}active challenge{filteredCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as ChallengeSortOption)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            <option value="ending">Ending Soon</option>
            <option value="newest">Newest First</option>
            <option value="pot">Highest Pot</option>
            <option value="entries">Most Entries</option>
          </select>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterBy}
            onChange={(e) => onFilterChange(e.target.value as ChallengeFilterOption)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          >
            <option value="all">All Challenges</option>
            <option value="not_entered">Not Entered</option>
            <option value="entered">My Entries</option>
            <option value="needs_submission">Needs Submission</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ChallengeListControls;
