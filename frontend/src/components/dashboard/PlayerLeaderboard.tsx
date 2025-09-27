import React, { useState, useEffect } from 'react';
import { Trophy, Target, TrendingUp, Award, User, Shirt } from 'lucide-react';
import { seasonsApi } from '@/services/api';
import type { PlayerStats } from '@/types';

interface PlayerLeaderboardProps {
  seasonId: number | null;
}

const PlayerLeaderboard: React.FC<PlayerLeaderboardProps> = ({ seasonId }) => {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'points' | 'wins' | 'goal_difference' | 'total_matches'>('points');

  useEffect(() => {
    if (seasonId) {
      loadLeaderboard();
    } else {
      setPlayers([]);
      setLoading(false);
    }
  }, [seasonId, sortBy]);

  const loadLeaderboard = async () => {
    if (!seasonId) return;
    
    try {
      setLoading(true);
      const response = await seasonsApi.getLeaderboard(seasonId);
      if (response.data.success && response.data.data) {
        const sortedPlayers = [...response.data.data].sort((a, b) => {
          switch (sortBy) {
            case 'points':
              return b.points - a.points;
            case 'wins':
              return b.wins - a.wins;
            case 'goal_difference':
              return b.goal_difference - a.goal_difference;
            case 'total_matches':
              return b.total_matches - a.total_matches;
            default:
              return b.points - a.points;
          }
        });
        setPlayers(sortedPlayers);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinPercentage = (wins: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  const getPointsPerGame = (points: number, matches: number) => {
    if (matches === 0) return 0;
    return (points / matches).toFixed(2);
  };

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Award className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-semibold text-gray-500">{index + 1}</span>;
  };

  if (!seasonId) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Season</h3>
          <p className="text-gray-500">Choose a season to view the player leaderboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Statistics Yet</h3>
          <p className="text-gray-500">No matches have been completed in this season yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="card">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Sort by:</span>
          <div className="flex gap-2">
            {[
              { key: 'points', label: 'Points' },
              { key: 'wins', label: 'Wins' },
              { key: 'goal_difference', label: 'Goal Diff' },
              { key: 'total_matches', label: 'Matches' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setSortBy(option.key as any)}
                className={`px-3 py-1 text-sm rounded ${
                  sortBy === option.key 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Player Rankings</h3>
        <div className="space-y-4">
          {players.map((player, index) => (
            <div key={player.player_id} className={`p-4 rounded-lg border transition-all ${
              index === 0 ? 'bg-yellow-50 border-yellow-200' :
              index === 1 ? 'bg-gray-50 border-gray-200' :
              index === 2 ? 'bg-amber-50 border-amber-200' :
              'bg-white border-gray-200 hover:bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getPositionIcon(index)}
                  <div>
                    <h4 className="font-semibold text-gray-900">{player.player_name}</h4>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <span>{player.wins}W-{player.draws}D-{player.losses}L</span>
                      <span className="mx-2">•</span>
                      <span>{getWinPercentage(player.wins, player.total_matches)}% win rate</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-8 text-right">
                  <div>
                    <div className="font-semibold text-primary-600">{player.points}</div>
                    <div className="text-xs text-gray-500">Points</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{getPointsPerGame(player.points, player.total_matches)}</div>
                    <div className="text-xs text-gray-500">PPG</div>
                  </div>
                  <div>
                    <div className={`font-semibold ${player.goal_difference >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {player.goal_difference >= 0 ? '+' : ''}{player.goal_difference}
                    </div>
                    <div className="text-xs text-gray-500">Goal Diff</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{player.goals_for}/{player.goals_against}</div>
                    <div className="text-xs text-gray-500">Goals F/A</div>
                  </div>
                </div>
              </div>

              {/* Performance Breakdown */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shirt className="w-4 h-4 text-primary-600" />
                      <span className="font-medium text-primary-800">As Chosen Team</span>
                    </div>
                    <div className="space-y-1 text-primary-700">
                      <div className="flex justify-between">
                        <span>Matches:</span>
                        <span className="font-medium">{player.chosen_team_stats.matches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Record:</span>
                        <span className="font-medium">
                          {player.chosen_team_stats.wins}W-{player.chosen_team_stats.draws}D-{player.chosen_team_stats.losses}L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Goals:</span>
                        <span className="font-medium">
                          {player.chosen_team_stats.goals_for}/{player.chosen_team_stats.goals_against}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-100 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-800">As Opposition</span>
                    </div>
                    <div className="space-y-1 text-gray-700">
                      <div className="flex justify-between">
                        <span>Matches:</span>
                        <span className="font-medium">{player.opposition_team_stats.matches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Record:</span>
                        <span className="font-medium">
                          {player.opposition_team_stats.wins}W-{player.opposition_team_stats.draws}D-{player.opposition_team_stats.losses}L
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Goals:</span>
                        <span className="font-medium">
                          {player.opposition_team_stats.goals_for}/{player.opposition_team_stats.goals_against}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Leaderboard Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-primary-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">{players.length}</div>
            <div className="text-sm text-primary-600">Active Players</div>
          </div>
          <div className="text-center p-4 bg-success-50 rounded-lg">
            <div className="text-2xl font-bold text-success-600">
              {Math.max(...players.map(p => p.points))}
            </div>
            <div className="text-sm text-success-600">Highest Points</div>
          </div>
          <div className="text-center p-4 bg-warning-50 rounded-lg">
            <div className="text-2xl font-bold text-warning-600">
              {Math.max(...players.map(p => p.goal_difference))}
            </div>
            <div className="text-sm text-warning-600">Best Goal Diff</div>
          </div>
          <div className="text-center p-4 bg-danger-50 rounded-lg">
            <div className="text-2xl font-bold text-danger-600">
              {Math.max(...players.map(p => getWinPercentage(p.wins, p.total_matches)))}%
            </div>
            <div className="text-sm text-danger-600">Best Win Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerLeaderboard;