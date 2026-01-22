import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Award, Lock } from 'lucide-react';
import { getDivisionWeeklyLeaderboard, getLeagueStandings, type WeeklyLeaderboard, type LeagueStandings } from '../services/api';
import { toast } from 'react-toastify';

interface DivisionLeaderboardProps {
  leagueId: number;
  divisionId: number;
  divisionName: string;
  weekNumber?: number;
  currentTeamId?: number;
}

const DivisionLeaderboard: React.FC<DivisionLeaderboardProps> = ({
  leagueId,
  divisionId,
  divisionName,
  weekNumber,
  currentTeamId
}) => {
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<WeeklyLeaderboard | null>(null);
  const [leagueStandings, setLeagueStandings] = useState<LeagueStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'weekly' | 'season'>(weekNumber ? 'weekly' : 'season');

  useEffect(() => {
    loadData();
  }, [leagueId, divisionId, weekNumber]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load weekly leaderboard if week number is provided
      if (weekNumber) {
        const weeklyResponse = await getDivisionWeeklyLeaderboard(leagueId, divisionId, weekNumber);
        setWeeklyLeaderboard(weeklyResponse.data);
      }

      // Load all league standings for season view (all divisions)
      const standingsResponse = await getLeagueStandings(leagueId);
      setLeagueStandings(standingsResponse.data);
    } catch (error: any) {
      console.error('Error loading leaderboard:', error);
      toast.error(error.response?.data?.error || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // Check if current team has submitted scores for the week
  const currentTeamHasSubmitted = weeklyLeaderboard?.teams.find(
    t => t.team_id === currentTeamId
  )?.has_submitted || false;

  // Blur scores if current team hasn't submitted yet
  const blurScores = currentTeamId && !currentTeamHasSubmitted;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Division Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-black">{divisionName}</h2>
          <p className="text-sm text-neutral-600">Division Standings</p>
        </div>

        {/* View Toggle */}
        {weekNumber && (
          <div className="flex rounded-lg bg-neutral-100 p-1">
            <button
              onClick={() => setView('weekly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'weekly'
                  ? 'bg-white text-brand-teal shadow-sm'
                  : 'text-neutral-600 hover:text-brand-black'
              }`}
            >
              Week {weekNumber}
            </button>
            <button
              onClick={() => setView('season')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'season'
                  ? 'bg-white text-brand-teal shadow-sm'
                  : 'text-neutral-600 hover:text-brand-black'
              }`}
            >
              Season
            </button>
          </div>
        )}
      </div>

      {/* Weekly Leaderboard */}
      {view === 'weekly' && weeklyLeaderboard && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-brand-teal to-brand-purple px-6 py-4">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-white" />
              <h3 className="text-lg font-bold text-white">Week {weekNumber} Results</h3>
            </div>
          </div>

          {blurScores && (
            <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-yellow-700" />
              <p className="text-sm text-yellow-800 font-medium">
                Submit your team's score to view leaderboard details
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Net Score
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {weeklyLeaderboard.teams
                    .filter(team => team.has_submitted)
                    .map((team, index) => {
                      const rank = index + 1;
                      const isCurrentTeam = team.team_id === currentTeamId;

                      return (
                        <tr
                          key={team.team_id}
                          className={`${
                            isCurrentTeam ? 'bg-brand-teal/5 border-l-4 border-brand-teal' : ''
                          } hover:bg-neutral-50 transition-colors`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {blurScores ? (
                              <div className="flex items-center">
                                <div className="relative inline-block">
                                  <span className="text-sm font-semibold text-brand-black filter blur-md select-none">
                                    1
                                  </span>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs text-neutral-400">?</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                {rank === 1 && (
                                  <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                                )}
                                {rank === 2 && (
                                  <Trophy className="w-5 h-5 text-gray-400 mr-2" />
                                )}
                                {rank === 3 && (
                                  <Trophy className="w-5 h-5 text-amber-700 mr-2" />
                                )}
                                <span className="text-sm font-semibold text-brand-black">
                                  {rank}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-brand-black">
                              {team.team_name}
                              {isCurrentTeam && (
                                <span className="ml-2 text-xs text-brand-teal font-semibold">
                                  (You)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {blurScores ? (
                              <div className="relative inline-block">
                                <span className="text-sm font-semibold text-brand-black filter blur-md select-none">
                                  123
                                </span>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs text-neutral-400">???</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-brand-black">
                                {team.net_total}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {blurScores ? (
                              <div className="relative inline-block">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 filter blur-md select-none">
                                  3 pts
                                </span>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs text-neutral-400">?</span>
                                </div>
                              </div>
                            ) : (
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                  team.weekly_points > 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-neutral-100 text-neutral-600'
                                }`}
                              >
                                {team.weekly_points} pts
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

          {/* Teams that haven't submitted - only show if scores are not blurred */}
          {!blurScores && weeklyLeaderboard.teams.filter(t => !t.has_submitted).length > 0 && (
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200">
              <p className="text-xs text-neutral-500 mb-2">Not yet submitted:</p>
              <div className="flex flex-wrap gap-2">
                {weeklyLeaderboard.teams
                  .filter(t => !t.has_submitted)
                  .map(team => (
                    <span
                      key={team.team_id}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-neutral-200 text-neutral-700"
                    >
                      {team.team_name}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Season Standings - Show all divisions, user's division first */}
      {view === 'season' && leagueStandings && (
        <div className="space-y-6">
          {/* Sort divisions: user's division first, then others */}
          {leagueStandings.divisions
            .sort((a, b) => {
              // User's division comes first
              if (a.division_id === divisionId) return -1;
              if (b.division_id === divisionId) return 1;
              return a.division_id - b.division_id;
            })
            .map((division) => {
              const isUserDivision = division.division_id === divisionId;

              return (
                <div key={division.division_id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className={`px-6 py-4 ${
                    isUserDivision
                      ? 'bg-gradient-to-r from-brand-teal to-brand-purple'
                      : 'bg-gradient-to-r from-neutral-600 to-neutral-700'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-white" />
                      <h3 className="text-lg font-bold text-white">
                        {division.division_name} Division
                        {isUserDivision && (
                          <span className="ml-2 text-sm font-normal opacity-90">(Your Division)</span>
                        )}
                      </h3>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Team
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Total Points
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Aggregate Net
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {division.teams.map((team) => {
                          const rank = team.rank_in_division;
                          const isCurrentTeam = team.team_id === currentTeamId;
                          const isPlayoffPosition = rank <= 2;

                          return (
                            <tr
                              key={team.team_id}
                              className={`${
                                isCurrentTeam ? 'bg-brand-teal/5 border-l-4 border-brand-teal' : ''
                              } ${
                                isPlayoffPosition ? 'bg-green-50/50' : ''
                              } hover:bg-neutral-50 transition-colors`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {rank === 1 && (
                                    <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                                  )}
                                  {rank === 2 && (
                                    <Trophy className="w-5 h-5 text-gray-400 mr-2" />
                                  )}
                                  <span className="text-sm font-semibold text-brand-black">
                                    {rank}
                                  </span>
                                  {isPlayoffPosition && (
                                    <span className="ml-2 text-xs text-green-700 font-semibold">
                                      Playoff
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-brand-black">
                                  {team.team_name}
                                  {isCurrentTeam && (
                                    <span className="ml-2 text-xs text-brand-teal font-semibold">
                                      (You)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {team.captain_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-bold text-brand-purple">
                                  {team.league_points ?? 0}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm text-neutral-600">
                                  {team.aggregate_net_score}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

          {/* Footer with playoff info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-neutral-600">
              <strong>Points:</strong> 3 pts for 1st, 2 pts for 2nd, 1 pt for 3rd per week.{' '}
              <strong>Tiebreaker:</strong> Lowest aggregate net score.{' '}
              <strong>Playoffs:</strong> Top 2 teams from each division advance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DivisionLeaderboard;
