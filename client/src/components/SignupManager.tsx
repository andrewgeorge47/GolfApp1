import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getSignups,
  createSignup,
  updateSignup,
  deleteSignup,
  getPublicRegistrationTemplates,
  getSignup,
  type Signup,
  type RegistrationFormTemplate,
  type RegistrationFormQuestion
} from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Table } from './ui/Table';
import { Modal, ModalHeader, ModalContent, ModalFooter } from './ui/Modal';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { PageHeader } from './ui/PageHeader';
import { Plus, Search, Edit2, Trash2, Eye, DollarSign, Users, Calendar, FileText } from 'lucide-react';
import { toast } from 'react-toastify';

const SignupManager: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSignup, setEditingSignup] = useState<Signup | null>(null);
  const [registrationTemplates, setRegistrationTemplates] = useState<RegistrationFormTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Signup>>({
    title: '',
    description: '',
    entry_fee: 0,
    max_registrations: undefined,
    status: 'draft',
    stripe_enabled: true,
    payment_organizer: undefined,
    payment_organizer_name: '',
    payment_venmo_url: '',
    has_registration_form: false,
    registration_form_template: '',
    registration_form_data: null,
  });

  useEffect(() => {
    fetchSignups();
    fetchRegistrationTemplates();
  }, [statusFilter]);

  // Handle edit from navigation state
  useEffect(() => {
    const state = location.state as { editSignupId?: number };
    if (state?.editSignupId && signups.length > 0) {
      const signupToEdit = signups.find(s => s.id === state.editSignupId);
      if (signupToEdit) {
        openEditModal(signupToEdit);
        // Clear the state to prevent re-opening on refresh
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        // Fetch the signup if it's not in the list
        fetchAndEditSignup(state.editSignupId);
      }
    }
  }, [location.state, signups]);

  const fetchAndEditSignup = async (id: number) => {
    try {
      const response = await getSignup(id);
      openEditModal(response.data);
      navigate(location.pathname, { replace: true, state: {} });
    } catch (error) {
      console.error('Error fetching signup for edit:', error);
      toast.error('Failed to load signup for editing');
    }
  };

  const fetchRegistrationTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await getPublicRegistrationTemplates();
      setRegistrationTemplates(response.data);
    } catch (error) {
      console.error('Error fetching registration templates:', error);
      toast.error('Failed to load registration templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchSignups = async () => {
    try {
      setLoading(true);
      const response = await getSignups({
        status: statusFilter || undefined,
        search: searchTerm || undefined
      });
      setSignups(response.data);
    } catch (error) {
      console.error('Error fetching signups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchSignups();
  };

  const handleCreateSignup = async () => {
    try {
      const response = await createSignup(formData);
      setSignups([response.data, ...signups]);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating signup:', error);
      window.alert('Failed to create signup');
    }
  };

  const handleUpdateSignup = async () => {
    if (!editingSignup) return;

    try {
      const response = await updateSignup(editingSignup.id, formData);
      setSignups(signups.map(s => s.id === editingSignup.id ? response.data : s));
      setEditingSignup(null);
      resetForm();
    } catch (error) {
      console.error('Error updating signup:', error);
      window.alert('Failed to update signup');
    }
  };

  const handleDeleteSignup = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this signup?')) return;

    try {
      await deleteSignup(id);
      setSignups(signups.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting signup:', error);
      window.alert('Failed to delete signup');
    }
  };

  const openEditModal = (signup: Signup) => {
    setEditingSignup(signup);
    setFormData({
      title: signup.title,
      description: signup.description,
      entry_fee: signup.entry_fee,
      max_registrations: signup.max_registrations,
      registration_opens_at: signup.registration_opens_at,
      registration_closes_at: signup.registration_closes_at,
      status: signup.status,
      stripe_enabled: signup.stripe_enabled,
      venmo_url: signup.venmo_url,
      payment_organizer: signup.payment_organizer,
      payment_organizer_name: signup.payment_organizer_name,
      payment_venmo_url: signup.payment_venmo_url,
      confirmation_message: signup.confirmation_message,
      has_registration_form: signup.has_registration_form || false,
      registration_form_template: signup.registration_form_template || '',
      registration_form_data: signup.registration_form_data || null,
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      entry_fee: 0,
      max_registrations: undefined,
      status: 'draft',
      stripe_enabled: true,
      payment_organizer: undefined,
      payment_organizer_name: '',
      payment_venmo_url: '',
      has_registration_form: false,
      registration_form_template: '',
      registration_form_data: null,
    });
  };

  // Handle registration form template selection
  const handleRegistrationTemplateSelect = (template: RegistrationFormTemplate) => {
    setFormData(prev => ({
      ...prev,
      registration_form_template: template.template_key,
      registration_form_data: {
        name: template.name,
        description: template.description,
        questions: template.questions
      }
    }));
    toast.success(`Applied ${template.name} template`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
      open: 'success',
      draft: 'default',
      closed: 'warning',
      archived: 'info',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Signup Management"
        subtitle="Create and manage event signups"
        icon={Calendar}
        action={
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Signup
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pr-10"
              />
              <Search
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer"
                onClick={handleSearch}
              />
            </div>
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <Button onClick={handleSearch} variant="outline">
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Signups Table */}
      <Card>
        <Table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Entry Fee</th>
              <th>Registrations</th>
              <th>Revenue</th>
              <th>Capacity</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
                  </div>
                </td>
              </tr>
            ) : signups.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  No signups found. Create your first signup to get started!
                </td>
              </tr>
            ) : (
              signups.map((signup) => (
                <tr key={signup.id} className="hover:bg-gray-50">
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">{signup.title}</div>
                      {signup.description && (
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {signup.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{getStatusBadge(signup.status)}</td>
                  <td className="font-medium">{formatCurrency(signup.entry_fee)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-brand-neon-green">
                        {signup.paid_registrations || 0}
                      </span>
                      <span className="text-gray-500">
                        / {signup.total_registrations || 0} total
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-medium">
                        {formatCurrency(signup.total_revenue || 0)}
                      </span>
                    </div>
                  </td>
                  <td>
                    {signup.max_registrations ? (
                      <span className="text-gray-600">
                        {signup.total_registrations || 0} / {signup.max_registrations}
                      </span>
                    ) : (
                      <span className="text-gray-400">Unlimited</span>
                    )}
                  </td>
                  <td className="text-sm text-gray-600">
                    {formatDate(signup.created_at)}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/signups/${signup.id}`)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(signup)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSignup(signup.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={showCreateModal || editingSignup !== null}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSignup(null);
          resetForm();
        }}
        size="lg"
      >
        <ModalHeader>
          {editingSignup ? 'Edit Signup' : 'Create New Signup'}
        </ModalHeader>

        <ModalContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Summer League 2025"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide details about the event..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Fee ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.entry_fee}
                  onChange={(e) => setFormData({ ...formData, entry_fee: parseFloat(e.target.value) })}
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Registrations
                </label>
                <Input
                  type="number"
                  value={formData.max_registrations || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    max_registrations: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  placeholder="Unlimited"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Opens
                </label>
                <Input
                  type="datetime-local"
                  value={formData.registration_opens_at?.slice(0, 16) || ''}
                  onChange={(e) => setFormData({ ...formData, registration_opens_at: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Closes
                </label>
                <Input
                  type="datetime-local"
                  value={formData.registration_closes_at?.slice(0, 16) || ''}
                  onChange={(e) => setFormData({ ...formData, registration_closes_at: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Organizer
              </label>
              <select
                value={formData.payment_organizer || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  payment_organizer: e.target.value ? e.target.value as 'jeff' | 'adam' | 'other' : undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
              >
                <option value="">Select payment organizer...</option>
                <option value="jeff">Jeff Testa</option>
                <option value="adam">Adam Christopher</option>
                <option value="other">Other (Custom)</option>
              </select>
            </div>

            {formData.payment_organizer === 'other' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Organizer Name
                  </label>
                  <Input
                    type="text"
                    value={formData.payment_organizer_name || ''}
                    onChange={(e) => setFormData({ ...formData, payment_organizer_name: e.target.value })}
                    placeholder="Enter organizer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Venmo URL
                  </label>
                  <Input
                    type="text"
                    value={formData.payment_venmo_url || ''}
                    onChange={(e) => setFormData({ ...formData, payment_venmo_url: e.target.value })}
                    placeholder="https://venmo.com/..."
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmation Message
              </label>
              <textarea
                value={formData.confirmation_message || ''}
                onChange={(e) => setFormData({ ...formData, confirmation_message: e.target.value })}
                placeholder="Thanks for registering! We'll send you more details soon."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
              />
            </div>

            {/* Registration Form Settings */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-brand-dark-green" />
                <h4 className="text-lg font-semibold text-gray-900">Registration Form</h4>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="has_registration_form"
                  checked={formData.has_registration_form}
                  onChange={(e) => setFormData({ ...formData, has_registration_form: e.target.checked })}
                  className="rounded border-gray-300 text-brand-dark-green focus:ring-brand-dark-green"
                />
                <label htmlFor="has_registration_form" className="text-sm font-medium text-gray-700">
                  Enable Custom Registration Form
                </label>
              </div>

              {formData.has_registration_form && (
                <div className="space-y-4 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Template
                    </label>
                    {templatesLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-neon-green mx-auto"></div>
                      </div>
                    ) : registrationTemplates.length === 0 ? (
                      <p className="text-sm text-gray-500">No templates available. Please create one first.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {registrationTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleRegistrationTemplateSelect(template)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              formData.registration_form_template === template.template_key
                                ? 'border-brand-dark-green bg-green-50'
                                : 'border-gray-200 hover:border-brand-dark-green'
                            }`}
                          >
                            <div className="font-medium text-gray-900">{template.name}</div>
                            <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {formData.registration_form_template && formData.registration_form_data && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Preview
                      </label>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h6 className="font-medium text-gray-900 mb-3">
                          {formData.registration_form_data.name}
                        </h6>
                        {formData.registration_form_data.questions.map((question: RegistrationFormQuestion, index: number) => (
                          <div key={index} className="mb-3 text-sm">
                            <p className="font-medium text-gray-700 mb-1">
                              {question.question}
                              {question.required && <span className="text-red-500 ml-1">*</span>}
                            </p>
                            <div className="ml-4 text-gray-600">
                              {question.type === 'text' && (
                                <p className="italic">Text input{question.placeholder ? `: ${question.placeholder}` : ''}</p>
                              )}
                              {question.type === 'radio' && question.options && (
                                <div className="space-y-1">
                                  {question.options.map((option: string, i: number) => (
                                    <div key={i}>○ {option}</div>
                                  ))}
                                </div>
                              )}
                              {question.type === 'checkbox' && question.options && (
                                <div className="space-y-1">
                                  {question.options.map((option: string, i: number) => (
                                    <div key={i}>☐ {option}</div>
                                  ))}
                                </div>
                              )}
                              {question.conditional && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Shows when "{question.conditional.dependsOn}" is "{question.conditional.showWhen}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="stripe_enabled"
                checked={formData.stripe_enabled}
                onChange={(e) => setFormData({ ...formData, stripe_enabled: e.target.checked })}
                className="rounded border-gray-300 text-brand-neon-green focus:ring-brand-neon-green"
              />
              <label htmlFor="stripe_enabled" className="text-sm text-gray-700">
                Enable Stripe payments
              </label>
            </div>
          </div>
        </ModalContent>

        <ModalFooter>
          <Button
            onClick={() => {
              setShowCreateModal(false);
              setEditingSignup(null);
              resetForm();
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={editingSignup ? handleUpdateSignup : handleCreateSignup}
            disabled={!formData.title}
          >
            {editingSignup ? 'Update Signup' : 'Create Signup'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default SignupManager;
