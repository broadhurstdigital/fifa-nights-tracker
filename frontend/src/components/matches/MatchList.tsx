import React, { useState, useEffect } from 'react';
import { Play, Clock, CheckCircle, Users, Calendar, Trophy } from 'lucide-react';
import { matchesApi, seasonsApi } from '@/services/api';
import type { Match, Season } from '@/types';
import MatchDetail from './MatchDetail';

const MatchList: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      loadMatches();
    }
  }, [selectedSeason]);

  const loadSeasons = async () => {
    try {
      const response = await seasonsApi.getAll();
      if (response.data.success && response.data.data) {
        setSeasons(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedSeason(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const loadMatches = async () => {
    if (!selectedSeason) return;
    
    try {
      setLoading(true);
      const response = await matchesApi.getBySeason(selectedSeason);
      if (response.data.success && response.data.data) {
        setMatches(response.data.data);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchStatus = (match: Match) => {
    if (match.completed_at) return 'completed';
    if (match.home_score !== null && match.away_score !== null) return 'pending_completion';
    return 'upcoming';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success-600" />;
      case 'pending_completion':
        return <Clock className="w-5 h-5 text-warning-600" />;
      default:
        return <Play className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending_completion':
        return 'Pending';
      default:
        return 'Upcoming';
    }
  };

  const filteredMatches = matches.filter(match => {
    const status = getMatchStatus(match);
    if (filter === 'upcoming') return status === 'upcoming';
    if (filter === 'completed') return status === 'completed';
    return true;
  });

  const upcomingCount = matches.filter(m => getMatchStatus(m) === 'upcoming').length;
  const completedCount = matches.filter(m => getMatchStatus(m) === 'completed').length;

  if (selectedMatch) {
    return (
      <MatchDetail 
        match={selectedMatch} 
        onBack={() => setSelectedMatch(null)}
        onUpdate={loadMatches}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Matches</h2>
      </div>

      {/* Season and Filter Controls */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-1">
              Season
            </label>
            <select
              id="season-select"
              value={selectedSeason || ''}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
              className="input max-w-xs"
            >
              <option value="">Select a season...</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.league})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded ${
                  filter === 'all' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({matches.length})
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-3 py-1 text-sm rounded ${
                  filter === 'upcoming' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Upcoming ({upcomingCount})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 text-sm rounded ${
                  filter === 'completed' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>
        </div>
      </div>

      {!selectedSeason ? (
        <div className="card">
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a season</h3>
            <p className="text-gray-500">Choose a season to view its matches.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="card">
          <div className="text-center py-8">
            <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No matches yet' : `No ${filter} matches`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'Import fixtures and assign players to generate matches.'
                : `There are no ${filter} matches for this season.`
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const status = getMatchStatus(match);
            return (
              <div 
                key={match.id} 
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedMatch(match)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {match.fixture?.home_team?.name} vs {match.fixture?.away_team?.name}
                        </h3>
                        {status === 'completed' && (
                          <span className="text-sm font-semibold text-gray-700">
                            {match.home_score} - {match.away_score}
                            {(match.penalties_home !== null && match.penalties_away !== null) && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({match.penalties_home}-{match.penalties_away} pens)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{match.home_player?.name} vs {match.away_player?.name}</span>
                        {match.fixture?.match_date && (
                          <>
                            <span className="mx-2">•</span>
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{new Date(match.fixture.match_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status === 'completed' 
                        ? 'bg-success-100 text-success-800'
                        : status === 'pending_completion'
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusText(status)}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      Round {match.fixture?.round_number}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchList;