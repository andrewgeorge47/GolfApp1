import React, { useState, useEffect } from 'react';
import {
  Link2,
  Plus,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getLeagueSignupLinks,
  createLeagueSignupLink,
  deleteLeagueSignupLink,
  getSignups,
  updateSignupLinkSync,
  type LeagueSignupLink,
  type Signup
} from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Modal, ModalHeader, ModalContent, ModalFooter } from './ui/Modal';
import { Badge } from './ui/Badge';

interface LeagueSignupLinkerProps {
  leagueId: number;
}

const LeagueSignupLinker: React.FC<LeagueSignupLinkerProps> = ({ leagueId }) => {
  const [links, setLinks] = useState<LeagueSignupLink[]>([]);
  const [availableSignups, setAvailableSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedSignupId, setSelectedSignupId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);

  useEffect(() => {
    if (leagueId) {
      loadData();
    }
  }, [leagueId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load existing links
      const linksResponse = await getLeagueSignupLinks(leagueId);
      setLinks(linksResponse.data);

      // Load available signups
      const signupsResponse = await getSignups({ status: 'open' });
      setAvailableSignups(signupsResponse.data);
    } catch (error) {
      console.error('Error loading signup links:', error);
      toast.error('Failed to load signup links');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSignup = async () => {
    if (!selectedSignupId) {
      toast.error('Please select a signup');
      return;
    }

    try {
      await createLeagueSignupLink(leagueId, { signup_id: selectedSignupId });
      toast.success('Signup linked successfully');
      setShowLinkModal(false);
      setSelectedSignupId(null);
      loadData();
    } catch (error: any) {
      console.error('Error linking signup:', error);
      toast.error(error.response?.data?.error || 'Failed to link signup');
    }
  };

  const handleUnlinkSignup = async (linkId: number, signupTitle: string) => {
    if (!window.confirm(`Are you sure you want to unlink "${signupTitle}"?`)) {
      return;
    }

    try {
      await deleteLeagueSignupLink(leagueId, linkId);
      toast.success('Signup unlinked successfully');
      loadData();
    } catch (error) {
      console.error('Error unlinking signup:', error);
      toast.error('Failed to unlink signup');
    }
  };

  const handleUpdateSync = async (linkId: number) => {
    setSyncing(linkId);
    try {
      await updateSignupLinkSync(leagueId, linkId);
      toast.success('Sync timestamp updated');
      loadData();
    } catch (error) {
      console.error('Error updating sync:', error);
      toast.error('Failed to update sync');
    } finally {
      setSyncing(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getLinkedSignupIds = () => links.map(link => link.signup_id);
  const availableToLink = availableSignups.filter(
    signup => !getLinkedSignupIds().includes(signup.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link2 className="w-8 h-8 text-brand-neon-green" />
          <div>
            <h2 className="text-2xl font-bold text-brand-black">Signup Links</h2>
            <p className="text-neutral-600">Link signup events to this league for registration management</p>
          </div>
        </div>

        <Button
          onClick={() => setShowLinkModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Link Signup</span>
        </Button>
      </div>

      {/* Linked Signups */}
      <div className="space-y-4">
        {links.length === 0 ? (
          <Card className="p-8 text-center">
            <Link2 className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">No Signups Linked</h3>
            <p className="text-neutral-600 mb-4">
              Link a signup event to this league to manage registrations and team assignments
            </p>
            <Button onClick={() => setShowLinkModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Link Your First Signup
            </Button>
          </Card>
        ) : (
          links.map((link) => (
            <Card key={link.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-brand-black">
                      {link.signup_title || `Signup #${link.signup_id}`}
                    </h3>
                    <Badge variant={link.signup_status === 'open' ? 'success' : 'default'}>
                      {link.signup_status}
                    </Badge>
                  </div>

                  {link.signup_description && (
                    <p className="text-neutral-600 mb-4">{link.signup_description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm text-neutral-600">
                        <span className="font-semibold text-brand-neon-green">
                          {link.paid_registrations || 0}
                        </span>{' '}
                        paid registrations
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm text-neutral-600">
                        {link.entry_fee ? formatCurrency(link.entry_fee) : 'Free'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm text-neutral-600">
                        Created {new Date(link.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-neutral-600">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>
                        Last synced: {formatDate(link.last_synced_at)}
                      </span>
                    </div>
                    {link.synced_by_name && (
                      <span>by {link.synced_by_name}</span>
                    )}
                    <span>
                      ({link.sync_count} sync{link.sync_count !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    onClick={() => handleUpdateSync(link.id)}
                    variant="outline"
                    size="sm"
                    disabled={syncing === link.id}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing === link.id ? 'animate-spin' : ''}`} />
                    {syncing === link.id ? 'Syncing...' : 'Mark Synced'}
                  </Button>

                  <Button
                    onClick={() => handleUnlinkSignup(link.id, link.signup_title || 'this signup')}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Link Signup Modal */}
      <Modal
        open={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setSelectedSignupId(null);
        }}
      >
        <ModalHeader>Link Signup to League</ModalHeader>

        <ModalContent>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Select a signup event to link to this league. You'll be able to view registrations
              and use registration data when managing teams.
            </p>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Select Signup *
              </label>
              <select
                value={selectedSignupId || ''}
                onChange={(e) => setSelectedSignupId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-neon-green focus:border-transparent"
              >
                <option value="">Select a signup...</option>
                {availableToLink.map((signup) => (
                  <option key={signup.id} value={signup.id}>
                    {signup.title} ({signup.status}) - {formatCurrency(signup.entry_fee || 0)}
                  </option>
                ))}
              </select>
            </div>

            {availableToLink.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  No available signups to link. All open signups are already linked to this league,
                  or there are no open signups available.
                </p>
              </div>
            )}
          </div>
        </ModalContent>

        <ModalFooter>
          <Button
            onClick={() => {
              setShowLinkModal(false);
              setSelectedSignupId(null);
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLinkSignup}
            disabled={!selectedSignupId || availableToLink.length === 0}
          >
            Link Signup
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default LeagueSignupLinker;
