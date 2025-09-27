// Database model types

export interface Player {
  id: number;
  name: string;
  email?: string;
  created_at: Date;
}

export interface Team {
  id: number;
  name: string;
  league: string;
  country: string;
  strength_rating: number;
  created_at: Date;
}

export interface Season {
  id: number;
  name: string;
  league_name: string;
  year: number;
  status: 'setup' | 'active' | 'completed';
  created_at: Date;
}

export interface SeasonPlayer {
  id: number;
  season_id: number;
  player_id: number;
  chosen_team_id: number;
  joined_at: Date;
  // Joined data
  player?: Player;
  chosen_team?: Team;
}

export interface Fixture {
  id: number;
  season_id: number;
  round_number: number;
  match_number: number;
  home_team_id: number;
  away_team_id: number;
  match_date?: Date;
  location?: string;
  created_at: Date;
  // Joined data
  home_team?: Team;
  away_team?: Team;
}

export interface Match {
  id: number;
  fixture_id: number;
  season_id: number;
  player_home_id: number;
  player_away_id: number;
  home_score: number;
  away_score: number;
  status: 'scheduled' | 'completed' | 'simulated';
  completed_at?: Date;
  created_at: Date;
  // Joined data
  fixture?: Fixture;
  player_home?: Player;
  player_away?: Player;
}

export interface PlayerPerformance {
  id: number;
  match_id: number;
  player_id: number;
  team_id: number;
  goals_scored: number;
  goals_conceded: number;
  performance_type: 'chosen_team' | 'opposition_home' | 'opposition_away';
  created_at: Date;
  // Joined data
  player?: Player;
  team?: Team;
  match?: Match;
}

export interface Cup {
  id: number;
  name: string;
  country: string;
  eligible_leagues: string[];
  created_at: Date;
}

export interface CupFixture {
  id: number;
  cup_id: number;
  season_id: number;
  round_name: string;
  home_team_id: number;
  away_team_id: number;
  match_date?: Date;
  created_at: Date;
  // Joined data
  cup?: Cup;
  home_team?: Team;
  away_team?: Team;
}

export interface CupMatch {
  id: number;
  cup_fixture_id: number;
  season_id: number;
  player_home_id: number;
  player_away_id: number;
  home_score: number;
  away_score: number;
  penalties_home: number;
  penalties_away: number;
  status: 'scheduled' | 'completed';
  completed_at?: Date;
  created_at: Date;
  // Joined data
  cup_fixture?: CupFixture;
  player_home?: Player;
  player_away?: Player;
}

export interface PenaltyShootout {
  id: number;
  match_id?: number;
  cup_match_id?: number;
  winning_team_id: number;
  created_at: Date;
  // Joined data
  winning_team?: Team;
  attempts?: PenaltyAttempt[];
}

export interface PenaltyAttempt {
  id: number;
  shootout_id: number;
  player_id: number;
  attempt_number: number;
  guess: 'heads' | 'tails';
  coin_result: 'heads' | 'tails';
  successful: boolean;
  description?: string;
  created_at: Date;
  // Joined data
  player?: Player;
}

// Request/Response types
export interface CreatePlayerRequest {
  name: string;
  email?: string;
}

export interface CreateSeasonRequest {
  name: string;
  league_name: string;
  year: number;
}

export interface JoinSeasonRequest {
  player_id: number;
  chosen_team_id: number;
}

export interface CreateMatchRequest {
  fixture_id: number;
  player_home_id: number;
  player_away_id: number;
}

export interface UpdateMatchScoreRequest {
  home_score: number;
  away_score: number;
}

export interface PenaltyGuessRequest {
  guess: 'heads' | 'tails';
}

// CSV Import types
export interface FixtureCSVRow {
  'Match Number': string;
  'Round Number': string;
  Date: string;
  Location: string;
  'Home Team': string;
  'Away Team': string;
  Result?: string; // We ignore this field
}

// Statistics types
export interface PlayerStats {
  player_id: number;
  player_name: string;
  total_matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  goal_difference: number;
  points: number;
  chosen_team_stats: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goals_scored: number;
    goals_conceded: number;
    points: number;
  };
  opposition_stats: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goals_scored: number;
    goals_conceded: number;
    points: number;
  };
}