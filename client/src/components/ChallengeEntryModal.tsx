import React, { useState } from 'react';
import { DollarSign, CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { enterChallenge, type WeeklyChallenge } from '../services/api';
import { Modal, ModalHeader, ModalContent, ModalFooter, Button, Input, Textarea, Select, Alert } from './ui';
import type { SelectOption } from './ui';

interface ChallengeEntryModalProps {
  challenge: WeeklyChallenge;
  onClose: () => void;
  onSuccess: () => void;
}

const ChallengeEntryModal: React.FC<ChallengeEntryModalProps> = ({
  challenge,
  onClose,
  onSuccess
}) => {
  const [paymentMethod, setPaymentMethod] = useState('Venmo');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setSubmitting(true);

    try {
      await enterChallenge(challenge.id, {
        payment_method: paymentMethod,
        payment_amount: challenge.entry_fee,
        payment_notes: paymentNotes
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error entering challenge:', err);
      toast.error(err.response?.data?.error || 'Failed to enter challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const paymentOptions: SelectOption[] = [
    { value: 'Venmo', label: 'Venmo' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Check', label: 'Check' },
    { value: 'Zelle', label: 'Zelle' },
    { value: 'PayPal', label: 'PayPal' },
    { value: 'Other', label: 'Other' }
  ];

  return (
    <Modal open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Enter Challenge</h3>
              <p className="text-sm text-gray-500">{challenge.challenge_name}</p>
            </div>
          </div>
        </ModalHeader>

        <ModalContent>
          <div className="space-y-6">
            {/* Entry Fee Info */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">Entry Fee</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ${Number(challenge.entry_fee).toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 50% goes to Closest to Pin payout</p>
                <p>• 50% rolls over to grow the challenge pot</p>
                <p>• Hole-in-One wins the entire pot!</p>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={paymentOptions}
                required
              />
            </div>

            {/* Payment Notes/Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Details (optional)
              </label>
              <Textarea
                rows={3}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="E.g., Venmo username, confirmation number, or other payment details..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Include your payment username or any reference number to help track your payment
              </p>
            </div>

            {/* Important Notice */}
            <Alert variant="error">
              <AlertCircle className="w-4 h-4" />
              <div className="text-sm">
                <strong>Important:</strong> Please complete your payment to the organizer using your selected method.
                You must submit a photo of your ball position on the designated hole to be eligible for prizes.
              </div>
            </Alert>
          </div>
        </ModalContent>

        <ModalFooter>
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            loading={submitting}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Confirm Entry
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default ChallengeEntryModal;
