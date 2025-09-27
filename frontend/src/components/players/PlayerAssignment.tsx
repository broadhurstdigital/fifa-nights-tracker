import React, { useState, useEffect } from 'react';
import { Plus, X, Users, Shirt } from 'lucide-react';
import { playersApi, seasonsApi, teamsApi } from '@/services/api';
import type { Player, Team, PlayerTeamAssignment } from '@/types';

interface PlayerAssignmentProps {
  seasonId: number;
  onAssignmentChange: () => void;
}

const PlayerAssignment: React.FC<PlayerAssignmentProps> = ({ seasonId, onAssignmentChange }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<PlayerTeamAssignment[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [seasonId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [playersRes, teamsRes, assignmentsRes] = await Promise.all([
        playersApi.getAll(),
        seasonsApi.getAvailableTeams(seasonId),
        seasonsApi.getAssignments(seasonId)
      ]);

      if (playersRes.data.success && playersRes.data.data) {
        setPlayers(playersRes.data.data);
      }
      if (teamsRes.data.success && teamsRes.data.data) {
        setAvailableTeams(teamsRes.data.data);
      }
      if (assignmentsRes.data.success && assignmentsRes.data.data) {
        setAssignments(assignmentsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlayer = async () => {
    if (!selectedPlayer || !selectedTeam) return;

    try {
      const response = await seasonsApi.assignPlayer(seasonId, {
        player_id: selectedPlayer,
        team_id: selectedTeam
      });

      if (response.data.success) {
        setShowAssignModal(false);
        setSelectedPlayer(null);
        setSelectedTeam(null);
        await loadData();
        onAssignmentChange();
      }
    } catch (error) {
      console.error('Error assigning player:', error);
      alert('Error assigning player. This team might already be taken.');
    }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    if (confirm('Are you sure you want to remove this player assignment?')) {
      try {
        await seasonsApi.removeAssignment(seasonId, assignmentId);
        await loadData();
        onAssignmentChange();
      } catch (error) {
        console.error('Error removing assignment:', error);
      }
    }
  };

  const getAssignedPlayerIds = () => assignments.map(a => a.player_id);
  const getAssignedTeamIds = () => assignments.map(a => a.team_id);
  
  const unassignedPlayers = players.filter(p => !getAssignedPlayerIds().includes(p.id));
  const availableTeamsForAssignment = availableTeams.filter(t => !getAssignedTeamIds().includes(t.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Player Assignments</h3>
        <button
          onClick={() => setShowAssignModal(true)}
          className="btn-primary px-4 py-2 flex items-center gap-2"
          disabled={unassignedPlayers.length === 0 || availableTeamsForAssignment.length === 0}
        >
          <Plus className="w-4 h-4" />
          Assign Player
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No players assigned</h4>
          <p className="text-gray-500 mb-4">Assign players to teams to start the season.</p>
          {unassignedPlayers.length > 0 && availableTeamsForAssignment.length > 0 && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="btn-primary px-4 py-2"
            >
              Assign First Player
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{assignment.player?.name}</h4>
                  <div className="flex items-center text-sm text-gray-500">
                    <Shirt className="w-4 h-4 mr-1" />
                    {assignment.team?.name}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemoveAssignment(assignment.id)}
                className="text-danger-600 hover:bg-danger-50 p-2 rounded"
                title="Remove assignment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-primary-50 rounded-lg">
          <h4 className="text-lg font-semibold text-primary-700">{assignments.length}</h4>
          <p className="text-sm text-primary-600">Players Assigned</p>
        </div>
        <div className="text-center p-4 bg-success-50 rounded-lg">
          <h4 className="text-lg font-semibold text-success-700">{availableTeamsForAssignment.length}</h4>
          <p className="text-sm text-success-600">Teams Available</p>
        </div>
        <div className="text-center p-4 bg-warning-50 rounded-lg">
          <h4 className="text-lg font-semibold text-warning-700">{unassignedPlayers.length}</h4>
          <p className="text-sm text-warning-600">Players Unassigned</p>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Assign Player to Team</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Player
                </label>
                <select
                  value={selectedPlayer || ''}
                  onChange={(e) => setSelectedPlayer(Number(e.target.value))}
                  className="input w-full"
                >
                  <option value="">Choose a player...</option>
                  {unassignedPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Team
                </label>
                <select
                  value={selectedTeam || ''}
                  onChange={(e) => setSelectedTeam(Number(e.target.value))}
                  className="input w-full"
                >
                  <option value="">Choose a team...</option>
                  {availableTeamsForAssignment.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  This player will be assigned to play as this team throughout the season. 
                  They will also be available to play as opposition teams when needed.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 btn-secondary py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignPlayer}
                  className="flex-1 btn-primary py-2"
                  disabled={!selectedPlayer || !selectedTeam}
                >
                  Assign Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerAssignment;