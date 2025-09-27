import React, { useState } from 'react';
import { ArrowLeft, Target, Coins, Trophy, AlertCircle } from 'lucide-react';
import { matchesApi } from '@/services/api';
import type { Match } from '@/types';

interface ResultEntryProps {
  match: Match;
  onBack: () => void;
  onComplete: () => void;
}

interface PenaltyState {
  penaltyId: string | null;
  homeScore: number;
  awayScore: number;
  currentPlayer: 'home' | 'away';
  attempts: Array<{
    player: 'home' | 'away';
    successful: boolean;
    description: string;
  }>;
  completed: boolean;
  winnerId: number | null;
}

const ResultEntry: React.FC<ResultEntryProps> = ({ match, onBack, onComplete }) => {
  const [homeScore, setHomeScore] = useState(match.home_score?.toString() || '');
  const [awayScore, setAwayScore] = useState(match.away_score?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPenalties, setShowPenalties] = useState(false);
  const [penaltyState, setPenaltyState] = useState<PenaltyState>({
    penaltyId: null,
    homeScore: 0,
    awayScore: 0,
    currentPlayer: 'home',
    attempts: [],
    completed: false,
    winnerId: null,
  });

  const handleSubmitResult = async () => {
    if (!homeScore || !awayScore) {
      setError('Please enter scores for both teams');
      return;
    }

    const homeScoreNum = parseInt(homeScore);
    const awayScoreNum = parseInt(awayScore);

    if (isNaN(homeScoreNum) || isNaN(awayScoreNum) || homeScoreNum < 0 || awayScoreNum < 0) {
      setError('Please enter valid scores (0 or greater)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await matchesApi.recordResult(match.id, {
        home_score: homeScoreNum,
        away_score: awayScoreNum,
      });

      if (response.data.success) {
        // Check if scores are tied and we need penalties
        if (homeScoreNum === awayScoreNum) {
          setShowPenalties(true);
          await startPenaltyShootout();
        } else {
          onComplete();
        }
      }
    } catch (err) {
      setError('Failed to record result. Please try again.');
      console.error('Error recording result:', err);
    } finally {
      setLoading(false);
    }
  };

  const startPenaltyShootout = async () => {
    try {
      const response = await matchesApi.startPenalties(match.id);
      if (response.data.success && response.data.data?.penalty_id) {
        setPenaltyState(prev => ({
          ...prev,
          penaltyId: response.data.data!.penalty_id,
        }));
      }
    } catch (err) {
      console.error('Error starting penalties:', err);
      setError('Failed to start penalty shootout');
    }
  };

  const takePenalty = async (guess: 'heads' | 'tails') => {
    if (!penaltyState.penaltyId) return;

    try {
      const response = await matchesApi.takePenalty(match.id, penaltyState.penaltyId, { guess });
      
      if (response.data.success && response.data.data) {
        const { successful, description, completed, winner_id } = response.data.data;
        
        const newAttempt = {
          player: penaltyState.currentPlayer,
          successful,
          description,
        };

        setPenaltyState(prev => {
          const newState = {
            ...prev,
            attempts: [...prev.attempts, newAttempt],
            currentPlayer: prev.currentPlayer === 'home' ? 'away' as const : 'home' as const,
          };

          if (successful) {
            if (prev.currentPlayer === 'home') {
              newState.homeScore = prev.homeScore + 1;
            } else {
              newState.awayScore = prev.awayScore + 1;
            }
          }

          if (completed && winner_id) {
            newState.completed = true;
            newState.winnerId = winner_id;
          }

          return newState;
        });

        if (completed) {
          setTimeout(() => {
            onComplete();
          }, 2000); // Give time to see the final result
        }
      }
    } catch (err) {
      console.error('Error taking penalty:', err);
      setError('Failed to take penalty. Please try again.');
    }
  };

  const getWinnerName = () => {
    if (!penaltyState.winnerId) return '';
    if (penaltyState.winnerId === match.home_player_id) return match.home_player?.name;
    if (penaltyState.winnerId === match.away_player_id) return match.away_player?.name;
    return '';
  };

  if (showPenalties) {
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Penalty Shootout</h1>
            <p className="text-gray-500">
              {match.fixture?.home_team?.name} vs {match.fixture?.away_team?.name} • {homeScore}-{awayScore}
            </p>
          </div>
        </div>

        {error && (
          <div className="card bg-danger-50 border-danger-200">
            <div className="flex items-center gap-2 text-danger-700">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Penalty Score */}
        <div className="card">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Penalty Score</h2>
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <h3 className="font-medium text-gray-900">{match.fixture?.home_team?.name}</h3>
                <p className="text-sm text-gray-500">{match.home_player?.name}</p>
                <div className="text-3xl font-bold text-primary-600">{penaltyState.homeScore}</div>
              </div>
              <div className="text-2xl font-bold text-gray-400">-</div>
              <div className="text-center">
                <h3 className="font-medium text-gray-900">{match.fixture?.away_team?.name}</h3>
                <p className="text-sm text-gray-500">{match.away_player?.name}</p>
                <div className="text-3xl font-bold text-danger-600">{penaltyState.awayScore}</div>
              </div>
            </div>
          </div>
        </div>

        {penaltyState.completed ? (
          <div className="card">
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Penalty Shootout Complete!</h2>
              <p className="text-lg text-gray-700">
                Winner: <span className="font-semibold">{getWinnerName()}</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">Redirecting to match details...</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {penaltyState.currentPlayer === 'home' ? match.home_player?.name : match.away_player?.name}'s Turn
                </h3>
                <p className="text-gray-600">
                  Playing for {penaltyState.currentPlayer === 'home' ? match.fixture?.home_team?.name : match.fixture?.away_team?.name}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Coins className="w-16 h-16 text-yellow-500" />
                </div>
                <p className="text-gray-700">Choose your call for the coin flip:</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => takePenalty('heads')}
                    className="btn-primary px-8 py-3 text-lg"
                    disabled={loading}
                  >
                    Heads
                  </button>
                  <button
                    onClick={() => takePenalty('tails')}
                    className="btn-primary px-8 py-3 text-lg"
                    disabled={loading}
                  >
                    Tails
                  </button>
                </div>
                {loading && (
                  <p className="text-sm text-gray-500">Taking penalty...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Penalty Attempts */}
        {penaltyState.attempts.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Penalty Attempts</h3>
            <div className="space-y-3">
              {penaltyState.attempts.map((attempt, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      attempt.successful ? 'bg-success-500' : 'bg-danger-500'
                    }`}></div>
                    <span className="font-medium">
                      {attempt.player === 'home' ? match.home_player?.name : match.away_player?.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`font-medium ${
                      attempt.successful ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {attempt.successful ? 'GOAL' : 'MISS'}
                    </span>
                    <p className="text-xs text-gray-500">{attempt.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enter Match Result</h1>
          <p className="text-gray-500">
            {match.fixture?.home_team?.name} vs {match.fixture?.away_team?.name}
          </p>
        </div>
      </div>

      {error && (
        <div className="card bg-danger-50 border-danger-200">
          <div className="flex items-center gap-2 text-danger-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Score Entry */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Match Result</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Home Team */}
          <div className="text-center">
            <h3 className="font-medium text-gray-900 mb-2">{match.fixture?.home_team?.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{match.home_player?.name}</p>
            <div className="relative">
              <Target className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="input w-full pl-10 text-center text-2xl font-bold"
                placeholder="0"
              />
            </div>
          </div>

          {/* VS */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400 mb-8">VS</div>
          </div>

          {/* Away Team */}
          <div className="text-center">
            <h3 className="font-medium text-gray-900 mb-2">{match.fixture?.away_team?.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{match.away_player?.name}</p>
            <div className="relative">
              <Target className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="input w-full pl-10 text-center text-2xl font-bold"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleSubmitResult}
            disabled={loading || !homeScore || !awayScore}
            className="btn-primary px-8 py-3 text-lg"
          >
            {loading ? 'Recording Result...' : 'Record Result'}
          </button>
        </div>

        {homeScore && awayScore && homeScore === awayScore && (
          <div className="mt-4 p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-center gap-2 text-warning-700">
              <Coins className="w-5 h-5" />
              <p className="font-medium">Tied game - penalty shootout will follow!</p>
            </div>
            <p className="text-sm text-warning-600 mt-1">
              After recording this result, you'll proceed to a coin-flip penalty shootout.
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
        <ul className="space-y-2 text-gray-600">
          <li>• Enter the final score for both teams</li>
          <li>• If the game is tied, a penalty shootout will automatically start</li>
          <li>• Penalty shootouts use coin-flip mechanics for fairness</li>
          <li>• Performance will be tracked for both players automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default ResultEntry;