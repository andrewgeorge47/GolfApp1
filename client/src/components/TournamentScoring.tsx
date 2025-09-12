import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getTournaments, getTournamentParticipants, getTournamentMatches, getTeams } from '../services/api';
import { toast } from 'react-toastify';
import { ArrowLeft, Trophy, Users, Target } from 'lucide-react';
import StrokeplayScoring from './StrokeplayScoring';
import ScoreSubmission from './ScoreSubmission';
import NewWeeklyScoring from './NewWeeklyScoring';
import ChampionshipPlayerScoring from './ChampionshipPlayerScoring';

const TournamentScoring: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tournamentId = searchParams.get('tournament');
  
  const [tournament, setTournament] = useState<any>(null);
  const [tournamentParticipants, setTournamentParticipants] = useState<any[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('TournamentScoring component mounted');
    console.log('tournamentId from URL:', tournamentId);
    console.log('searchParams:', searchParams.toString());
    
    const fetchTournamentData = async () => {
      if (!tournamentId) {
        console.log('No tournament ID provided');
        setError('No tournament ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [tournamentsRes, participantsRes, matchesRes] = await Promise.all([
          getTournaments(),
          getTournamentParticipants(parseInt(tournamentId)),
          getTournamentMatches(parseInt(tournamentId))
        ]);

        // Find the specific tournament
        const foundTournament = tournamentsRes.data.find((t: any) => t.id === parseInt(tournamentId));
        if (!foundTournament) {
          setError('Tournament not found');
          setLoading(false);
          return;
        }

        setTournament(foundTournament);
        setTournamentParticipants(participantsRes.data || []);
        setTournamentMatches(matchesRes.data || []);

        // Load teams if tournament is team-based
        if (foundTournament.tournament_format === 'scramble' || foundTournament.tournament_format === 'best_ball') {
          try {
            const teamsRes = await getTeams(parseInt(tournamentId));
            setTournamentTeams(teamsRes.data || []);
          } catch (error) {
            console.error('Error loading teams:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching tournament data:', error);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentData();
  }, [tournamentId]);

  const handleScoreSubmitted = () => {
    toast.success('Score submitted successfully!');
    // Stay on current page - no navigation needed
  };

  const getFormatSpecificSettings = (tournament: any) => {
    return {
      format: tournament.tournament_format,
      teamSize: tournament.team_size || 4,
      holeConfiguration: tournament.hole_configuration || '18',
      tee: tournament.tee || 'Red',
      pins: tournament.pins || 'Friday',
      puttingGimme: tournament.putting_gimme || '8',
      elevation: tournament.elevation || 'Course',
      stimp: tournament.stimp || '11',
      mulligan: tournament.mulligan || 'No',
      gamePlay: tournament.game_play || 'Force Realistic',
      firmness: tournament.firmness || 'Normal',
      wind: tournament.wind || 'None',
      handicapEnabled: tournament.handicap_enabled || false
    };
  };

  const requiresMatches = (tournamentFormat: string) => {
    return tournamentFormat === 'match_play' || tournamentFormat === 'par3_match_play';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-dark-green to-brand-muted-green flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon-green mx-auto mb-4"></div>
          <p className="text-brand-black">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-dark-green to-brand-muted-green flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <Trophy className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-brand-black mb-2">Tournament Not Found</h2>
          <p className="text-neutral-600 mb-6">{error || 'The tournament you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center mx-auto px-6 py-3 bg-brand-neon-green text-brand-black rounded-lg font-medium hover:bg-green-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const tournamentSettings = getFormatSpecificSettings(tournament);
  const needsMatches = requiresMatches(tournament.tournament_format);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark-green to-brand-muted-green">
      <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 py-2 sm:py-8">
        {/* Header */}
        <div className="bg-white rounded-none sm:rounded-2xl shadow-lg p-3 sm:p-6 mb-4 sm:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/profile')}
                className="mr-2 sm:mr-4 p-2 text-neutral-600 hover:text-brand-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-brand-black flex items-center">
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" />
                  {tournament.name}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                  {tournament.tournament_format?.replace('_', ' ').toUpperCase()} • {tournament.type}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                tournament.status === 'active' ? 'bg-green-100 text-green-800' :
                tournament.status === 'open' ? 'bg-blue-100 text-blue-800' :
                tournament.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                tournament.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {tournament.status || 'draft'}
              </span>
            </div>
          </div>

          {/* Tournament Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2 text-neutral-500" />
              <span>{tournamentParticipants.length} participants</span>
            </div>
            {tournament.start_date && (
              <div className="flex items-center">
                <Target className="w-4 h-4 mr-2 text-neutral-500" />
                <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
              </div>
            )}
            {tournament.location && (
              <div className="flex items-center">
                <Trophy className="w-4 h-4 mr-2 text-neutral-500" />
                <span>{tournament.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Scoring Component */}
        <div className="bg-white rounded-none sm:rounded-2xl shadow-lg p-3 sm:p-6">
          {tournament.type === 'club_championship' || tournament.type === 'national_championship' ? (
            <ChampionshipPlayerScoring
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              onScoreSubmitted={handleScoreSubmitted}
            />
          ) : tournament.tournament_format === 'stroke_play' ? (
            <StrokeplayScoring
              tournamentId={tournament.id}
              tournamentFormat={tournament.tournament_format}
              tournamentSettings={tournamentSettings}
              onScoreSubmitted={handleScoreSubmitted}
              courseId={tournament.course_id}
              tournament={tournament}
            />
          ) : tournament.tournament_format === 'par3_match_play' ? (
            <NewWeeklyScoring
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              onScoreSubmitted={handleScoreSubmitted}
            />
          ) : (
            <ScoreSubmission
              tournamentId={tournament.id}
              tournamentMatches={tournamentMatches}
              tournamentFormat={tournament.tournament_format}
              onScoreSubmitted={handleScoreSubmitted}
              requiresMatches={needsMatches}
              teams={tournamentTeams}
              tournamentSettings={tournamentSettings}
              courseId={tournament.course_id}
              tournament={tournament}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentScoring; 