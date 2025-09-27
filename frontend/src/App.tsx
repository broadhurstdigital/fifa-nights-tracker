import React, { useState } from 'react';
import { Home, Users, Trophy, BarChart3, Settings, Play } from 'lucide-react';
import SeasonManagement from './components/seasons/SeasonManagement';
import PlayerList from './components/players/PlayerList';
import MatchList from './components/matches/MatchList';
import StatsDashboard from './components/dashboard/StatsDashboard';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navigation: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { id: 'seasons', label: 'Seasons', icon: <Trophy className="w-5 h-5" /> },
  { id: 'players', label: 'Players', icon: <Users className="w-5 h-5" /> },
  { id: 'matches', label: 'Matches', icon: <Play className="w-5 h-5" /> },
  { id: 'stats', label: 'Statistics', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Trophy className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">FIFA Nights League</h1>
            </div>
            <div className="text-sm text-gray-500">
              Welcome back!
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-white rounded-lg shadow-sm p-4">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === item.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Seasons</h3>
                    <p className="text-3xl font-bold text-primary-600">0</p>
                    <p className="text-sm text-gray-500">Currently running</p>
                  </div>
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Players</h3>
                    <p className="text-3xl font-bold text-success-600">0</p>
                    <p className="text-sm text-gray-500">Registered players</p>
                  </div>
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Matches Played</h3>
                    <p className="text-3xl font-bold text-warning-600">0</p>
                    <p className="text-sm text-gray-500">Total completed</p>
                  </div>
                </div>
                
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setActiveTab('seasons')}
                      className="btn-primary px-4 py-2"
                    >
                      Create New Season
                    </button>
                    <button 
                      onClick={() => setActiveTab('players')}
                      className="btn-secondary px-4 py-2"
                    >
                      Add Player
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seasons' && <SeasonManagement />}

            {activeTab === 'players' && <PlayerList />}

            {activeTab === 'matches' && <MatchList />}

            {activeTab === 'stats' && <StatsDashboard />}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Settings</h3>
                  <p className="text-gray-500">
                    Settings and configuration options will be available here.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;