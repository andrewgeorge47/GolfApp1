import React from 'react';
import { Trophy, Calendar, Users, Sparkles } from 'lucide-react';
import { Card } from './ui/Card';

interface ComingSoonProps {
  title?: string;
  subtitle?: string;
  description?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({
  title = "Compete",
  subtitle = "Coming Soon",
  description = "We're building something exciting! Event signups and competitions will be available soon for all members."
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full p-8 md:p-12 text-center">
        {/* Icon Header */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="relative">
            <Trophy className="w-12 h-12 md:w-16 md:h-16 text-brand-neon-green" />
            <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-2 -right-2 animate-pulse" />
          </div>
          <Calendar className="w-12 h-12 md:w-16 md:h-16 text-brand-dark-green" />
          <Users className="w-12 h-12 md:w-16 md:h-16 text-brand-neon-green" />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          {title}
        </h1>

        {/* Subtitle Badge */}
        <div className="inline-flex items-center gap-2 bg-brand-neon-green/10 text-brand-dark-green px-4 py-2 rounded-full mb-6">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold text-lg">{subtitle}</span>
          <Sparkles className="w-4 h-4" />
        </div>

        {/* Description */}
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          {description}
        </p>

        {/* Feature Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-4 bg-gray-50 rounded-lg">
            <Trophy className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Tournaments</h3>
            <p className="text-sm text-gray-600">Compete in league events</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <Calendar className="w-8 h-8 text-brand-dark-green mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Easy Signups</h3>
            <p className="text-sm text-gray-600">Register with one click</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <Users className="w-8 h-8 text-brand-neon-green mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Team Events</h3>
            <p className="text-sm text-gray-600">Join with your friends</p>
          </div>
        </div>

        {/* Beta Notice */}
        <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800">
            <span className="font-semibold">🧪 Want early access?</span> This feature is currently available to beta testers.
            Check back soon for the full release!
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ComingSoon;
