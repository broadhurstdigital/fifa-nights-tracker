import React, { useState } from 'react';
import { ArrowLeft, Play, Trophy, Target, Clock, Users } from 'lucide-react';
import type { Match } from '@/types';
import ResultEntry from './ResultEntry';

interface MatchDetailProps {
  match: Match;
  onBack: () => void;
  onUpdate: () => void;
}

const MatchDetail: React.FC<MatchDetailProps> = ({ match, onBack, onUpdate }) => {
  const [showResultEntry, setShowResultEntry] = useState(false);

  const getMatchStatus = () => {
    if (match.completed_at) return 'completed';
    if (match.home_score !== null && match.away_score !== null) return 'pending_completion';
    return 'upcoming';
  };

  const status = getMatchStatus();
  const isCompleted = status === 'completed';
  const hasResult = match.home_score !== null && match.away_score !== null;

  const getWinnerName = () => {
    if (!match.winner_id) return 'Draw';
    if (match.winner_id === match.home_player_id) return match.home_player?.name;
    if (match.winner_id === match.away_player_id) return match.away_player?.name;
    return 'Unknown';
  };

  const getPenaltyWinnerName = () => {
    if (!match.penalty_winner_id) return null;
    if (match.penalty_winner_id === match.home_player_id) return match.home_player?.name;
    if (match.penalty_winner_id === match.away_player_id) return match.away_player?.name;
    return 'Unknown';
  };

  const handleResultUpdated = () => {
    setShowResultEntry(false);
    onUpdate();
  };

  if (showResultEntry) {
    return (
      <ResultEntry
        match={match}
        onBack={() => setShowResultEntry(false)}
        onComplete={handleResultUpdated}
      />
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
          <h1 className="text-2xl font-bold text-gray-900">
            {match.fixture?.home_team?.name} vs {match.fixture?.away_team?.name}
          </h1>
          <p className="text-gray-500">
            Round {match.fixture?.round_number} • {match.fixture?.match_date && new Date(match.fixture.match_date).toLocaleDateString()}
          </p>
        </div>
        <div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isCompleted 
              ? 'bg-success-100 text-success-800'
              : hasResult
              ? 'bg-warning-100 text-warning-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isCompleted ? 'Completed' : hasResult ? 'Pending' : 'Upcoming'}
          </span>
        </div>
      </div>

      {/* Match Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Home Team */}
        <div className="card text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {match.fixture?.home_team?.name}
          </h3>
          <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
            <Users className="w-4 h-4 mr-1" />
            {match.home_player?.name}
          </div>
          {hasResult && (
            <div className="text-3xl font-bold text-primary-600">
              {match.home_score}
            </div>
          )}
        </div>

        {/* Match Info */}
        <div className="card text-center">
          <div className="space-y-4">
            {hasResult ? (
              <div className="space-y-2">
                <div className="text-4xl font-bold text-gray-900">
                  {match.home_score} - {match.away_score}
                </div>
                {(match.penalties_home !== null && match.penalties_away !== null) && (
                  <div className="text-sm text-gray-500">
                    Penalties: {match.penalties_home} - {match.penalties_away}
                  </div>
                )}
                <div className="text-lg font-medium text-gray-700">
                  Winner: {getWinnerName()}
                  {getPenaltyWinnerName() && (
                    <span className="text-sm text-gray-500 block">
                      (on penalties: {getPenaltyWinnerName()})
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Play className="w-12 h-12 text-gray-300 mx-auto" />
                <div className="text-lg font-medium text-gray-500">
                  Match not played yet
                </div>
              </div>
            )}
            
            {!isCompleted && (
              <button
                onClick={() => setShowResultEntry(true)}
                className="btn-primary px-6 py-2"
              >
                {hasResult ? 'Edit Result' : 'Enter Result'}
              </button>
            )}
          </div>
        </div>

        {/* Away Team */}
        <div className="card text-center">
          <div className="w-16 h-16 bg-danger-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-danger-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {match.fixture?.away_team?.name}
          </h3>
          <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
            <Users className="w-4 h-4 mr-1" />
            {match.away_player?.name}
          </div>
          {hasResult && (
            <div className="text-3xl font-bold text-danger-600">
              {match.away_score}
            </div>
          )}
        </div>
      </div>

      {/* Match Details */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">League</span>
              <span className="font-medium">{match.fixture?.home_team?.league}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Round</span>
              <span className="font-medium">{match.fixture?.round_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Match Date</span>
              <span className="font-medium">
                {match.fixture?.match_date ? new Date(match.fixture.match_date).toLocaleDateString() : 'TBD'}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Home Team Strength</span>
              <span className="font-medium">{match.fixture?.home_team?.strength || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Away Team Strength</span>
              <span className="font-medium">{match.fixture?.away_team?.strength || 'N/A'}</span>
            </div>
            {isCompleted && match.completed_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium">
                  {new Date(match.completed_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Impact */}
      {isCompleted && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary-50 rounded-lg">
              <h4 className="font-medium text-primary-900 mb-2">
                {match.home_player?.name} ({match.fixture?.home_team?.name})
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Result:</span>
                  <span className={`font-medium ${
                    match.winner_id === match.home_player_id 
                      ? 'text-success-600' 
                      : match.winner_id === null 
                      ? 'text-warning-600' 
                      : 'text-danger-600'
                  }`}>
                    {match.winner_id === match.home_player_id ? 'Win' : match.winner_id === null ? 'Draw' : 'Loss'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Goals:</span>
                  <span className="font-medium">{match.home_score}</span>
                </div>
                <div className="flex justify-between">
                  <span>Performance Type:</span>
                  <span className="font-medium">Chosen Team</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                {match.away_player?.name} ({match.fixture?.away_team?.name})
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Result:</span>
                  <span className={`font-medium ${
                    match.winner_id === match.away_player_id 
                      ? 'text-success-600' 
                      : match.winner_id === null 
                      ? 'text-warning-600' 
                      : 'text-danger-600'
                  }`}>
                    {match.winner_id === match.away_player_id ? 'Win' : match.winner_id === null ? 'Draw' : 'Loss'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Goals:</span>
                  <span className="font-medium">{match.away_score}</span>
                </div>
                <div className="flex justify-between">
                  <span>Performance Type:</span>
                  <span className="font-medium">Opposition Team</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchDetail;