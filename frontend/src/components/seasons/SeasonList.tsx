import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, Trophy, Play, Pause, Edit3, Trash2 } from 'lucide-react';
import { seasonsApi } from '@/services/api';
import type { SeasonWithStats } from '@/types';
import CreateSeasonModal from './CreateSeasonModal';

interface SeasonListProps {
  onSeasonSelect: (season: SeasonWithStats) => void;
}

const SeasonList: React.FC<SeasonListProps> = ({ onSeasonSelect }) => {
  const [seasons, setSeasons] = useState<SeasonWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      const response = await seasonsApi.getAll();
      if (response.data.success && response.data.data) {
        setSeasons(response.data.data);
      }
    } catch (err) {
      setError('Failed to load seasons');
      console.error('Error loading seasons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeason = async (seasonData: { name: string; league: string; start_date: string; end_date?: string }) => {
    try {
      const response = await seasonsApi.create(seasonData);
      if (response.data.success) {
        setShowCreateModal(false);
        await loadSeasons();
      }
    } catch (err) {
      console.error('Error creating season:', err);
    }
  };

  const toggleSeasonStatus = async (season: SeasonWithStats) => {
    try {
      await seasonsApi.update(season.id, { is_active: !season.is_active });
      await loadSeasons();
    } catch (err) {
      console.error('Error updating season:', err);
    }
  };

  const deleteSeason = async (seasonId: number) => {
    if (confirm('Are you sure you want to delete this season? This action cannot be undone.')) {
      try {
        await seasonsApi.delete(seasonId);
        await loadSeasons();
      } catch (err) {
        console.error('Error deleting season:', err);
      }
    }
  };

  const getStatusBadge = (season: SeasonWithStats) => {
    if (season.is_active) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
          <Play className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Pause className="w-3 h-3 mr-1" />
        Inactive
      </span>
    );
  };

  const getProgressPercentage = (season: SeasonWithStats) => {
    if (season.total_matches === 0) return 0;
    return Math.round((season.completed_matches / season.total_matches) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-danger-600 mb-4">{error}</p>
          <button onClick={loadSeasons} className="btn-primary px-4 py-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Seasons</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-4 py-2 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Season
        </button>
      </div>

      {seasons.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No seasons yet</h3>
            <p className="text-gray-500 mb-6">Create your first season to start tracking FIFA league matches.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary px-6 py-2"
            >
              Create Your First Season
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => (
            <div key={season.id} className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{season.name}</h3>
                  <p className="text-sm text-gray-500">{season.league}</p>
                </div>
                {getStatusBadge(season)}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(season.start_date).toLocaleDateString()}
                  {season.end_date && ` - ${new Date(season.end_date).toLocaleDateString()}`}
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {season.player_count} players
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Trophy className="w-4 h-4 mr-2" />
                  {season.completed_matches} / {season.total_matches} matches
                </div>

                {season.total_matches > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{getProgressPercentage(season)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(season)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={() => onSeasonSelect(season)}
                  className="btn-primary px-3 py-1 text-sm"
                >
                  Manage
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleSeasonStatus(season)}
                    className={`p-1 rounded ${
                      season.is_active 
                        ? 'text-warning-600 hover:bg-warning-50' 
                        : 'text-success-600 hover:bg-success-50'
                    }`}
                    title={season.is_active ? 'Pause season' : 'Activate season'}
                  >
                    {season.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => deleteSeason(season.id)}
                    className="p-1 rounded text-danger-600 hover:bg-danger-50"
                    title="Delete season"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateSeasonModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSeason}
        />
      )}
    </div>
  );
};

export default SeasonList;