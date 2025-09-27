import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';

interface CreateSeasonModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; league: string; start_date: string; end_date?: string }) => void;
}

const LEAGUE_OPTIONS = [
  'Premier League',
  'Championship',
  'League One',
  'League Two',
  'La Liga',
  'Bundesliga',
  'Serie A',
  'Ligue 1',
  'Eredivisie',
  'Custom League'
];

const CreateSeasonModal: React.FC<CreateSeasonModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    league: '',
    customLeague: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const league = formData.league === 'Custom League' ? formData.customLeague : formData.league;
      await onCreate({
        name: formData.name,
        league,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
      });
    } catch (error) {
      console.error('Error creating season:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New Season</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Season Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="input w-full"
              placeholder="e.g., Premier League 2024/25"
              required
            />
          </div>

          <div>
            <label htmlFor="league" className="block text-sm font-medium text-gray-700 mb-1">
              League *
            </label>
            <select
              id="league"
              value={formData.league}
              onChange={(e) => handleInputChange('league', e.target.value)}
              className="input w-full"
              required
            >
              <option value="">Select a league...</option>
              {LEAGUE_OPTIONS.map((league) => (
                <option key={league} value={league}>
                  {league}
                </option>
              ))}
            </select>
          </div>

          {formData.league === 'Custom League' && (
            <div>
              <label htmlFor="customLeague" className="block text-sm font-medium text-gray-700 mb-1">
                Custom League Name *
              </label>
              <input
                type="text"
                id="customLeague"
                value={formData.customLeague}
                onChange={(e) => handleInputChange('customLeague', e.target.value)}
                className="input w-full"
                placeholder="Enter custom league name"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <div className="relative">
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className="input w-full pl-10"
                required
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date (Optional)
            </label>
            <div className="relative">
              <input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className="input w-full pl-10"
                min={formData.start_date}
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Season will be created as inactive</li>
              <li>• You can assign players to teams</li>
              <li>• Import fixtures via CSV file</li>
              <li>• Activate season to start tracking matches</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary py-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary py-2"
              disabled={loading || !formData.name || !formData.league || (formData.league === 'Custom League' && !formData.customLeague)}
            >
              {loading ? 'Creating...' : 'Create Season'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSeasonModal;