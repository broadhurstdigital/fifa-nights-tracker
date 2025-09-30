import { Pool } from 'pg';

// Inline SQL migration - no file system dependency
const INITIAL_SCHEMA_SQL = `
-- FIFA League Tracker Database Schema

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table with strength ratings
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    league VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    strength_rating INTEGER DEFAULT 50 CHECK (strength_rating >= 1 AND strength_rating <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    league_name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player participation in seasons
CREATE TABLE IF NOT EXISTS season_players (
    id SERIAL PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    chosen_team_id INTEGER REFERENCES teams(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(season_id, player_id),
    UNIQUE(season_id, chosen_team_id)
);

-- League fixtures imported from CSV
CREATE TABLE IF NOT EXISTS fixtures (
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
CREATE TABLE IF NOT EXISTS matches (
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
CREATE TABLE IF NOT EXISTS player_performances (
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
CREATE TABLE IF NOT EXISTS cups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    eligible_leagues TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cup fixtures (separate from league fixtures)
CREATE TABLE IF NOT EXISTS cup_fixtures (
    id SERIAL PRIMARY KEY,
    cup_id INTEGER REFERENCES cups(id) ON DELETE CASCADE,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    round_name VARCHAR(50) NOT NULL,
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    match_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cup matches (actual games played)
CREATE TABLE IF NOT EXISTS cup_matches (
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
CREATE TABLE IF NOT EXISTS penalty_shootouts (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    cup_match_id INTEGER REFERENCES cup_matches(id) ON DELETE CASCADE,
    winning_team_id INTEGER REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ((match_id IS NOT NULL AND cup_match_id IS NULL) OR (match_id IS NULL AND cup_match_id IS NOT NULL))
);

-- Individual penalty attempts
CREATE TABLE IF NOT EXISTS penalty_attempts (
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
CREATE INDEX IF NOT EXISTS idx_fixtures_season_round ON fixtures(season_id, round_number);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_player_performances_player ON player_performances(player_id);
CREATE INDEX IF NOT EXISTS idx_player_performances_type ON player_performances(performance_type);
CREATE INDEX IF NOT EXISTS idx_season_players_season ON season_players(season_id);
`;

const SEED_DATA_SQL = `
-- Insert default cups (if not exists)
INSERT INTO cups (name, country, eligible_leagues) 
SELECT 'FA Cup', 'England', ARRAY['Premier League', 'Championship', 'League One', 'League Two']
WHERE NOT EXISTS (SELECT 1 FROM cups WHERE name = 'FA Cup');

INSERT INTO cups (name, country, eligible_leagues) 
SELECT 'EFL Cup', 'England', ARRAY['Premier League', 'Championship', 'League One', 'League Two']
WHERE NOT EXISTS (SELECT 1 FROM cups WHERE name = 'EFL Cup');

-- Insert sample teams (if not exists)
INSERT INTO teams (name, league, country, strength_rating)
SELECT * FROM (VALUES
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
    ('Bournemouth', 'Premier League', 'England', 54)
) AS new_teams(name, league, country, strength_rating)
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE teams.name = new_teams.name);
`;

export async function initializeDatabase(db: Pool): Promise<void> {
  try {
    console.log('Initializing database schema...');

    // Execute schema creation
    await db.query(INITIAL_SCHEMA_SQL);
    console.log('Database schema created successfully');

    // Execute seed data
    await db.query(SEED_DATA_SQL);
    console.log('Seed data inserted successfully');

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}