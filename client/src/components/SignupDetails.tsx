import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getSignup,
  getSignupRegistrations,
  getSignupStats,
  verifySignupPayment,
  refundSignupRegistration,
  deleteSignup,
  updateSignup,
  deleteSignupRegistration,
  manuallyRegisterUser,
  updateSignupRegistration,
  getPublicRegistrationTemplates,
  getUsers,
  type Signup,
  type SignupRegistration,
  type SignupStats,
  type RegistrationFormTemplate
} from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Table } from './ui/Table';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Modal, ModalHeader, ModalContent, ModalFooter } from './ui/Modal';
import { PageHeaderWithBack } from './ui/PageHeader';
import { MemberMultiSelect } from './MemberMultiSelect';
import {
  ArrowLeft,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  RefreshCw,
  Edit2,
  Trash2,
  Settings,
  UserPlus,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';

const SignupDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [signup, setSignup] = useState<Signup | null>(null);
  const [registrations, setRegistrations] = useState<SignupRegistration[]>([]);
  const [stats, setStats] = useState<SignupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditRegistrationModal, setShowEditRegistrationModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [editingRegistration, setEditingRegistration] = useState<SignupRegistration | null>(null);
  const [registrationTemplate, setRegistrationTemplate] = useState<RegistrationFormTemplate | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [memberNamesMap, setMemberNamesMap] = useState<Record<number, string>>({});
  const [registrationFormData, setRegistrationFormData] = useState<{
    status: string;
    payment_status: string;
    payment_method: string;
    payment_amount: number;
    admin_notes: string;
  }>({
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'manual',
    payment_amount: 0,
    admin_notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchSignupDetails();
    }
  }, [id]);

  const fetchSignupDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [signupRes, registrationsRes, statsRes, usersRes] = await Promise.all([
        getSignup(parseInt(id)),
        getSignupRegistrations(parseInt(id)),
        getSignupStats(parseInt(id)),
        getUsers()
      ]);

      setSignup(signupRes.data);
      setRegistrations(registrationsRes.data);
      setStats(statsRes.data);

      // Build member names map
      const namesMap: Record<number, string> = {};
      usersRes.data.forEach(user => {
        namesMap[user.member_id] = `${user.first_name} ${user.last_name}`;
      });
      setMemberNamesMap(namesMap);

      // Fetch registration template if signup has one
      if (signupRes.data.registration_form_template) {
        try {
          const templatesResponse = await getPublicRegistrationTemplates();
          const template = templatesResponse.data.find(
            t => t.template_key === signupRes.data.registration_form_template ||
                 t.id.toString() === signupRes.data.registration_form_template
          );
          if (template) {
            setRegistrationTemplate(template);
          }
        } catch (err) {
          console.error('Error fetching registration template:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching signup details:', error);
      window.alert('Failed to load signup details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (registrationId: number) => {
    if (!id || !window.confirm('Are you sure you want to manually verify this payment?')) return;

    try {
      setProcessingPayment(registrationId);
      await verifySignupPayment(parseInt(id), registrationId);
      await fetchSignupDetails();
      window.alert('Payment verified successfully');
    } catch (error) {
      console.error('Error verifying payment:', error);
      window.alert('Failed to verify payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleRefundPayment = async (registrationId: number) => {
    if (!id || !window.confirm('Are you sure you want to refund this payment? This action cannot be undone.')) return;

    try {
      setProcessingPayment(registrationId);
      await refundSignupRegistration(parseInt(id), registrationId);
      await fetchSignupDetails();
      window.alert('Payment refunded successfully');
    } catch (error) {
      console.error('Error refunding payment:', error);
      window.alert('Failed to refund payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleDeleteSignup = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this signup? This action cannot be undone and will remove all registrations.')) return;

    try {
      await deleteSignup(parseInt(id));
      toast.success('Signup deleted successfully');
      navigate('/admin/signups');
    } catch (error: any) {
      console.error('Error deleting signup:', error);
      toast.error(error.response?.data?.error || 'Failed to delete signup');
    }
  };

  const handleChangeStatus = async () => {
    if (!id || !newStatus) return;

    try {
      await updateSignup(parseInt(id), { status: newStatus as any });
      toast.success('Status updated successfully');
      setShowStatusModal(false);
      await fetchSignupDetails();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const openStatusModal = () => {
    setNewStatus(signup?.status || 'draft');
    setShowStatusModal(true);
  };

  const handleAddUsers = async () => {
    if (!id || selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    try {
      const promises = selectedUsers.map(userId =>
        manuallyRegisterUser(parseInt(id), {
          user_id: userId,
          status: 'paid',
          payment_status: 'completed',
          payment_method: 'manual',
          payment_amount: signup?.entry_fee || 0,
          admin_notes: 'Manually added by admin'
        })
      );

      await Promise.all(promises);
      setShowAddUserModal(false);
      setSelectedUsers([]);
      await fetchSignupDetails();
      toast.success(`Successfully added ${selectedUsers.length} user(s)`);
    } catch (error: any) {
      console.error('Error adding users:', error);
      toast.error(error.response?.data?.error || 'Failed to add users');
    }
  };

  const handleDeleteRegistration = async (registrationId: number, userName: string) => {
    if (!id || !window.confirm(`Are you sure you want to remove ${userName} from this signup?`)) return;

    try {
      await deleteSignupRegistration(parseInt(id), registrationId);
      await fetchSignupDetails();
      toast.success('Registration removed successfully');
    } catch (error: any) {
      console.error('Error deleting registration:', error);
      toast.error(error.response?.data?.error || 'Failed to remove registration');
    }
  };

  const openEditRegistrationModal = (registration: SignupRegistration) => {
    setEditingRegistration(registration);
    setRegistrationFormData({
      status: registration.status,
      payment_status: registration.payment_status || 'pending',
      payment_method: registration.payment_method || 'manual',
      payment_amount: registration.payment_amount || signup?.entry_fee || 0,
      admin_notes: ''
    });
    setShowEditRegistrationModal(true);
  };

  const handleUpdateRegistration = async () => {
    if (!id || !editingRegistration) return;

    try {
      await updateSignupRegistration(parseInt(id), editingRegistration.id, registrationFormData);
      setShowEditRegistrationModal(false);
      setEditingRegistration(null);
      await fetchSignupDetails();
      toast.success('Registration updated successfully');
    } catch (error: any) {
      console.error('Error updating registration:', error);
      toast.error(error.response?.data?.error || 'Failed to update registration');
    }
  };

  const toggleRowExpansion = (registrationId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(registrationId)) {
        newSet.delete(registrationId);
      } else {
        newSet.add(registrationId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
      paid: 'success',
      pending: 'warning',
      cancelled: 'default',
      refunded: 'info',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      completed: 'success',
      pending: 'warning',
      failed: 'error',
      refunded: 'default',
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
    return new Date(dateString).toLocaleString();
  };

  const formatRegistrationData = (registrationData: any, questionId: string, format: 'short' | 'full' = 'full') => {
    if (!registrationData || !registrationData[questionId]) return 'N/A';

    const value = registrationData[questionId];

    // Handle arrays (checkboxes, member_multiselect)
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None';

      // Check if it's member IDs (numbers)
      if (typeof value[0] === 'number') {
        // For member multiselect, show user names
        const names = value.map(id => memberNamesMap[id] || `User #${id}`);

        if (format === 'short' && names.length > 2) {
          return `${names.slice(0, 2).join(', ')}, +${names.length - 2} more`;
        }

        return names.join(', ');
      }

      // For checkbox arrays, join with commas
      return value.join(', ');
    }

    // Handle simple values (text, radio)
    return value;
  };

  // Helper to extract role preference from registration data
  const getRolePreference = (registration: SignupRegistration) => {
    if (!registrationTemplate || !registration.registration_data) return 'N/A';

    // Look for common captain/player question patterns
    const roleQuestion = registrationTemplate.questions.find(q =>
      q.question.toLowerCase().includes('captain') ||
      q.question.toLowerCase().includes('player') ||
      q.question.toLowerCase().includes('role')
    );

    if (roleQuestion) {
      return formatRegistrationData(registration.registration_data, roleQuestion.id, 'short');
    }
    return 'N/A';
  };

  // Helper to extract team members from registration data
  const getTeamMembers = (registration: SignupRegistration) => {
    if (!registrationTemplate || !registration.registration_data) return 'N/A';

    // Look for member_multiselect questions (team selection)
    const teamQuestion = registrationTemplate.questions.find(q =>
      q.type === 'member_multiselect'
    );

    if (teamQuestion) {
      return formatRegistrationData(registration.registration_data, teamQuestion.id, 'short');
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  if (!signup) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Signup not found</p>
        <Button onClick={() => navigate('/admin/signups')} className="mt-4">
          Back to Signups
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeaderWithBack
        title={signup.title}
        subtitle={signup.description}
        onBack={() => navigate('/admin/signups')}
        action={
          <div className="flex items-center gap-3">
            {getStatusBadge(signup.status)}
            <div className="flex gap-2">
              <Button
                onClick={openStatusModal}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Change Status
              </Button>
              <Button
                onClick={() => navigate(`/admin/signups`, { state: { editSignupId: signup.id } })}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
              <Button
                onClick={handleDeleteSignup}
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats?.total_revenue || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Registrations</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_registrations || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.paid_count || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.pending_count || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Signup Details */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Signup Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Entry Fee</p>
            <p className="font-medium">{formatCurrency(signup.entry_fee)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Max Registrations</p>
            <p className="font-medium">
              {signup.max_registrations || 'Unlimited'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Registration Opens</p>
            <p className="font-medium">{formatDate(signup.registration_opens_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Registration Closes</p>
            <p className="font-medium">{formatDate(signup.registration_closes_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Stripe Enabled</p>
            <p className="font-medium">{signup.stripe_enabled ? 'Yes' : 'No'}</p>
          </div>
          {signup.venmo_url && (
            <div>
              <p className="text-sm text-gray-600">Venmo URL</p>
              <a
                href={signup.venmo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                View Venmo
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Registrations Table */}
      <Card>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Registrations</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Users
            </Button>
            <Button
              onClick={fetchSignupDetails}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <th className="w-10"></th>
              <th>Name</th>
              <th>Club</th>
              <th>Role</th>
              <th>Team Members</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No registrations yet
                </td>
              </tr>
            ) : (
              registrations.map((registration) => {
                const isExpanded = expandedRows.has(registration.id);
                return (
                  <React.Fragment key={registration.id}>
                    <tr className="hover:bg-gray-50">
                      <td>
                        <button
                          onClick={() => toggleRowExpansion(registration.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title={isExpanded ? "Collapse details" : "Expand details"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </td>
                      <td>
                        <div className="font-medium text-gray-900">
                          {registration.first_name && registration.last_name
                            ? `${registration.first_name} ${registration.last_name}`
                            : 'Unknown User'}
                        </div>
                        {registration.email_address && (
                          <div className="text-sm text-gray-500">
                            {registration.email_address}
                          </div>
                        )}
                      </td>
                      <td className="text-sm text-gray-700">
                        {registration.club || 'N/A'}
                      </td>
                      <td className="text-sm text-gray-700">
                        {getRolePreference(registration)}
                      </td>
                      <td className="text-sm text-gray-700 max-w-xs">
                        <div className="truncate" title={getTeamMembers(registration)}>
                          {getTeamMembers(registration)}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(registration.status)}
                          <span className="text-xs text-gray-600">
                            {formatCurrency(registration.payment_amount || 0)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {registration.status === 'pending' &&
                           registration.payment_method === 'venmo' && (
                            <Button
                              onClick={() => handleVerifyPayment(registration.id)}
                              variant="outline"
                              size="sm"
                              disabled={processingPayment === registration.id}
                            >
                              {processingPayment === registration.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Verify
                                </>
                              )}
                            </Button>
                          )}
                          {registration.status === 'paid' &&
                           registration.payment_status === 'completed' && (
                            <Button
                              onClick={() => handleRefundPayment(registration.id)}
                              variant="outline"
                              size="sm"
                              disabled={processingPayment === registration.id}
                            >
                              {processingPayment === registration.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4" />
                                  Refund
                                </>
                              )}
                            </Button>
                          )}
                          <button
                            onClick={() => openEditRegistrationModal(registration)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Registration"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRegistration(
                              registration.id,
                              `${registration.first_name} ${registration.last_name}`
                            )}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove Registration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-6">
                              {/* Payment Details */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                  Payment Details
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-gray-600">Payment Status:</span>
                                    <span className="text-sm font-medium">
                                      {getPaymentStatusBadge(registration.payment_status || 'pending')}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-gray-600">Payment Method:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {registration.payment_method || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-gray-600">Amount:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatCurrency(registration.payment_amount || 0)}
                                    </span>
                                  </div>
                                  {registration.payment_reference && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600">Reference:</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {registration.payment_reference}
                                      </span>
                                    </div>
                                  )}
                                  {registration.payment_date && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600">Payment Date:</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {formatDate(registration.payment_date)}
                                      </span>
                                    </div>
                                  )}
                                  {registration.verified_by_name && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600">Verified By:</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {registration.verified_by_name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Registration Details */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                  Registration Details
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-gray-600">User ID:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {registration.user_id}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-gray-600">Registered:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatDate(registration.registered_at)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-gray-600">Last Updated:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatDate(registration.updated_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Registration Form Responses - Full Display */}
                            {registrationTemplate?.questions && registrationTemplate.questions.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                  Registration Form (Full Details)
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  {registrationTemplate.questions.map((question) => (
                                    <div key={question.id} className="bg-white p-3 rounded border border-gray-200">
                                      <p className="text-xs text-gray-600 mb-1">{question.question}</p>
                                      <p className="text-sm font-medium text-gray-900">
                                        {formatRegistrationData(registration.registration_data, question.id, 'full')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>

      {/* Change Status Modal */}
      <Modal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        size="sm"
      >
        <ModalHeader>Change Signup Status</ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Status: <Badge variant="info">{signup.status}</Badge>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Status Guide:</strong>
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1">
                <li><strong>Draft:</strong> Not visible to users</li>
                <li><strong>Open:</strong> Accepting registrations</li>
                <li><strong>Closed:</strong> No longer accepting registrations</li>
                <li><strong>Cancelled:</strong> Event cancelled</li>
                <li><strong>Archived:</strong> Completed and archived</li>
              </ul>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            onClick={() => setShowStatusModal(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangeStatus}
            disabled={!newStatus || newStatus === signup.status}
          >
            Update Status
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Users Modal */}
      <Modal
        open={showAddUserModal}
        onClose={() => {
          setShowAddUserModal(false);
          setSelectedUsers([]);
        }}
        size="md"
      >
        <ModalHeader>Add Users to Signup</ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select users to manually add to this signup. They will be marked as paid.
            </p>
            <MemberMultiSelect
              selectedMembers={selectedUsers}
              onChange={setSelectedUsers}
              restrictToClub={false}
              required={false}
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            onClick={() => {
              setShowAddUserModal(false);
              setSelectedUsers([]);
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddUsers}
            disabled={selectedUsers.length === 0}
          >
            Add {selectedUsers.length > 0 ? `${selectedUsers.length} ` : ''}User{selectedUsers.length !== 1 ? 's' : ''}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Registration Modal */}
      <Modal
        open={showEditRegistrationModal}
        onClose={() => {
          setShowEditRegistrationModal(false);
          setEditingRegistration(null);
        }}
        size="md"
      >
        <ModalHeader>
          Edit Registration - {editingRegistration?.first_name} {editingRegistration?.last_name}
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Status
                </label>
                <select
                  value={registrationFormData.status}
                  onChange={(e) => setRegistrationFormData({
                    ...registrationFormData,
                    status: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  value={registrationFormData.payment_status}
                  onChange={(e) => setRegistrationFormData({
                    ...registrationFormData,
                    payment_status: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={registrationFormData.payment_method}
                  onChange={(e) => setRegistrationFormData({
                    ...registrationFormData,
                    payment_method: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                >
                  <option value="manual">Manual</option>
                  <option value="stripe">Stripe</option>
                  <option value="venmo">Venmo</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={registrationFormData.payment_amount}
                  onChange={(e) => setRegistrationFormData({
                    ...registrationFormData,
                    payment_amount: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes
              </label>
              <textarea
                value={registrationFormData.admin_notes}
                onChange={(e) => setRegistrationFormData({
                  ...registrationFormData,
                  admin_notes: e.target.value
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                placeholder="Add notes about this update..."
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            onClick={() => {
              setShowEditRegistrationModal(false);
              setEditingRegistration(null);
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button onClick={handleUpdateRegistration}>
            Update Registration
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default SignupDetails;
