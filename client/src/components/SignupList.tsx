import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicSignups, getUserRegistrations, type Signup, type SignupRegistration } from '../services/api';
import { useAuth } from '../AuthContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { PageHeader } from './ui/PageHeader';
import {
  Calendar,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

const SignupList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRegistrations, setUserRegistrations] = useState<SignupRegistration[]>([]);

  useEffect(() => {
    fetchSignups();
    if (user) {
      fetchUserRegistrations();
    }
  }, [user]);

  const fetchSignups = async () => {
    try {
      setLoading(true);
      const response = await getPublicSignups();
      setSignups(response.data);
    } catch (error) {
      console.error('Error fetching signups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRegistrations = async () => {
    try {
      const response = await getUserRegistrations();
      setUserRegistrations(response.data);
    } catch (error) {
      console.error('Error fetching user registrations:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
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

  const isRegistrationOpen = (signup: Signup) => {
    if (signup.status !== 'open') return false;

    const now = new Date();
    if (signup.registration_opens_at && new Date(signup.registration_opens_at) > now) {
      return false;
    }
    if (signup.registration_closes_at && new Date(signup.registration_closes_at) < now) {
      return false;
    }
    if (signup.max_registrations && signup.total_registrations &&
        signup.total_registrations >= signup.max_registrations) {
      return false;
    }

    return true;
  };

  const getRegistrationStatus = (signup: Signup) => {
    if (signup.status !== 'open') {
      return { text: 'Not Available', icon: XCircle, color: 'text-gray-500' };
    }

    const now = new Date();
    if (signup.registration_opens_at && new Date(signup.registration_opens_at) > now) {
      return { text: 'Opens Soon', icon: Clock, color: 'text-yellow-600' };
    }
    if (signup.registration_closes_at && new Date(signup.registration_closes_at) < now) {
      return { text: 'Closed', icon: XCircle, color: 'text-red-600' };
    }
    if (signup.max_registrations && signup.total_registrations &&
        signup.total_registrations >= signup.max_registrations) {
      return { text: 'Full', icon: XCircle, color: 'text-red-600' };
    }

    return { text: 'Open', icon: CheckCircle, color: 'text-green-600' };
  };

  const getUserRegistrationForSignup = (signupId: number) => {
    return userRegistrations.find(reg => reg.signup_id === signupId);
  };

  const getButtonText = (signup: Signup) => {
    const userReg = getUserRegistrationForSignup(signup.id);

    if (userReg) {
      if (userReg.status === 'paid') {
        return 'Registered ✓';
      } else {
        return 'Complete Payment';
      }
    }

    return isRegistrationOpen(signup) ? 'Register Now' : 'View Details';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Signups"
        subtitle="Register for upcoming events and tournaments"
        icon={Calendar}
      />

      {signups.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Events Available</h3>
          <p className="text-gray-600">Check back later for upcoming events and tournaments.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {signups.map((signup) => {
            const registrationStatus = getRegistrationStatus(signup);
            const StatusIcon = registrationStatus.icon;
            const canRegister = isRegistrationOpen(signup);
            const userReg = getUserRegistrationForSignup(signup.id);
            const buttonText = getButtonText(signup);

            return (
              <Card key={signup.id} className="flex flex-col hover:shadow-lg transition-shadow">
                {signup.image_url && (
                  <img
                    src={signup.image_url}
                    alt={signup.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{signup.title}</h3>
                    <div className="flex gap-2">
                      {getStatusBadge(signup.status)}
                      {userReg && (
                        <Badge variant={userReg.status === 'paid' ? 'success' : 'warning'}>
                          {userReg.status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {signup.description && (
                    <p className="text-gray-600 mb-4 flex-1 line-clamp-3">
                      {signup.description}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="font-semibold">{formatCurrency(signup.entry_fee)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-5 h-5" />
                      <span className="text-sm">
                        {signup.total_registrations || 0}
                        {signup.max_registrations ? ` / ${signup.max_registrations}` : ''} registered
                      </span>
                    </div>

                    {signup.registration_closes_at && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-5 h-5" />
                        <span className="text-sm">
                          Closes {formatDate(signup.registration_closes_at)}
                        </span>
                      </div>
                    )}

                    <div className={`flex items-center gap-2 ${registrationStatus.color}`}>
                      <StatusIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">{registrationStatus.text}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <Button
                      onClick={() => navigate(`/signups/${signup.id}`)}
                      className="w-full"
                      variant={
                        userReg?.status === 'paid' ? 'primary' :
                        userReg?.status === 'pending' ? 'neon' :
                        canRegister ? 'primary' : 'outline'
                      }
                    >
                      {buttonText}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SignupList;
