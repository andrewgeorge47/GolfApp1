import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicSignups, getUserRegistrations, getChallenges, type Signup, type SignupRegistration, type WeeklyChallenge } from '../services/api';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
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
  XCircle,
  Trophy,
  Target
} from 'lucide-react';

const SignupList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRegistrations, setUserRegistrations] = useState<SignupRegistration[]>([]);
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

  const isBetaTester = hasPermission('access_beta_features');

  useEffect(() => {
    fetchSignups();
    if (user) {
      fetchUserRegistrations();
    }
    if (isBetaTester) {
      fetchChallenges();
    }
  }, [user, isBetaTester]);

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

  const fetchChallenges = async () => {
    try {
      setChallengesLoading(true);
      const response = await getChallenges({ status: 'active', limit: 3 });
      setChallenges(response.data);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setChallengesLoading(false);
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

      {/* Challenges Section */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900">CTP Challenges</h2>
          {isBetaTester && (
            <Badge variant="info" size="sm">Beta</Badge>
          )}
        </div>

        {isBetaTester ? (
          // Beta Testers - Show Active Challenges
          challengesLoading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green"></div>
            </div>
          ) : challenges.length === 0 ? (
            <Card className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Challenges</h3>
              <p className="text-gray-600 mb-4">Check back soon for new challenges!</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.map((challenge) => {
                  const isFreeChallenge = Number(challenge.entry_fee || 0) === 0;
                  console.log('SignupList Challenge:', challenge.challenge_name, {
                    entry_fee: challenge.entry_fee,
                    entry_fee_type: typeof challenge.entry_fee,
                    isFreeChallenge
                  });

                  return (
                    <Card key={challenge.id} className="flex flex-col hover:shadow-lg transition-shadow">
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-semibold text-gray-900">{challenge.challenge_name}</h3>
                          <Badge variant={challenge.status === 'active' ? 'success' : 'default'}>
                            {challenge.status}
                          </Badge>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Target className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm">Hole {challenge.designated_hole}</span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-700">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="font-semibold">
                              {isFreeChallenge
                                ? 'Free Entry'
                                : formatCurrency(challenge.entry_fee)}
                            </span>
                          </div>

                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-5 h-5" />
                          <span className="text-sm">{challenge.total_entries || 0} entries</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-5 h-5" />
                          <span className="text-sm">
                            Ends {formatDate(challenge.week_end_date)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-200">
                        <Button
                          onClick={() => navigate('/challenges')}
                          className="w-full"
                          variant="primary"
                        >
                          Enter Challenge
                        </Button>
                      </div>
                    </div>
                  </Card>
                  );
                })}
              </div>
              <div className="text-center mt-6">
                <Button
                  onClick={() => navigate('/challenges')}
                  variant="outline"
                >
                  View All Challenges
                </Button>
              </div>
            </>
          )
        ) : (
          // Regular Users - Coming Soon
          <Card className="p-12 text-center bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Coming Soon!</h3>
            <p className="text-gray-700 text-lg mb-2">
              Weekly CTP Challenges
            </p>
            <p className="text-gray-600 max-w-md mx-auto">
              Compete against other members in closest-to-the-pin challenges for prizes and bragging rights.
            </p>
            <Badge variant="warning" size="lg" className="mt-4">
              Available Soon
            </Badge>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SignupList;
