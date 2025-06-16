import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

interface PlayerProfileData {
  id: number;
  name: string;
  ranking: 'A' | 'B' | 'C' | 'D';
  avgTeamScore: number;
  skinsWon: number;
  ctpAwards: number;
}

const PlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/players/${id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch');
        }
        const data: PlayerProfileData = await res.json();
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-6">Player not found.</div>;
  }

  return (
    <div className="min-h-screen bg-green-50">
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{profile.name} Profile</h1>
        <Link to="/" className="text-green-600 hover:underline">Back</Link>
      </div>
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <div className="bg-white p-4 rounded-lg shadow flex justify-between">
          <span className="font-medium">Ranking</span>
          <span className="font-semibold">{profile.ranking}</span>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex justify-between">
          <span className="font-medium">Average Team Score</span>
          <span className="font-semibold">{profile.avgTeamScore.toFixed(1)}</span>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex justify-between">
          <span className="font-medium">Skins Won</span>
          <span className="font-semibold">{profile.skinsWon}</span>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex justify-between">
          <span className="font-medium">Closest-to-Pin Awards</span>
          <span className="font-semibold">{profile.ctpAwards}</span>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
