import React from 'react';
import { Award } from 'lucide-react';

interface SharedJackpotHeaderProps {
  amount: number;
  loading?: boolean;
}

const SharedJackpotHeader: React.FC<SharedJackpotHeaderProps> = ({ amount, loading = false }) => {
  const formatAmount = (value: number) => {
    const num = Number(value) || 0;
    return num >= 1000 ? `$${(num / 1000).toFixed(1)}k` : `$${num.toFixed(0)}`;
  };

  return (
    <div className="bg-gradient-to-r from-brand-dark-green to-brand-muted-green rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Award className="w-8 h-8 text-brand-neon-green" />
          <div>
            <div className="text-sm text-white/80 mb-1">Hole-in-One Jackpot</div>
            <div className="text-3xl font-bold text-white">
              {loading ? '...' : formatAmount(amount)}
            </div>
          </div>
        </div>
        <div className="text-right text-white/90 hidden sm:block">
          <div className="text-sm">Any ace wins</div>
          <div className="text-xs text-white/70">Shared across all challenges</div>
        </div>
      </div>
    </div>
  );
};

export default SharedJackpotHeader;
