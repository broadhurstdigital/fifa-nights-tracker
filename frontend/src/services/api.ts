import axios from 'axios';
import type { 
  Player, 
  Team, 
  Season, 
  SeasonWithStats,
  PlayerTeamAssignment,
  Fixture,
  Match,
  PlayerStats,
  ApiResponse,
  PaginatedResponse 
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Players API
export const playersApi = {
  getAll: () => api.get<ApiResponse<Player[]>>('/players'),
  getById: (id: number) => api.get<ApiResponse<Player>>(`/players/${id}`),
  create: (data: { name: string; email?: string }) => 
    api.post<ApiResponse<Player>>('/players', data),
  update: (id: number, data: { name?: string; email?: string }) =>
    api.put<ApiResponse<Player>>(`/players/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/players/${id}`),
  getStats: (id: number, seasonId?: number) =>
    api.get<ApiResponse<PlayerStats>>(`/players/${id}/stats`, {
      params: seasonId ? { season_id: seasonId } : {}
    }),
};

// Teams API
export const teamsApi = {
  getAll: (league?: string) => 
    api.get<ApiResponse<Team[]>>('/teams', {
      params: league ? { league } : {}
    }),
  getById: (id: number) => api.get<ApiResponse<Team>>(`/teams/${id}`),
  create: (data: { name: string; league: string; strength?: number }) =>
    api.post<ApiResponse<Team>>('/teams', data),
  update: (id: number, data: { name?: string; league?: string; strength?: number }) =>
    api.put<ApiResponse<Team>>(`/teams/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/teams/${id}`),
};

// Seasons API
export const seasonsApi = {
  getAll: () => api.get<ApiResponse<SeasonWithStats[]>>('/seasons'),
  getById: (id: number) => api.get<ApiResponse<Season>>(`/seasons/${id}`),
  create: (data: { name: string; league: string; start_date: string; end_date?: string }) =>
    api.post<ApiResponse<Season>>('/seasons', data),
  update: (id: number, data: { name?: string; league?: string; start_date?: string; end_date?: string; is_active?: boolean }) =>
    api.put<ApiResponse<Season>>(`/seasons/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/seasons/${id}`),
  getAssignments: (id: number) =>
    api.get<ApiResponse<PlayerTeamAssignment[]>>(`/seasons/${id}/assignments`),
  assignPlayer: (id: number, data: { player_id: number; team_id: number }) =>
    api.post<ApiResponse<PlayerTeamAssignment>>(`/seasons/${id}/assignments`, data),
  removeAssignment: (id: number, assignmentId: number) =>
    api.delete<ApiResponse<void>>(`/seasons/${id}/assignments/${assignmentId}`),
  getAvailableTeams: (id: number) =>
    api.get<ApiResponse<Team[]>>(`/seasons/${id}/available-teams`),
  getLeaderboard: (id: number) =>
    api.get<ApiResponse<PlayerStats[]>>(`/seasons/${id}/leaderboard`),
};

// Fixtures API
export const fixturesApi = {
  getBySeason: (seasonId: number, round?: number) =>
    api.get<ApiResponse<Fixture[]>>(`/fixtures/season/${seasonId}`, {
      params: round ? { round } : {}
    }),
  importCsv: (seasonId: number, file: File) => {
    const formData = new FormData();
    formData.append('csv', file);
    return api.post<ApiResponse<{ imported: number; errors: string[] }>>(`/fixtures/season/${seasonId}/import-csv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  assignPlayersToRound: (seasonId: number, round: number) =>
    api.post<ApiResponse<{ assignments: number }>>(`/fixtures/season/${seasonId}/round/${round}/assign-players`),
};

// Matches API
export const matchesApi = {
  getBySeason: (seasonId: number, playerId?: number) =>
    api.get<ApiResponse<Match[]>>(`/matches/season/${seasonId}`, {
      params: playerId ? { player_id: playerId } : {}
    }),
  getById: (id: number) => api.get<ApiResponse<Match>>(`/matches/${id}`),
  recordResult: (id: number, data: { home_score: number; away_score: number }) =>
    api.post<ApiResponse<Match>>(`/matches/${id}/result`, data),
  startPenalties: (id: number) =>
    api.post<ApiResponse<{ penalty_id: string }>>(`/matches/${id}/penalties/start`),
  takePenalty: (id: number, penaltyId: string, data: { guess: 'heads' | 'tails' }) =>
    api.post<ApiResponse<{ successful: boolean; description: string; completed: boolean; winner_id?: number }>>(`/matches/${id}/penalties/${penaltyId}/take`, data),
};

// Simulation API
export const simulationApi = {
  simulateMatch: (homeTeamId: number, awayTeamId: number) =>
    api.post<ApiResponse<any>>('/simulation/match', { home_team_id: homeTeamId, away_team_id: awayTeamId }),
  updateTeamStrengths: (data: { team_id: number; strength: number }[]) =>
    api.put<ApiResponse<void>>('/simulation/team-strengths', { teams: data }),
  analyzeLeague: (league: string) =>
    api.get<ApiResponse<any>>(`/simulation/analyze/${league}`),
};

export default api;