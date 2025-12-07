import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  getPublicSignup,
  registerForSignup,
  createSignupPaymentIntent,
  submitSignupVenmoPayment,
  confirmSignupStripePayment,
  checkMySignupRegistration,
  getPublicRegistrationTemplates,
  type Signup,
  type RegistrationFormTemplate
} from '../services/api';
import { RegistrationFormRenderer } from './RegistrationFormRenderer';
import { useAuth } from '../AuthContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { PageHeaderWithBack } from './ui/PageHeader';
import {
  ArrowLeft,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  ExternalLink
} from 'lucide-react';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_live_51OMksoIxApvccLawqRPtBKJIIPhLpnQREnN0ZUyPLvgodAJC1mXTUTuSdquuP1S8vX0R79MUD1u6ABTE4pbJqkhn00njjVlrNc');

// Card Element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const SignupRegistration: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [signup, setSignup] = useState<Signup | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationStep, setRegistrationStep] = useState<'details' | 'payment' | 'complete'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'venmo'>('stripe');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [venmoReference, setVenmoReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<any>(null);
  const [registrationTemplate, setRegistrationTemplate] = useState<RegistrationFormTemplate | null>(null);
  const [registrationFormData, setRegistrationFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (id) {
      loadPageData();
    }
  }, [id, user]);

  const loadPageData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch signup data and registration status in parallel
      const promises: Promise<any>[] = [
        getPublicSignup(id)
      ];

      if (user) {
        promises.push(checkMySignupRegistration(parseInt(id)));
      }

      const results = await Promise.all(promises);
      const signupResponse = results[0];
      const registrationResponse = results[1];

      setSignup(signupResponse.data);

      console.log('Signup data:', signupResponse.data);
      console.log('Registration form template:', signupResponse.data.registration_form_template);

      // Check registration status
      if (registrationResponse) {
        console.log('Registration status:', registrationResponse.data);
        setIsAlreadyRegistered(registrationResponse.data.registered);
        if (registrationResponse.data.registered) {
          setExistingRegistration(registrationResponse.data.registration);
        }
      } else {
        // User not logged in, ensure state is reset
        setIsAlreadyRegistered(false);
        setExistingRegistration(null);
      }

      // Fetch registration template if signup has one
      if (signupResponse.data.registration_form_template) {
        try {
          // Fetch all public templates
          const templatesResponse = await getPublicRegistrationTemplates();
          console.log('Available templates:', templatesResponse.data);

          // Find template by template_key (stored as string in signup)
          const template = templatesResponse.data.find(
            t => t.template_key === signupResponse.data.registration_form_template ||
                 t.id.toString() === signupResponse.data.registration_form_template
          );

          console.log('Found template:', template);

          if (template) {
            setRegistrationTemplate(template);
          } else {
            console.warn('Template not found for key:', signupResponse.data.registration_form_template);
          }
        } catch (err) {
          console.error('Error fetching registration template:', err);
          // Continue without template if it fails to load
        }
      }
    } catch (error) {
      console.error('Error loading page data:', error);
      window.alert('Failed to load signup details');
    } finally {
      setLoading(false);
    }
  };

  const validateRegistrationForm = (): boolean => {
    if (!registrationTemplate) return true;

    for (const question of registrationTemplate.questions) {
      if (question.required) {
        const value = registrationFormData[question.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          window.alert(`Please answer: ${question.question}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleRegister = async () => {
    if (!id || !user) {
      window.alert('You must be logged in to register');
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }

    // Validate registration form if template exists (only if not retrying payment)
    if (registrationTemplate && !validateRegistrationForm() && !existingRegistration) {
      return;
    }

    try {
      setSubmitting(true);

      let regId = registrationId;

      // Step 1: Register for the signup with form data (if not already registered)
      if (!existingRegistration) {
        const registerResponse = await registerForSignup(
          parseInt(id),
          registrationTemplate ? registrationFormData : undefined
        );
        regId = registerResponse.data.id;
        setRegistrationId(regId);
      } else {
        // User already has a registration, use that ID
        regId = existingRegistration.id;
        setRegistrationId(regId);
      }

      // Step 2: If payment is required and Stripe is enabled, create payment intent
      if (signup?.entry_fee && signup.entry_fee > 0 && signup.stripe_enabled && paymentMethod === 'stripe') {
        const paymentResponse = await createSignupPaymentIntent(parseInt(id));
        setClientSecret(paymentResponse.data.clientSecret);
        setRegistrationStep('payment');
      } else if (signup?.entry_fee && signup.entry_fee > 0 && paymentMethod === 'venmo') {
        // Move to Venmo payment step
        setRegistrationStep('payment');
      } else {
        // No payment required
        setRegistrationStep('complete');
      }
    } catch (error: any) {
      console.error('Error registering:', error);
      if (error.response?.data?.error) {
        window.alert(error.response.data.error);
      } else {
        window.alert('Failed to register for signup');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVenmoSubmit = async () => {
    if (!id || !venmoReference.trim()) {
      window.alert('Please enter your Venmo transaction ID');
      return;
    }

    try {
      setSubmitting(true);
      await submitSignupVenmoPayment(parseInt(id), venmoReference);
      setRegistrationStep('complete');
    } catch (error) {
      console.error('Error submitting Venmo payment:', error);
      window.alert('Failed to submit Venmo payment');
    } finally {
      setSubmitting(false);
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
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const isRegistrationOpen = () => {
    if (!signup || signup.status !== 'open') return false;

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
        <Button onClick={() => navigate('/signups')} className="mt-4">
          Back to Signups
        </Button>
      </div>
    );
  }

  if (registrationStep === 'complete') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
          <p className="text-gray-600 mb-6">
            {signup.confirmation_message || 'Thank you for registering! You will receive a confirmation email shortly.'}
          </p>
          {paymentMethod === 'venmo' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                Your registration is pending payment verification. An admin will verify your Venmo payment shortly.
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/profile')} variant="primary">
              Back to Your Profile
            </Button>
            <Button onClick={() => navigate('/signups')} variant="outline">
              View All Signups
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <PageHeaderWithBack
        title={signup.title}
        onBack={() => navigate('/signups')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signup Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-brand-neon-green" />
              <h2 className="text-xl font-semibold">About This Event</h2>
            </div>
            {signup.description && (
              <p className="text-gray-700 mb-4 leading-relaxed">{signup.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Entry Fee</p>
                  <p className="font-semibold">{formatCurrency(signup.entry_fee)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Registered</p>
                  <p className="font-semibold">
                    {signup.total_registrations || 0}
                    {signup.max_registrations ? ` / ${signup.max_registrations}` : ''}
                  </p>
                </div>
              </div>

              {signup.registration_opens_at && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Opens</p>
                    <p className="font-semibold text-sm">{formatDate(signup.registration_opens_at)}</p>
                  </div>
                </div>
              )}

              {signup.registration_closes_at && (
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Closes</p>
                    <p className="font-semibold text-sm">{formatDate(signup.registration_closes_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Payment Section */}
          {registrationStep === 'payment' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Payment</h2>

              {paymentMethod === 'stripe' && clientSecret ? (
                <Elements stripe={stripePromise}>
                  <StripePaymentForm
                    signupId={parseInt(id!)}
                    clientSecret={clientSecret}
                    onSuccess={() => setRegistrationStep('complete')}
                    amount={signup.entry_fee}
                  />
                </Elements>
              ) : paymentMethod === 'venmo' ? (
                <div className="space-y-4">
                  {/* Payment Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm font-medium mb-1">Payment Instructions:</p>
                    <ol className="text-blue-700 text-sm space-y-1">
                      <li>1. Click the Venmo link below</li>
                      <li>2. Send ${signup.entry_fee} to the organizer</li>
                      <li>3. Include your name in the payment note</li>
                      <li>4. Enter your transaction ID below</li>
                      <li>5. The organizer will mark you as paid once they confirm payment</li>
                    </ol>
                  </div>

                  {/* Payment Organizer */}
                  {signup.payment_organizer && signup.payment_organizer !== 'other' && (
                    <div className={`border rounded-lg p-3 ${
                      signup.payment_organizer === 'jeff'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <p className={`text-sm mb-2 ${
                        signup.payment_organizer === 'jeff'
                          ? 'text-green-700'
                          : 'text-blue-700'
                      }`}>
                        {signup.payment_organizer === 'jeff' ? 'Jeff Testa' : 'Adam Christopher'}
                      </p>
                      <a
                        href={signup.payment_organizer === 'jeff'
                          ? 'https://venmo.com/u/JeffTesta'
                          : 'https://venmo.com/u/NN_No10'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors ${
                          signup.payment_organizer === 'jeff'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Pay ${signup.entry_fee} on Venmo
                      </a>
                    </div>
                  )}

                  {/* Custom Payment Organizer */}
                  {signup.payment_organizer === 'other' && signup.payment_organizer_name && (
                    <div className="border rounded-lg p-3 bg-purple-50 border-purple-200">
                      <p className="text-sm mb-2 text-purple-700">
                        {signup.payment_organizer_name}
                      </p>
                      {signup.payment_venmo_url && (
                        <a
                          href={signup.payment_venmo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Pay ${signup.entry_fee} on Venmo
                        </a>
                      )}
                    </div>
                  )}

                  {/* Fallback to venmo_url if no payment organizer is set */}
                  {!signup.payment_organizer && signup.venmo_url && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <a
                        href={signup.venmo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        Open Venmo
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Venmo Transaction ID
                    </label>
                    <input
                      type="text"
                      value={venmoReference}
                      onChange={(e) => setVenmoReference(e.target.value)}
                      placeholder="Enter your Venmo transaction ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                    />
                  </div>

                  <Button
                    onClick={handleVenmoSubmit}
                    disabled={submitting || !venmoReference.trim()}
                    className="w-full"
                  >
                    {submitting ? 'Submitting...' : 'Submit Payment'}
                  </Button>
                </div>
              ) : null}
            </Card>
          )}
        </div>

        {/* Registration Card */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Registration Status</h3>

            {!user ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">You must be logged in to register.</p>
                <Button onClick={() => navigate('/login', { state: { from: location.pathname + location.search } })} className="w-full">
                  Log In
                </Button>
              </div>
            ) : isAlreadyRegistered ? (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 mb-3 ${existingRegistration?.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {existingRegistration?.status === 'paid' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {existingRegistration?.status === 'paid' ? 'Already Registered' : 'Registration Pending'}
                  </span>
                </div>

                <div className={`border rounded-lg p-4 space-y-2 ${
                  existingRegistration?.status === 'paid'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <p className={`text-sm ${
                    existingRegistration?.status === 'paid' ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {existingRegistration?.status === 'paid'
                      ? "You're registered for this event!"
                      : "Your registration is pending payment."}
                  </p>

                  {existingRegistration && (
                    <>
                      <div className={`pt-2 border-t ${
                        existingRegistration.status === 'paid' ? 'border-green-200' : 'border-yellow-200'
                      }`}>
                        <p className={`text-xs font-medium ${
                          existingRegistration.status === 'paid' ? 'text-green-700' : 'text-yellow-700'
                        }`}>
                          Payment Status:
                        </p>
                        <Badge variant={existingRegistration.status === 'paid' ? 'success' : 'warning'}>
                          {existingRegistration.status === 'paid' ? 'Payment Complete' : 'Payment Pending'}
                        </Badge>
                      </div>

                      {existingRegistration.status !== 'paid' && existingRegistration.payment_method === 'venmo' && (
                        <p className="text-xs text-yellow-700 mt-2">
                          Your Venmo payment is pending admin verification.
                        </p>
                      )}

                      {existingRegistration.payment_amount && (
                        <div className={`pt-2 border-t ${
                          existingRegistration.status === 'paid' ? 'border-green-200' : 'border-yellow-200'
                        }`}>
                          <p className={`text-xs ${
                            existingRegistration.status === 'paid' ? 'text-green-700' : 'text-yellow-700'
                          }`}>
                            Amount: {formatCurrency(existingRegistration.payment_amount)}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Show retry payment button if payment is pending and not Venmo */}
                {existingRegistration?.status !== 'paid' && existingRegistration?.payment_method !== 'venmo' && signup?.entry_fee && signup.entry_fee > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-700 font-medium">Complete Your Payment:</div>

                    {signup.stripe_enabled && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="stripe"
                            checked={paymentMethod === 'stripe'}
                            onChange={() => setPaymentMethod('stripe')}
                            className="text-brand-neon-green"
                          />
                          <CreditCard className="w-5 h-5 text-gray-600" />
                          <span className="text-sm">Credit/Debit Card</span>
                        </label>
                      </div>
                    )}

                    {(signup.venmo_url || signup.venmo_username) && (
                      <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="venmo"
                          checked={paymentMethod === 'venmo'}
                          onChange={() => setPaymentMethod('venmo')}
                          className="text-brand-neon-green"
                        />
                        <DollarSign className="w-5 h-5 text-blue-500" />
                        <span className="text-sm">Venmo</span>
                      </label>
                    )}

                    <Button
                      onClick={handleRegister}
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? 'Processing...' : 'Complete Payment'}
                    </Button>
                  </div>
                )}

                <Button onClick={() => navigate('/signups')} variant="outline" className="w-full">
                  View All Signups
                </Button>
              </div>
            ) : !isRegistrationOpen() ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Registration Closed</span>
                </div>
                <p className="text-sm text-gray-600">
                  Registration for this event is not currently available.
                </p>
              </div>
            ) : registrationStep === 'details' ? (
              <div className="space-y-4">
                {/* Registration Form (if template exists) */}
                {(() => {
                  console.log('Rendering registration step - registrationTemplate:', registrationTemplate);
                  console.log('Questions:', registrationTemplate?.questions);
                  console.log('Questions length:', registrationTemplate?.questions?.length);

                  return registrationTemplate && registrationTemplate.questions && registrationTemplate.questions.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Information</h3>
                      <RegistrationFormRenderer
                        questions={registrationTemplate.questions}
                        formData={registrationFormData}
                        onChange={(questionId, value) => {
                          console.log('Form data changed:', questionId, value);
                          setRegistrationFormData({
                            ...registrationFormData,
                            [questionId]: value
                          });
                        }}
                        userClub={user?.club}
                      />
                    </div>
                  ) : null;
                })()}

                {signup.entry_fee > 0 ? (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-xs text-blue-600 font-medium uppercase mb-1">Entry Fee</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {formatCurrency(signup.entry_fee)}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-900">
                          Select Payment Method
                        </label>
                        <span className="text-xs text-gray-500">Required</span>
                      </div>

                      <div className="space-y-2">
                        {signup.stripe_enabled && (
                          <label
                            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentMethod === 'stripe'
                                ? 'border-brand-neon-green bg-green-50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="stripe"
                              checked={paymentMethod === 'stripe'}
                              onChange={() => setPaymentMethod('stripe')}
                              className="w-4 h-4 text-brand-neon-green focus:ring-brand-neon-green"
                            />
                            <CreditCard className={`w-5 h-5 ${paymentMethod === 'stripe' ? 'text-brand-neon-green' : 'text-gray-400'}`} />
                            <div className="flex-1">
                              <p className={`font-medium ${paymentMethod === 'stripe' ? 'text-gray-900' : 'text-gray-700'}`}>
                                Credit Card
                              </p>
                              <p className="text-xs text-gray-500">Pay securely with Stripe</p>
                            </div>
                          </label>
                        )}
                        {(signup.venmo_url || signup.payment_organizer) && (
                          <label
                            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentMethod === 'venmo'
                                ? 'border-brand-neon-green bg-green-50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="venmo"
                              checked={paymentMethod === 'venmo'}
                              onChange={() => setPaymentMethod('venmo')}
                              className="w-4 h-4 text-brand-neon-green focus:ring-brand-neon-green"
                            />
                            <DollarSign className={`w-5 h-5 ${paymentMethod === 'venmo' ? 'text-brand-neon-green' : 'text-gray-400'}`} />
                            <div className="flex-1">
                              <p className={`font-medium ${paymentMethod === 'venmo' ? 'text-gray-900' : 'text-gray-700'}`}>
                                Venmo
                              </p>
                              <p className="text-xs text-gray-500">Pay via Venmo app</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <Button
                        onClick={handleRegister}
                        disabled={submitting}
                        className="w-full"
                        size="lg"
                      >
                        {submitting ? 'Processing...' : 'Continue to Payment'}
                      </Button>
                      <p className="text-xs text-center text-gray-500 mt-2">
                        You'll complete payment in the next step
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-5 h-5" />
                        <p className="font-medium">Free Event</p>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        No payment required
                      </p>
                    </div>

                    <Button
                      onClick={handleRegister}
                      disabled={submitting}
                      className="w-full"
                      size="lg"
                    >
                      {submitting ? 'Registering...' : 'Complete Registration'}
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
};

// Stripe Payment Form Component
interface StripePaymentFormProps {
  signupId: number;
  clientSecret: string;
  onSuccess: () => void;
  amount: number;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({ signupId, clientSecret, onSuccess, amount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm payment in our backend
        await confirmSignupStripePayment(signupId, paymentIntent.id);
        onSuccess();
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-600">Amount to pay</p>
        <p className="text-2xl font-bold text-gray-900">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CreditCard className="w-4 h-4 inline mr-2" />
          Card Details
        </label>
        <div className="border rounded-lg p-3 bg-white">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full"
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
};

export default SignupRegistration;
