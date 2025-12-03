import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Shield, Users, ArrowLeft } from 'lucide-react';
import { PageContainer, PageHeader } from './ui/PageContainer';
import { Card, Button } from './ui';

/**
 * Admin Users Page - Central hub for user management
 * Contains links to User Tracking and Permissions Management
 */
const AdminUsers: React.FC = () => {
  const navigate = useNavigate();

  const userManagementTools = [
    {
      id: 'user-tracking',
      title: 'User Activity Dashboard',
      description: 'Monitor user activity, track engagement metrics, and view detailed user analytics.',
      icon: UserCheck,
      route: '/user-tracking',
      features: [
        'Track user login activity',
        'Monitor engagement metrics',
        'View user profiles',
        'Analyze usage patterns'
      ]
    },
    {
      id: 'permissions',
      title: 'Permissions Management',
      description: 'Configure user roles, assign permissions, and manage access control.',
      icon: Shield,
      route: '/admin/permissions',
      features: [
        'Assign admin roles',
        'Configure access levels',
        'Manage permissions',
        'Control feature access'
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
        icon={<Users className="w-6 h-6 text-brand-dark-green" />}
        title="User Management"
        subtitle="Manage user accounts, activity tracking, and permissions"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {userManagementTools.map((tool) => {
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

export default AdminUsers;
