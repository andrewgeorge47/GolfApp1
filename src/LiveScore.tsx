import React, { useEffect, useState } from 'react';

interface Team {
  id: number;
  name: string;
  scores: number[];
}

interface LowestScore {
  hole: number;
  score: number;
}

const LiveScore: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [skins, setSkins] = useState<LowestScore[]>([]);
  const [closest, setClosest] = useState<{hole: number|null, distance: number|null}>({hole: null, distance: null});

  const fetchData = async () => {
    try {
      const teamRes = await fetch('/teams.json'); // placeholder for team listing
      if (teamRes.ok) {
        setTeams(await teamRes.json());
      }
    } catch (e) {
      // ignore
    }
    try {
      const res = await fetch('http://localhost:4000/skins');
      if (res.ok) {
        const data = await res.json();
        setSkins(data.lowest);
      }
    } catch (e) {
      // ignore
    }
    try {
      const res = await fetch('http://localhost:4000/closest-to-pin');
      if (res.ok) {
        setClosest(await res.json());
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Live Scores</h2>
      <div className="bg-white rounded-lg shadow p-4">
        {teams.map(team => (
          <div key={team.id} className="mb-2">
            <div className="font-medium">{team.name}</div>
            <div className="text-sm text-gray-700">Scores: {team.scores.join(', ')}</div>
          </div>
        ))}
      </div>
      <h3 className="text-lg font-semibold">Skins</h3>
      <ul className="list-disc pl-5">
        {skins.map(s => (
          <li key={s.hole}>Hole {s.hole}: {s.score}</li>
        ))}
      </ul>
      {closest.hole && (
        <div className="mt-4 p-4 bg-green-50 rounded">
          Closest to the Pin - Hole {closest.hole}: {closest.distance} ft
        </div>
      )}
    </div>
  );
};

export default LiveScore;
