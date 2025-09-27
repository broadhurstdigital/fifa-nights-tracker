import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Upload, Play, Trophy } from 'lucide-react';
import type { SeasonWithStats, PlayerTeamAssignment, Team } from '@/types';
import { seasonsApi, fixturesApi } from '@/services/api';
import PlayerAssignment from '../players/PlayerAssignment';

interface SeasonDetailProps {
  season: SeasonWithStats;
  onBack: () => void;
}

const SeasonDetail: React.FC<SeasonDetailProps> = ({ season, onBack }) => {
  const [assignments, setAssignments] = useState<PlayerTeamAssignment[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'fixtures' | 'matches'>('overview');

  useEffect(() => {
    loadSeasonData();
  }, [season.id]);

  const loadSeasonData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, teamsRes] = await Promise.all([
        seasonsApi.getAssignments(season.id),
        seasonsApi.getAvailableTeams(season.id)
      ]);
      
      if (assignmentsRes.data.success && assignmentsRes.data.data) {
        setAssignments(assignmentsRes.data.data);
      }
      if (teamsRes.data.success && teamsRes.data.data) {
        setAvailableTeams(teamsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading season data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const response = await fixturesApi.importCsv(season.id, file);
      if (response.data.success) {
        alert(`Successfully imported ${response.data.data?.imported} fixtures`);
        await loadSeasonData();
      }
    } catch (error) {
      console.error('Error importing fixtures:', error);
      alert('Error importing fixtures. Please check the file format.');
    }
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{season.name}</h1>
          <p className="text-gray-500">{season.league}</p>
        </div>
        <div className="ml-auto">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            season.is_active 
              ? 'bg-success-100 text-success-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {season.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Trophy },
            { id: 'players', label: 'Players', icon: Users },
            { id: 'fixtures', label: 'Fixtures', icon: Upload },
            { id: 'matches', label: 'Matches', icon: Play },
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Players</h3>
            <p className="text-3xl font-bold text-primary-600">{season.player_count}</p>
            <p className="text-sm text-gray-500">Assigned to teams</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Matches</h3>
            <p className="text-3xl font-bold text-success-600">
              {season.completed_matches} / {season.total_matches}
            </p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress</h3>
            <p className="text-3xl font-bold text-warning-600">
              {season.total_matches > 0 ? Math.round((season.completed_matches / season.total_matches) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-500">Season completion</p>
          </div>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="card">
          <PlayerAssignment seasonId={season.id} onAssignmentChange={loadSeasonData} />
        </div>
      )}

      {activeTab === 'fixtures' && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Fixtures</h3>
            <div className="flex gap-2">
              <label className="btn-secondary px-4 py-2 cursor-pointer">
                <Upload className="w-4 h-4 mr-2 inline" />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          
          <div className="text-center py-8">
            <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No fixtures imported</h4>
            <p className="text-gray-500 mb-4">Upload a CSV file with fixture data to get started.</p>
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Matches</h3>
          <div className="text-center py-8">
            <Play className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h4>
            <p className="text-gray-500">Matches will appear here once fixtures are imported and players are assigned.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonDetail;