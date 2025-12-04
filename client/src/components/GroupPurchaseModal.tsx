import React, { useState, useEffect } from 'react';
import { DollarSign, Info, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  WeeklyChallengeExtended,
  ChallengeType,
  createChallengePaymentIntent,
  confirmChallengeStripePayment
} from '../services/api';
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  Button,
  Alert
} from './ui';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_live_51OMksoIxApvccLawqRPtBKJIIPhLpnQREnN0ZUyPLvgodAJC1mXTUTuSdquuP1S8vX0R79MUD1u6ABTE4pbJqkhn00njjVlrNc');

interface GroupPurchaseModalProps {
  challenge: WeeklyChallengeExtended;
  challengeType?: ChallengeType;
  isReup?: boolean;
  currentGroups?: number;
  onClose: () => void;
  onSuccess: () => void;
}

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

// Inner component that uses Stripe hooks
const PaymentForm: React.FC<{
  challenge: WeeklyChallengeExtended;
  challengeType?: ChallengeType;
  isReup: boolean;
  currentGroups: number;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ challenge, challengeType, isReup, currentGroups, onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = isReup
    ? (challengeType?.default_reup_fee || 3)
    : (challenge.entry_fee || challengeType?.default_entry_fee || 5);

  const shotsPerGroup = challengeType?.shots_per_group || 5;
  const payoutConfig = challengeType?.payout_config;

  // Create payment intent when modal opens
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await createChallengePaymentIntent(challenge.id, isReup);
        setClientSecret(response.data.clientSecret);
        setPaymentIntentId(response.data.paymentIntentId);
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        setError(err.response?.data?.error || 'Failed to initialize payment');
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [challenge.id, isReup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

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
        // Confirm payment in our backend and create entry
        await confirmChallengeStripePayment(challenge.id, {
          payment_intent_id: paymentIntent.id,
          is_reup: isReup
        });

        // Silently succeed - UI updates via badge and challenge refresh
        onSuccess();
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      toast.error(err.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
      <ModalHeader>
        {isReup ? `Re-up: Group ${currentGroups + 1}` : 'Enter Challenge'}
      </ModalHeader>

      <ModalContent>
        <div className="space-y-4">
          {/* Challenge Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="font-medium text-gray-900">{challenge.challenge_name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Hole {challenge.designated_hole}
              {(challenge as any).required_distance_yards && ` • ${(challenge as any).required_distance_yards} yards`}
            </p>
          </div>

          {/* Fee Breakdown */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">
                {isReup ? 'Re-up Fee' : 'Entry Fee'}
              </span>
              <span className="text-xl font-bold text-green-600">
                ${Number(fee).toFixed(2)}
              </span>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>Includes {shotsPerGroup}-shot group</p>
              {payoutConfig && (
                <div className="mt-2 pt-2 border-t">
                  <p className="font-medium text-gray-700 mb-1">Pot Distribution:</p>
                  <ul className="space-y-1 text-xs">
                    {payoutConfig.ctp.enabled && (
                      <li>• {payoutConfig.ctp.pot_percentage}% to CTP prize pool</li>
                    )}
                    {payoutConfig.hio.enabled && (
                      <li>• {payoutConfig.hio.pot_percentage}% to HIO jackpot</li>
                    )}
                    <li>• {payoutConfig.admin_fee_percentage}% admin fee</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Stripe Card Element */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-gray-600">Loading payment form...</span>
            </div>
          ) : error && !clientSecret ? (
            <Alert variant="error">
              {error}
            </Alert>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="w-4 h-4 inline mr-2" />
                Card Details
              </label>
              <div className="border rounded-lg p-3 bg-white">
                <CardElement options={cardElementOptions} />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && clientSecret && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          {/* Info Box */}
          <Alert variant="info">
            <div className="flex gap-2">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Secure Payment</p>
                <p className="mt-1 text-sm">
                  Your payment is processed securely through Stripe.
                  Your entry will be confirmed immediately after payment.
                </p>
              </div>
            </div>
          </Alert>
        </div>
      </ModalContent>

      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="neon"
          disabled={isSubmitting || isLoading || !stripe || !clientSecret}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Pay ${Number(fee).toFixed(2)}
            </>
          )}
        </Button>
      </ModalFooter>
    </form>
  );
};

// Main component that wraps the form with Stripe Elements provider
const GroupPurchaseModal: React.FC<GroupPurchaseModalProps> = ({
  challenge,
  challengeType,
  isReup = false,
  currentGroups = 0,
  onClose,
  onSuccess
}) => {
  return (
    <Modal open={true} onClose={onClose} size="md">
      <Elements stripe={stripePromise}>
        <PaymentForm
          challenge={challenge}
          challengeType={challengeType}
          isReup={isReup}
          currentGroups={currentGroups}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </Elements>
    </Modal>
  );
};

export default GroupPurchaseModal;
