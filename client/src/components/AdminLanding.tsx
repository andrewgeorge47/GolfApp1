import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, Trophy, Settings, FlaskConical } from 'lucide-react';
import { PageContainer, PageHeader } from './ui/PageContainer';
import { Card, Button, Badge } from './ui';

/**
 * Admin Landing Page - Central hub for all administrative functions
 * Four main sections: Users, Clubs, Engagement, and Feature Testing
 */
const AdminLanding: React.FC = () => {
  const navigate = useNavigate();

  const adminSections = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Track user activity and manage permissions',
      icon: Users,
      route: '/admin/users',
      features: ['User Tracking Dashboard', 'Permissions Management']
    },
    {
      id: 'clubs',
      title: 'Club Management',
      description: 'Create clubs and configure booking settings',
      icon: Building2,
      route: '/admin/clubs',
      features: ['Club Creation', 'Booking Settings'],
      badge: 'Coming Soon'
    },
    {
      id: 'engagement',
      title: 'Engagement',
      description: 'Manage tournaments, leagues, challenges, and events',
      icon: Trophy,
      route: '/admin/engagement',
      features: ['Signups', 'Tournaments', 'Challenges', 'Leagues']
    },
    {
      id: 'feature-testing',
      title: 'Feature Testing',
      description: 'View features ready for testing and upcoming releases',
      icon: FlaskConical,
      route: '/admin/feature-testing',
      features: ['Ready for Testing', 'Coming Soon', 'Beta Features']
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        icon={<Settings className="w-6 h-6 text-brand-dark-green" />}
        title="Admin Dashboard"
        subtitle="Manage users, clubs, and engagement across the platform"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {adminSections.map((section) => {
          const IconComponent = section.icon;

          return (
            <Card
              key={section.id}
              variant="dark-elevated"
              padding="lg"
              interactive
              onClick={() => navigate(section.route)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-brand-neon-green/10 rounded-lg">
                  <IconComponent className="w-8 h-8 text-brand-neon-green" />
                </div>
                {section.badge && (
                  <Badge variant="success" size="sm">{section.badge}</Badge>
                )}
              </div>

              <h3 className="text-xl font-bold mb-2">{section.title}</h3>
              <p className="text-white/70 text-sm mb-4">{section.description}</p>

              <ul className="space-y-2 mb-6">
                {section.features.map((feature, idx) => (
                  <li key={idx} className="text-sm text-white/60 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-neon-green mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline-neon"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(section.route);
                }}
              >
                Manage {section.title.split(' ')[0]}
              </Button>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default AdminLanding;
