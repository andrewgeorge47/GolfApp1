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
  type Signup,
  type SignupRegistration,
  type SignupStats
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
  UserPlus
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
      const [signupRes, registrationsRes, statsRes] = await Promise.all([
        getSignup(parseInt(id)),
        getSignupRegistrations(parseInt(id)),
        getSignupStats(parseInt(id))
      ]);

      setSignup(signupRes.data);
      setRegistrations(registrationsRes.data);
      setStats(statsRes.data);
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
              <th>User</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Payment Status</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  No registrations yet
                </td>
              </tr>
            ) : (
              registrations.map((registration) => (
                <tr key={registration.id} className="hover:bg-gray-50">
                  <td>
                    <div className="font-medium text-gray-900">
                      {registration.first_name && registration.last_name
                        ? `${registration.first_name} ${registration.last_name}`
                        : 'Unknown User'}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {registration.user_id}
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      {registration.email_address && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{registration.email_address}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{getStatusBadge(registration.status)}</td>
                  <td>{getPaymentStatusBadge(registration.payment_status || 'pending')}</td>
                  <td className="font-medium">
                    {formatCurrency(registration.payment_amount || 0)}
                  </td>
                  <td>
                    <span className="text-sm text-gray-600">
                      {registration.payment_method || 'N/A'}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600">
                    {formatDate(registration.registered_at)}
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
              ))
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
