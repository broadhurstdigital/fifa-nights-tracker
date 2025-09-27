import React, { useState, useEffect } from 'react';
import { Plus, User, Trophy, BarChart3, Edit3, Trash2, Mail } from 'lucide-react';
import { playersApi } from '@/services/api';
import type { Player, PlayerStats } from '@/types';
import CreatePlayerModal from './CreatePlayerModal';
import PlayerDetail from './PlayerDetail';

const PlayerList: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const response = await playersApi.getAll();
      if (response.data.success && response.data.data) {
        setPlayers(response.data.data);
      }
    } catch (err) {
      setError('Failed to load players');
      console.error('Error loading players:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlayer = async (playerData: { name: string; email?: string }) => {
    try {
      const response = await playersApi.create(playerData);
      if (response.data.success) {
        setShowCreateModal(false);
        await loadPlayers();
      }
    } catch (err) {
      console.error('Error creating player:', err);
    }
  };

  const handleDeletePlayer = async (playerId: number) => {
    if (confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      try {
        await playersApi.delete(playerId);
        await loadPlayers();
      } catch (err) {
        console.error('Error deleting player:', err);
      }
    }
  };

  if (selectedPlayer) {
    return (
      <PlayerDetail 
        player={selectedPlayer} 
        onBack={() => setSelectedPlayer(null)} 
      />
    );
  }

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
          <button onClick={loadPlayers} className="btn-primary px-4 py-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Players</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-4 py-2 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Player
        </button>
      </div>

      {players.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No players yet</h3>
            <p className="text-gray-500 mb-6">Add your first player to start building your FIFA league.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary px-6 py-2"
            >
              Add Your First Player
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {players.map((player) => (
            <div key={player.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{player.name}</h3>
                    {player.email && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="w-4 h-4 mr-1" />
                        {player.email}
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      Joined {new Date(player.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedPlayer(player)}
                    className="btn-primary px-3 py-1 text-sm flex items-center gap-1"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Stats
                  </button>
                  
                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="p-2 rounded text-danger-600 hover:bg-danger-50"
                    title="Delete player"
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
        <CreatePlayerModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePlayer}
        />
      )}
    </div>
  );
};

export default PlayerList;