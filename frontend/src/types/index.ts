export interface Player {
  id: number;
  name: string;
  email?: string;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  league: string;
  strength?: number;
  created_at: string;
}

export interface Season {
  id: number;
  name: string;
  league: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface SeasonWithStats extends Season {
  player_count: number;
  total_matches: number;
  completed_matches: number;
}

export interface PlayerTeamAssignment {
  id: number;
  player_id: number;
  season_id: number;
  team_id: number;
  assigned_at: string;
  player?: Player;
  team?: Team;
}

export interface Fixture {
  id: number;
  season_id: number;
  round_number: number;
  home_team_id: number;
  away_team_id: number;
  match_date: string;
  created_at: string;
  home_team?: Team;
  away_team?: Team;
}

export interface Match {
  id: number;
  fixture_id: number;
  home_player_id: number;
  away_player_id: number;
  home_score?: number;
  away_score?: number;
  winner_id?: number;
  completed_at?: string;
  penalties_home?: number;
  penalties_away?: number;
  penalty_winner_id?: number;
  created_at: string;
  fixture?: Fixture;
  home_player?: Player;
  away_player?: Player;
}

export interface Performance {
  id: number;
  match_id: number;
  player_id: number;
  team_id: number;
  opponent_team_id: number;
  performance_type: 'chosen_team' | 'opposition_team';
  goals_for: number;
  goals_against: number;
  result: 'win' | 'draw' | 'loss';
  penalties_for?: number;
  penalties_against?: number;
  penalty_result?: 'win' | 'loss';
  created_at: string;
}

export interface PlayerStats {
  player_id: number;
  player_name: string;
  total_matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  chosen_team_stats: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
  };
  opposition_team_stats: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
  };
}

export interface PenaltyShootoutResult {
  winner_id: number;
  home_penalties: number;
  away_penalties: number;
  attempts: Array<{
    player_id: number;
    successful: boolean;
    description: string;
  }>;
}

export interface MatchSimulationResult {
  home_score: number;
  away_score: number;
  match_events: string[];
  probabilities: {
    home_win: number;
    draw: number;
    away_win: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}