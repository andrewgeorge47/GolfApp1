import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getSignup,
  getSignupRegistrations,
  getSignupStats,
  verifySignupPayment,
  refundSignupRegistration,
  type Signup,
  type SignupRegistration,
  type SignupStats
} from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Table } from './ui/Table';
import { Badge } from './ui/Badge';
import { PageHeaderWithBack } from './ui/PageHeader';
import {
  ArrowLeft,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  RefreshCw
} from 'lucide-react';

const SignupDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [signup, setSignup] = useState<Signup | null>(null);
  const [registrations, setRegistrations] = useState<SignupRegistration[]>([]);
  const [stats, setStats] = useState<SignupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);

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
        action={getStatusBadge(signup.status)}
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
          <Button
            onClick={fetchSignupDetails}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
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
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default SignupDetails;
