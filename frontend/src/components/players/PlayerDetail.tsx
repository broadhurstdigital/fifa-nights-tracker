import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, TrendingUp, Calendar, Award } from 'lucide-react';
import { playersApi, seasonsApi } from '@/services/api';
import type { Player, PlayerStats, Season } from '@/types';

interface PlayerDetailProps {
  player: Player;
  onBack: () => void;
}

const PlayerDetail: React.FC<PlayerDetailProps> = ({ player, onBack }) => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlayerData();
  }, [player.id, selectedSeasonId]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      const [statsRes, seasonsRes] = await Promise.all([
        playersApi.getStats(player.id, selectedSeasonId || undefined),
        seasonsApi.getAll()
      ]);

      if (statsRes.data.success && statsRes.data.data) {
        setStats(statsRes.data.data);
      }
      if (seasonsRes.data.success && seasonsRes.data.data) {
        setSeasons(seasonsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading player data:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{player.name}</h1>
          <p className="text-gray-500">
            Member since {new Date(player.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Season Filter */}
      <div className="card">
        <div className="flex items-center gap-4">
          <label htmlFor="season-select" className="font-medium text-gray-700">
            Filter by Season:
          </label>
          <select
            id="season-select"
            value={selectedSeasonId || ''}
            onChange={(e) => setSelectedSeasonId(e.target.value ? Number(e.target.value) : null)}
            className="input max-w-xs"
          >
            <option value="">All Seasons</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} ({season.league})
              </option>
            ))}
          </select>
        </div>
      </div>

      {stats ? (
        <div className="space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <Trophy className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-gray-900">{stats.total_matches}</h3>
              <p className="text-sm text-gray-500">Total Matches</p>
            </div>
            <div className="card text-center">
              <Award className="w-8 h-8 text-success-600 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-gray-900">{stats.wins}</h3>
              <p className="text-sm text-gray-500">Wins ({getWinPercentage(stats.wins, stats.total_matches)}%)</p>
            </div>
            <div className="card text-center">
              <Target className="w-8 h-8 text-warning-600 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-gray-900">{stats.goals_for}</h3>
              <p className="text-sm text-gray-500">Goals Scored</p>
            </div>
            <div className="card text-center">
              <TrendingUp className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-gray-900">{stats.points}</h3>
              <p className="text-sm text-gray-500">Total Points</p>
            </div>
          </div>

          {/* Detailed Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Record */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Record</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Wins</span>
                  <span className="font-semibold text-success-600">{stats.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Draws</span>
                  <span className="font-semibold text-warning-600">{stats.draws}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Losses</span>
                  <span className="font-semibold text-danger-600">{stats.losses}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Goal Difference</span>
                  <span className={`font-semibold ${stats.goal_difference >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {stats.goal_difference >= 0 ? '+' : ''}{stats.goal_difference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Points per Game</span>
                  <span className="font-semibold text-primary-600">
                    {getPointsPerGame(stats.points, stats.total_matches)}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Breakdown */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Role</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Playing as Chosen Team</h4>
                  <div className="bg-primary-50 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Matches</span>
                      <span className="font-semibold">{stats.chosen_team_stats.matches}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Record</span>
                      <span className="font-semibold">
                        {stats.chosen_team_stats.wins}W-{stats.chosen_team_stats.draws}D-{stats.chosen_team_stats.losses}L
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Goals</span>
                      <span className="font-semibold">
                        {stats.chosen_team_stats.goals_for} / {stats.chosen_team_stats.goals_against}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Playing as Opposition</h4>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Matches</span>
                      <span className="font-semibold">{stats.opposition_team_stats.matches}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Record</span>
                      <span className="font-semibold">
                        {stats.opposition_team_stats.wins}W-{stats.opposition_team_stats.draws}D-{stats.opposition_team_stats.losses}L
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Goals</span>
                      <span className="font-semibold">
                        {stats.opposition_team_stats.goals_for} / {stats.opposition_team_stats.goals_against}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="text-center py-8">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No match data yet</h3>
            <p className="text-gray-500">
              This player hasn't participated in any matches yet. 
              Assign them to a team in an active season to start tracking performance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDetail;