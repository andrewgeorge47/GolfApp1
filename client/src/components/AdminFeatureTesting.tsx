import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FlaskConical,
  CheckCircle,
  Clock,
  Calendar,
  Users,
  Trophy,
  Target,
  Settings,
  Code,
  Smartphone,
  Plus,
  Edit3,
  Trash2,
  Play
} from 'lucide-react';
import { PageContainer, PageHeader } from './ui/PageContainer';
import { Card, Badge, Button, Modal, ModalHeader, ModalContent, ModalFooter, Input, Select, Textarea, ConfirmationDialog, SimpleLoading } from './ui';
import { getFeatureTests, createFeatureTest, updateFeatureTest, deleteFeatureTest, type FeatureTest } from '../services/api';
import { toast } from 'react-toastify';

/**
 * Admin Feature Testing Page - Full CRUD
 * Create, Read, Update, and Delete features for testing tracking
 */

// Map categories to icons
const CATEGORY_ICON_MAP: Record<string, any> = {
  'Admin': Settings,
  'Play': Target,
  'Compete': Trophy,
  'Improve': Users,
};

const ICON_MAP: Record<string, any> = {
  Calendar,
  Settings,
  Trophy,
  Smartphone,
  Users,
  Target,
  Code,
};

const AdminFeatureTesting: React.FC = () => {
  const navigate = useNavigate();
  const [features, setFeatures] = useState<FeatureTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureTest | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FeatureTest | null>(null);
  const [formData, setFormData] = useState<Partial<FeatureTest>>({
    name: '',
    description: '',
    status: 'coming-soon',
    category: 'Admin',
    icon: 'Settings',
    route: '',
    target_date: ''
  });

  // Fetch features on mount
  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const response = await getFeatureTests();
      setFeatures(response.data);
    } catch (err) {
      console.error('Error fetching features:', err);
      toast.error('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (feature?: FeatureTest) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData(feature);
    } else {
      setEditingFeature(null);
      setFormData({
        name: '',
        description: '',
        status: 'coming-soon',
        category: 'Admin',
        icon: 'Settings',
        route: '',
        target_date: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFeature(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate route for admin-testing and live-beta
    if ((formData.status === 'admin-testing' || formData.status === 'live-beta') && !formData.route) {
      toast.error('Route is required for Admin Testing and Live Beta features');
      return;
    }

    // Auto-assign icon based on category
    const icon = CATEGORY_ICON_MAP[formData.category || 'Admin']?.name || 'Settings';
    const dataToSave = { ...formData, icon };

    try {
      if (editingFeature) {
        // Update existing feature
        const response = await updateFeatureTest(editingFeature.id, dataToSave);
        setFeatures(features.map(f =>
          f.id === editingFeature.id ? response.data : f
        ));
        toast.success('Feature updated successfully');
      } else {
        // Create new feature
        const response = await createFeatureTest(dataToSave);
        setFeatures([...features, response.data]);
        toast.success('Feature created successfully');
      }

      handleCloseModal();
    } catch (err) {
      console.error('Error saving feature:', err);
      toast.error('Failed to save feature');
    }
  };

  const handleDelete = (feature: FeatureTest) => {
    setDeleteConfirm(feature);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteFeatureTest(deleteConfirm.id);
        setFeatures(features.filter(f => f.id !== deleteConfirm.id));
        setDeleteConfirm(null);
        toast.success('Feature deleted successfully');
      } catch (err) {
        console.error('Error deleting feature:', err);
        toast.error('Failed to delete feature');
      }
    }
  };

  const getStatusBadge = (status: FeatureTest['status']) => {
    switch (status) {
      case 'admin-testing':
        return <Badge variant="warning" size="sm">Admin Testing</Badge>;
      case 'live-beta':
        return <Badge variant="success" size="sm">Live Beta</Badge>;
      case 'coming-soon':
        return <Badge variant="info" size="sm">Coming Soon</Badge>;
    }
  };

  const renderFeatureCard = (feature: FeatureTest) => {
    // Use category-based icon or fallback to stored icon
    const IconComponent = CATEGORY_ICON_MAP[feature.category] || ICON_MAP[feature.icon] || Calendar;

    return (
      <Card
        key={feature.id}
        variant="default"
        padding="md"
        className="hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="p-2 bg-brand-dark-green/10 rounded-lg flex-shrink-0">
            <IconComponent className="w-5 h-5 text-brand-dark-green" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {feature.name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {feature.description}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusBadge(feature.status)}
              </div>
            </div>

            {/* Metadata */}
            {feature.target_date && (
              <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Target: {new Date(feature.target_date).toLocaleDateString()}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-4">
              <div>
                {feature.route && feature.status !== 'coming-soon' && (
                  <Button
                    variant="neon"
                    size="sm"
                    onClick={() => navigate(feature.route!)}
                  >
                    Test
                    <Play className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenModal(feature)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(feature)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const readyForTesting = features.filter(f => f.status === 'admin-testing' || f.status === 'live-beta');
  const comingSoon = features.filter(f => f.status === 'coming-soon');

  if (loading) {
    return (
      <PageContainer>
        <SimpleLoading text="Loading features..." />
      </PageContainer>
    );
  }

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
        icon={<FlaskConical className="w-6 h-6 text-brand-dark-green" />}
        title="Feature Testing"
        subtitle="Track features ready for testing and upcoming releases"
      />

      {/* Floating Action Button */}
      <button
        onClick={() => handleOpenModal()}
        className="fixed bottom-8 right-8 w-14 h-14 bg-brand-dark-green hover:bg-brand-dark-green/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
        title="Add Feature"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Ready for Testing Section */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Ready for Testing
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Features that are complete and ready for user testing
          </p>
          <div className="mt-2">
            <Badge variant="success" size="sm">
              {readyForTesting.length} Features
            </Badge>
          </div>
        </div>

        {readyForTesting.length === 0 ? (
          <Card variant="default" padding="lg" className="text-center">
            <p className="text-gray-500">No features ready for testing yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Feature
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {readyForTesting.map(feature => renderFeatureCard(feature))}
          </div>
        )}
      </div>

      {/* Coming Soon Section */}
      <div className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Coming Soon
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Features currently in development with estimated release dates
          </p>
          <div className="mt-2">
            <Badge variant="info" size="sm">
              {comingSoon.length} Features
            </Badge>
          </div>
        </div>

        {comingSoon.length === 0 ? (
          <Card variant="default" padding="lg" className="text-center">
            <p className="text-gray-500">No upcoming features planned.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {comingSoon.map(feature => renderFeatureCard(feature))}
          </div>
        )}
      </div>

      {/* Feature Form Modal */}
      <Modal open={showModal} onClose={handleCloseModal} size="lg">
        <ModalHeader>
          {editingFeature ? 'Edit Feature' : 'Add New Feature'}
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feature Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter feature name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the feature"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as FeatureTest['status'] })}
                  options={[
                    { value: 'admin-testing', label: 'Admin Testing' },
                    { value: 'live-beta', label: 'Live Beta' },
                    { value: 'coming-soon', label: 'Coming Soon' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  options={[
                    { value: 'Admin', label: 'Admin' },
                    { value: 'Play', label: 'Play' },
                    { value: 'Compete', label: 'Compete' },
                    { value: 'Improve', label: 'Improve' }
                  ]}
                />
              </div>
            </div>

            {/* Conditionally show route field for admin-testing and live-beta */}
            {(formData.status === 'admin-testing' || formData.status === 'live-beta') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route *
                </label>
                <Input
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  placeholder="e.g., /admin/users"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The app route where users can access this feature
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Date
              </label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="neon" onClick={handleSave}>
            {editingFeature ? 'Save Changes' : 'Add Feature'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Feature"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </PageContainer>
  );
};

export default AdminFeatureTesting;
