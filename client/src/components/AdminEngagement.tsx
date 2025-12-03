import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trophy, Target, Swords, ArrowLeft } from 'lucide-react';
import { PageContainer, PageHeader } from './ui/PageContainer';
import { Card, Button } from './ui';

/**
 * Admin Engagement Page - Central hub for engagement features
 * Contains links to Signups, Tournaments, Challenges, and Leagues
 */
const AdminEngagement: React.FC = () => {
  const navigate = useNavigate();

  const engagementTools = [
    {
      id: 'signups',
      title: 'Event Signups',
      description: 'Create and manage event signups, track registrations, and organize participants.',
      icon: Calendar,
      route: '/admin/signups',
      features: [
        'Create signup forms',
        'Track registrations',
        'Manage participants',
        'Export signup data'
      ]
    },
    {
      id: 'tournaments',
      title: 'Tournament Management',
      description: 'Create tournaments, manage brackets, and track competitive events.',
      icon: Trophy,
      route: '/tournament-management',
      features: [
        'Configure tournaments',
        'Manage brackets',
        'Track scores',
        'Handle registration'
      ]
    },
    {
      id: 'challenges',
      title: 'Challenge Creation',
      description: 'Design weekly challenges and manage ongoing competitive challenges.',
      icon: Target,
      route: '/challenges/admin',
      features: [
        'Create challenges',
        'Set rules and scoring',
        'Monitor participation',
        'Award winners'
      ]
    },
    {
      id: 'leagues',
      title: 'League Management',
      description: 'Create and manage golf leagues, organize play, and track standings.',
      icon: Swords,
      route: '/admin/league-management',
      features: [
        'Configure leagues',
        'Manage schedules',
        'Track standings',
        'Handle registration'
      ]
    }
  ];

  return (
    <PageContainer>
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Admin Dashboard</span>
      </button>

      <PageHeader
        icon={<Trophy className="w-6 h-6 text-brand-dark-green" />}
        title="Engagement Management"
        subtitle="Create and manage events, tournaments, challenges, and leagues"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {engagementTools.map((tool) => {
          const IconComponent = tool.icon;

          return (
            <Card
              key={tool.id}
              variant="dark-elevated"
              padding="lg"
              interactive
              onClick={() => navigate(tool.route)}
            >
              <div className="flex items-start space-x-4 mb-4">
                <div className="p-3 bg-brand-neon-green/10 rounded-lg flex-shrink-0">
                  <IconComponent className="w-6 h-6 text-brand-neon-green" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">{tool.title}</h3>
                  <p className="text-white/70 text-sm">{tool.description}</p>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {tool.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-white/60 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-neon-green mt-1.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(tool.route);
                }}
                variant="neon"
                className="w-full"
              >
                Open Dashboard
              </Button>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default AdminEngagement;
