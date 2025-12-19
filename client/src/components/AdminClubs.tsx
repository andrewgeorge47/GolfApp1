import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Calendar, Building2, AlertCircle, ArrowLeft } from 'lucide-react';
import { PageContainer, PageHeader } from './ui/PageContainer';
import { Card, Button, Badge } from './ui';

/**
 * Admin Clubs Page - Central hub for club management
 * Contains links to Club Creation and Booking Management
 */
const AdminClubs: React.FC = () => {
  const navigate = useNavigate();

  const clubManagementTools = [
    {
      id: 'club-creation',
      title: 'Club Creation & Management',
      description: 'Create new golf clubs and configure club settings and membership data.',
      icon: Home,
      route: '/admin/club-management',
      isNew: false,
      features: [
        'Create new golf clubs',
        'Configure club settings',
        'Manage club data',
        'Set up booking systems'
      ]
    },
    {
      id: 'booking-settings',
      title: 'Booking Management',
      description: 'Configure simulator booking settings and manage reservation systems.',
      icon: Calendar,
      route: '/booking-settings',
      features: [
        'Configure time slots',
        'Set booking rules',
        'Manage simulator availability',
        'View reservations'
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
        icon={<Building2 className="w-6 h-6 text-brand-dark-green" />}
        title="Club Management"
        subtitle="Create and manage golf clubs and their booking systems"
      />


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {clubManagementTools.map((tool) => {
          const IconComponent = tool.icon;

          return (
            <Card
              key={tool.id}
              variant="dark-elevated"
              padding="lg"
              interactive={!tool.isNew}
              onClick={() => !tool.isNew && navigate(tool.route)}
            >
              <div className="flex items-start space-x-4 mb-4">
                <div className="p-3 bg-brand-neon-green/10 rounded-lg flex-shrink-0">
                  <IconComponent className="w-6 h-6 text-brand-neon-green" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold">{tool.title}</h3>
                    {tool.isNew && (
                      <Badge variant="warning" size="sm">Coming Soon</Badge>
                    )}
                  </div>
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
                  if (!tool.isNew) navigate(tool.route);
                }}
                variant={tool.isNew ? "outline" : "neon"}
                className="w-full"
                disabled={tool.isNew}
              >
                {tool.isNew ? 'Coming Soon' : 'Open Dashboard'}
              </Button>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default AdminClubs;
