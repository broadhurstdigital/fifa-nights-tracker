-- FIFA League Tracker Database Schema

-- Players table
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table with strength ratings
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    league VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    strength_rating INTEGER DEFAULT 50 CHECK (strength_rating >= 1 AND strength_rating <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seasons table
CREATE TABLE seasons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    league_name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player participation in seasons
CREATE TABLE season_players (
    id SERIAL PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    chosen_team_id INTEGER REFERENCES teams(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(season_id, player_id),
    UNIQUE(season_id, chosen_team_id)
);

-- League fixtures imported from CSV
CREATE TABLE fixtures (
    id SERIAL PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    match_date TIMESTAMP,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(season_id, match_number)
);

-- Actual matches played (linking fixtures with players)
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    fixture_id INTEGER REFERENCES fixtures(id) ON DELETE CASCADE,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    player_home_id INTEGER REFERENCES players(id),
    player_away_id INTEGER REFERENCES players(id),
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'simulated')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player performance tracking (multiple contexts per player)
CREATE TABLE player_performances (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id),
    team_id INTEGER REFERENCES teams(id),
    goals_scored INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    performance_type VARCHAR(20) NOT NULL CHECK (performance_type IN ('chosen_team', 'opposition_home', 'opposition_away')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cup competitions
CREATE TABLE cups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    eligible_leagues TEXT[], -- Array of league names
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cup fixtures (separate from league fixtures)
CREATE TABLE cup_fixtures (
    id SERIAL PRIMARY KEY,
    cup_id INTEGER REFERENCES cups(id) ON DELETE CASCADE,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    round_name VARCHAR(50) NOT NULL, -- e.g., 'Round 1', 'Quarter-Final', 'Semi-Final', 'Final'
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    match_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cup matches (actual games played)
CREATE TABLE cup_matches (
    id SERIAL PRIMARY KEY,
    cup_fixture_id INTEGER REFERENCES cup_fixtures(id) ON DELETE CASCADE,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    player_home_id INTEGER REFERENCES players(id),
    player_away_id INTEGER REFERENCES players(id),
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    penalties_home INTEGER DEFAULT 0,
    penalties_away INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Penalty shootouts
CREATE TABLE penalty_shootouts (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    cup_match_id INTEGER REFERENCES cup_matches(id) ON DELETE CASCADE,
    winning_team_id INTEGER REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ((match_id IS NOT NULL AND cup_match_id IS NULL) OR (match_id IS NULL AND cup_match_id IS NOT NULL))
);

-- Individual penalty attempts
CREATE TABLE penalty_attempts (
    id SERIAL PRIMARY KEY,
    shootout_id INTEGER REFERENCES penalty_shootouts(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id),
    attempt_number INTEGER NOT NULL,
    guess VARCHAR(10) NOT NULL CHECK (guess IN ('heads', 'tails')),
    coin_result VARCHAR(10) NOT NULL CHECK (coin_result IN ('heads', 'tails')),
    successful BOOLEAN NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_fixtures_season_round ON fixtures(season_id, round_number);
CREATE INDEX idx_matches_season ON matches(season_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_player_performances_player ON player_performances(player_id);
CREATE INDEX idx_player_performances_type ON player_performances(performance_type);
CREATE INDEX idx_season_players_season ON season_players(season_id);

-- Insert some default cups for English football
INSERT INTO cups (name, country, eligible_leagues) VALUES 
('FA Cup', 'England', ARRAY['Premier League', 'Championship', 'League One', 'League Two']),
('EFL Cup', 'England', ARRAY['Premier League', 'Championship', 'League One', 'League Two']);

-- Insert some sample team strength ratings (you can adjust these)
INSERT INTO teams (name, league, country, strength_rating) VALUES 
-- Premier League teams
('Manchester City', 'Premier League', 'England', 95),
('Arsenal', 'Premier League', 'England', 88),
('Liverpool', 'Premier League', 'England', 87),
('Chelsea', 'Premier League', 'England', 82),
('Newcastle United', 'Premier League', 'England', 75),
('Manchester United', 'Premier League', 'England', 78),
('Tottenham Hotspur', 'Premier League', 'England', 76),
('Brighton & Hove Albion', 'Premier League', 'England', 68),
('West Ham United', 'Premier League', 'England', 65),
('Crystal Palace', 'Premier League', 'England', 62),
('Aston Villa', 'Premier League', 'England', 70),
('Fulham', 'Premier League', 'England', 60),
('Wolverhampton Wanderers', 'Premier League', 'England', 58),
('Everton', 'Premier League', 'England', 55),
('Brentford', 'Premier League', 'England', 57),
('Nottingham Forest', 'Premier League', 'England', 52),
('Luton Town', 'Premier League', 'England', 45),
('Burnley', 'Premier League', 'England', 48),
('Sheffield United', 'Premier League', 'England', 46),
('Bournemouth', 'Premier League', 'England', 54);