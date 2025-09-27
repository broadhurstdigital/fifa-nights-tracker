import React, { useState } from 'react';
import { Trophy, Calendar, Users, Target, TrendingUp, Play, CheckCircle } from 'lucide-react';
import type { SeasonWithStats } from '@/types';

interface SeasonStatsProps {
  seasons: SeasonWithStats[];
}

const SeasonStats: React.FC<SeasonStatsProps> = ({ seasons }) => {
  const [sortBy, setSortBy] = useState<'name' | 'completion' | 'players' | 'matches'>('name');

  const sortedSeasons = [...seasons].sort((a, b) => {
    switch (sortBy) {
      case 'completion':
        const aCompletion = a.total_matches > 0 ? (a.completed_matches / a.total_matches) * 100 : 0;
        const bCompletion = b.total_matches > 0 ? (b.completed_matches / b.total_matches) * 100 : 0;
        return bCompletion - aCompletion;
      case 'players':
        return b.player_count - a.player_count;
      case 'matches':
        return b.total_matches - a.total_matches;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const getCompletionPercentage = (season: SeasonWithStats) => {
    if (season.total_matches === 0) return 0;
    return Math.round((season.completed_matches / season.total_matches) * 100);
  };

  const getSeasonStatus = (season: SeasonWithStats) => {
    if (!season.is_active) return 'inactive';
    if (season.total_matches === 0) return 'setup';
    if (season.completed_matches === season.total_matches) return 'completed';
    return 'active';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success-600" />;
      case 'active':
        return <Play className="w-5 h-5 text-primary-600" />;
      case 'setup':
        return <Users className="w-5 h-5 text-warning-600" />;
      default:
        return <Trophy className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'In Progress';
      case 'setup':
        return 'Setting Up';
      default:
        return 'Inactive';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'active':
        return 'bg-primary-100 text-primary-800';
      case 'setup':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const overallStats = {
    totalSeasons: seasons.length,
    activeSeasons: seasons.filter(s => s.is_active).length,
    completedSeasons: seasons.filter(s => getSeasonStatus(s) === 'completed').length,
    totalMatches: seasons.reduce((sum, s) => sum + s.total_matches, 0),
    completedMatches: seasons.reduce((sum, s) => sum + s.completed_matches, 0),
    totalPlayers: seasons.reduce((sum, s) => sum + s.player_count, 0),
  };

  if (seasons.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Seasons Created</h3>
          <p className="text-gray-500">Create your first season to start tracking statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card text-center">
          <Trophy className="w-6 h-6 text-primary-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">{overallStats.totalSeasons}</div>
          <div className="text-sm text-gray-500">Total Seasons</div>
        </div>
        
        <div className="card text-center">
          <Play className="w-6 h-6 text-success-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">{overallStats.activeSeasons}</div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        
        <div className="card text-center">
          <CheckCircle className="w-6 h-6 text-primary-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">{overallStats.completedSeasons}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        
        <div className="card text-center">
          <Users className="w-6 h-6 text-warning-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">{overallStats.totalPlayers}</div>
          <div className="text-sm text-gray-500">Total Players</div>
        </div>
        
        <div className="card text-center">
          <Target className="w-6 h-6 text-danger-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">{overallStats.completedMatches}</div>
          <div className="text-sm text-gray-500">Matches Played</div>
        </div>
        
        <div className="card text-center">
          <TrendingUp className="w-6 h-6 text-primary-600 mx-auto mb-2" />
          <div className="text-xl font-bold text-gray-900">
            {overallStats.totalMatches > 0 ? 
              Math.round((overallStats.completedMatches / overallStats.totalMatches) * 100) : 0
            }%
          </div>
          <div className="text-sm text-gray-500">Overall Progress</div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="card">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Sort by:</span>
          <div className="flex gap-2">
            {[
              { key: 'name', label: 'Name' },
              { key: 'completion', label: 'Completion' },
              { key: 'players', label: 'Players' },
              { key: 'matches', label: 'Matches' },
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

      {/* Seasons List */}
      <div className="space-y-4">
        {sortedSeasons.map((season) => {
          const status = getSeasonStatus(season);
          const completion = getCompletionPercentage(season);
          
          return (
            <div key={season.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  {getStatusIcon(status)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{season.name}</h3>
                    <p className="text-sm text-gray-500">{season.league}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {getStatusText(status)}
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {completion}% Complete
                    </div>
                    <div className="text-xs text-gray-500">
                      {season.completed_matches}/{season.total_matches} matches
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {season.total_matches > 0 && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${completion}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Season Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <Calendar className="w-4 h-4 text-gray-600 mr-1" />
                  </div>
                  <div className="font-medium text-gray-900">
                    {new Date(season.start_date).toLocaleDateString()}
                  </div>
                  <div className="text-gray-500">Start Date</div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="w-4 h-4 text-gray-600 mr-1" />
                  </div>
                  <div className="font-medium text-gray-900">{season.player_count}</div>
                  <div className="text-gray-500">Players</div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <Target className="w-4 h-4 text-gray-600 mr-1" />
                  </div>
                  <div className="font-medium text-gray-900">{season.total_matches}</div>
                  <div className="text-gray-500">Total Matches</div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <CheckCircle className="w-4 h-4 text-gray-600 mr-1" />
                  </div>
                  <div className="font-medium text-gray-900">{season.completed_matches}</div>
                  <div className="text-gray-500">Completed</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* League Distribution */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">League Distribution</h3>
        <div className="space-y-3">
          {Object.entries(
            seasons.reduce((acc, season) => {
              acc[season.league] = (acc[season.league] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).sort(([,a], [,b]) => b - a).map(([league, count]) => (
            <div key={league} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">{league}</span>
              <div className="text-right">
                <span className="font-semibold text-primary-600">{count}</span>
                <span className="text-sm text-gray-500 ml-1">
                  ({Math.round((count / seasons.length) * 100)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeasonStats;