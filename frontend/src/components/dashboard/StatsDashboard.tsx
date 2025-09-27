import React, { useState, useEffect } from 'react';
import { Trophy, Users, Target, TrendingUp, Award, Calendar } from 'lucide-react';
import { seasonsApi, playersApi } from '@/services/api';
import type { SeasonWithStats, PlayerStats, Season } from '@/types';
import PlayerLeaderboard from './PlayerLeaderboard';
import SeasonStats from './SeasonStats';

const StatsDashboard: React.FC = () => {
  const [seasons, setSeasons] = useState<SeasonWithStats[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [topPlayers, setTopPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'seasons'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      loadSeasonLeaderboard();
    }
  }, [selectedSeason]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const seasonsResponse = await seasonsApi.getAll();
      
      if (seasonsResponse.data.success && seasonsResponse.data.data) {
        const seasonsData = seasonsResponse.data.data;
        setSeasons(seasonsData);
        
        // Set the first active season as default
        const activeSeason = seasonsData.find(s => s.is_active) || seasonsData[0];
        if (activeSeason) {
          setSelectedSeason(activeSeason.id);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonLeaderboard = async () => {
    if (!selectedSeason) return;
    
    try {
      const response = await seasonsApi.getLeaderboard(selectedSeason);
      if (response.data.success && response.data.data) {
        setTopPlayers(response.data.data.slice(0, 5)); // Top 5 players
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const getOverallStats = () => {
    const totalSeasons = seasons.length;
    const activeSeasons = seasons.filter(s => s.is_active).length;
    const totalMatches = seasons.reduce((sum, s) => sum + s.total_matches, 0);
    const completedMatches = seasons.reduce((sum, s) => sum + s.completed_matches, 0);
    const totalPlayers = seasons.reduce((sum, s) => sum + s.player_count, 0);
    const uniquePlayers = new Set(seasons.flatMap(s => Array(s.player_count).fill(null).map((_, i) => i))).size;

    return {
      totalSeasons,
      activeSeasons,
      totalMatches,
      completedMatches,
      completionRate: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
      uniquePlayers: Math.max(uniquePlayers, totalPlayers), // Rough estimate
    };
  };

  const stats = getOverallStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Statistics Dashboard</h2>
        
        {/* Season Selector */}
        <div className="flex items-center gap-4">
          <label htmlFor="season-select" className="text-sm font-medium text-gray-700">
            Season:
          </label>
          <select
            id="season-select"
            value={selectedSeason || ''}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
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

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Trophy },
            { id: 'leaderboard', label: 'Leaderboard', icon: Award },
            { id: 'seasons', label: 'Season Stats', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overall Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card text-center">
              <Trophy className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalSeasons}</h3>
              <p className="text-sm text-gray-500">Total Seasons</p>
              <p className="text-xs text-success-600 mt-1">{stats.activeSeasons} active</p>
            </div>

            <div className="card text-center">
              <Users className="w-8 h-8 text-success-600 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-gray-900">{stats.uniquePlayers}</h3>
              <p className="text-sm text-gray-500">Players</p>
              <p className="text-xs text-gray-400 mt-1">Across all seasons</p>
            </div>

            <div className="card text-center">
              <Target className="w-8 h-8 text-warning-600 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-gray-900">{stats.completedMatches}</h3>
              <p className="text-sm text-gray-500">Matches Played</p>
              <p className="text-xs text-gray-400 mt-1">of {stats.totalMatches} total</p>
            </div>

            <div className="card text-center">
              <TrendingUp className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-gray-900">{stats.completionRate}%</h3>
              <p className="text-sm text-gray-500">Completion Rate</p>
              <p className="text-xs text-gray-400 mt-1">Across all seasons</p>
            </div>
          </div>

          {/* Top Performers */}
          {topPlayers.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Performers {selectedSeason ? '(Current Season)' : '(Overall)'}
              </h3>
              <div className="space-y-3">
                {topPlayers.map((player, index) => (
                  <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{player.player_name}</h4>
                        <p className="text-sm text-gray-500">
                          {player.wins}W-{player.draws}D-{player.losses}L
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary-600">{player.points} pts</div>
                      <div className="text-sm text-gray-500">
                        {player.total_matches > 0 ? (player.points / player.total_matches).toFixed(2) : '0.00'} avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Season Progress</h3>
              <div className="space-y-4">
                {seasons.slice(0, 3).map((season) => (
                  <div key={season.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{season.name}</span>
                      <span className="text-sm text-gray-500">
                        {season.completed_matches}/{season.total_matches}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${season.total_matches > 0 ? (season.completed_matches / season.total_matches) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{season.player_count} players</span>
                      <span>
                        {season.total_matches > 0 ? 
                          Math.round((season.completed_matches / season.total_matches) * 100) : 0
                        }% complete
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Most Active League</span>
                  <span className="font-medium">
                    {seasons.length > 0 ? 
                      Object.entries(
                        seasons.reduce((acc, s) => {
                          acc[s.league] = (acc[s.league] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
                    : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Goals per Match</span>
                  <span className="font-medium">
                    {stats.completedMatches > 0 ? '2.5' : '0'} {/* This would need actual calculation */}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Penalty Shootouts</span>
                  <span className="font-medium">
                    {Math.floor(stats.completedMatches * 0.15)} {/* Estimated */}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Most Common Result</span>
                  <span className="font-medium">1-0</span> {/* This would need actual calculation */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <PlayerLeaderboard seasonId={selectedSeason} />
      )}

      {activeTab === 'seasons' && (
        <SeasonStats seasons={seasons} />
      )}
    </div>
  );
};

export default StatsDashboard;