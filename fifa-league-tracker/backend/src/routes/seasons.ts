import express from 'express';
import { db } from '../index';
import { CreateSeasonRequest, JoinSeasonRequest } from '../models/types';

const router = express.Router();

// Get all seasons
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.*,
        COUNT(sp.player_id) as player_count
      FROM seasons s
      LEFT JOIN season_players sp ON s.id = sp.season_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

// Get season by ID with players
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get season details
    const seasonResult = await db.query('SELECT * FROM seasons WHERE id = $1', [id]);
    if (seasonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Get players in this season
    const playersResult = await db.query(`
      SELECT 
        sp.*,
        p.name as player_name,
        p.email as player_email,
        t.name as chosen_team_name,
        t.league as chosen_team_league
      FROM season_players sp
      JOIN players p ON sp.player_id = p.id
      JOIN teams t ON sp.chosen_team_id = t.id
      WHERE sp.season_id = $1
      ORDER BY sp.joined_at
    `, [id]);
    
    const season = {
      ...seasonResult.rows[0],
      players: playersResult.rows
    };
    
    res.json(season);
  } catch (error) {
    console.error('Error fetching season:', error);
    res.status(500).json({ error: 'Failed to fetch season' });
  }
});

// Create new season
router.post('/', async (req, res) => {
  try {
    const { name, league_name, year }: CreateSeasonRequest = req.body;
    
    if (!name || !league_name || !year) {
      return res.status(400).json({ error: 'Name, league name, and year are required' });
    }
    
    if (year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'Year must be between 2000 and 2100' });
    }
    
    const result = await db.query(
      'INSERT INTO seasons (name, league_name, year) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), league_name.trim(), year]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating season:', error);
    res.status(500).json({ error: 'Failed to create season' });
  }
});

// Update season status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['setup', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be setup, active, or completed' });
    }
    
    const result = await db.query(
      'UPDATE seasons SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating season status:', error);
    res.status(500).json({ error: 'Failed to update season status' });
  }
});

// Add player to season
router.post('/:id/players', async (req, res) => {
  try {
    const { id } = req.params;
    const { player_id, chosen_team_id }: JoinSeasonRequest = req.body;
    
    if (!player_id || !chosen_team_id) {
      return res.status(400).json({ error: 'Player ID and chosen team ID are required' });
    }
    
    // Check if season exists and is in setup
    const seasonCheck = await db.query('SELECT * FROM seasons WHERE id = $1', [id]);
    if (seasonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    if (seasonCheck.rows[0].status !== 'setup') {
      return res.status(400).json({ error: 'Can only add players to seasons in setup status' });
    }
    
    // Check if player exists
    const playerCheck = await db.query('SELECT * FROM players WHERE id = $1', [player_id]);
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if team exists
    const teamCheck = await db.query('SELECT * FROM teams WHERE id = $1', [chosen_team_id]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if player is already in this season
    const existingCheck = await db.query(
      'SELECT * FROM season_players WHERE season_id = $1 AND player_id = $2',
      [id, player_id]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Player is already in this season' });
    }
    
    // Check if team is already chosen by another player
    const teamTakenCheck = await db.query(
      'SELECT * FROM season_players WHERE season_id = $1 AND chosen_team_id = $2',
      [id, chosen_team_id]
    );
    if (teamTakenCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Team is already chosen by another player' });
    }
    
    const result = await db.query(
      'INSERT INTO season_players (season_id, player_id, chosen_team_id) VALUES ($1, $2, $3) RETURNING *',
      [id, player_id, chosen_team_id]
    );
    
    // Return with joined data
    const joinedResult = await db.query(`
      SELECT 
        sp.*,
        p.name as player_name,
        p.email as player_email,
        t.name as chosen_team_name,
        t.league as chosen_team_league
      FROM season_players sp
      JOIN players p ON sp.player_id = p.id
      JOIN teams t ON sp.chosen_team_id = t.id
      WHERE sp.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json(joinedResult.rows[0]);
  } catch (error) {
    console.error('Error adding player to season:', error);
    res.status(500).json({ error: 'Failed to add player to season' });
  }
});

// Remove player from season
router.delete('/:id/players/:playerId', async (req, res) => {
  try {
    const { id, playerId } = req.params;
    
    // Check if season is in setup
    const seasonCheck = await db.query('SELECT * FROM seasons WHERE id = $1', [id]);
    if (seasonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    if (seasonCheck.rows[0].status !== 'setup') {
      return res.status(400).json({ error: 'Can only remove players from seasons in setup status' });
    }
    
    const result = await db.query(
      'DELETE FROM season_players WHERE season_id = $1 AND player_id = $2 RETURNING *',
      [id, playerId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found in this season' });
    }
    
    res.json({ message: 'Player removed from season successfully' });
  } catch (error) {
    console.error('Error removing player from season:', error);
    res.status(500).json({ error: 'Failed to remove player from season' });
  }
});

// Get available teams for a season (teams not yet chosen)
router.get('/:id/available-teams', async (req, res) => {
  try {
    const { id } = req.params;
    const { league } = req.query;
    
    let query = `
      SELECT t.* FROM teams t
      WHERE t.id NOT IN (
        SELECT chosen_team_id FROM season_players WHERE season_id = $1
      )
    `;
    const params = [id];
    
    if (league) {
      query += ' AND t.league = $2';
      params.push(league as string);
    }
    
    query += ' ORDER BY t.name';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).json({ error: 'Failed to fetch available teams' });
  }
});

// Get season statistics/leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        p.id as player_id,
        p.name as player_name,
        t.name as chosen_team_name,
        COUNT(DISTINCT pp.match_id) as matches_played,
        SUM(CASE WHEN pp.performance_type = 'chosen_team' THEN pp.goals_scored ELSE 0 END) as chosen_team_goals,
        SUM(CASE WHEN pp.performance_type = 'chosen_team' THEN pp.goals_conceded ELSE 0 END) as chosen_team_conceded,
        SUM(CASE WHEN pp.performance_type != 'chosen_team' THEN pp.goals_scored ELSE 0 END) as opposition_goals,
        SUM(CASE WHEN pp.performance_type != 'chosen_team' THEN pp.goals_conceded ELSE 0 END) as opposition_conceded,
        SUM(pp.goals_scored) as total_goals,
        SUM(pp.goals_conceded) as total_conceded,
        SUM(pp.goals_scored) - SUM(pp.goals_conceded) as goal_difference,
        COUNT(CASE WHEN m.status = 'completed' AND pp.performance_type = 'chosen_team' AND
          ((pp.team_id = f.home_team_id AND m.home_score > m.away_score) OR
           (pp.team_id = f.away_team_id AND m.away_score > m.home_score)) THEN 1 END) as chosen_team_wins,
        COUNT(CASE WHEN m.status = 'completed' AND pp.performance_type = 'chosen_team' AND
          m.home_score = m.away_score THEN 1 END) as chosen_team_draws,
        COUNT(CASE WHEN m.status = 'completed' AND pp.performance_type = 'chosen_team' AND
          ((pp.team_id = f.home_team_id AND m.home_score < m.away_score) OR
           (pp.team_id = f.away_team_id AND m.away_score < m.home_score)) THEN 1 END) as chosen_team_losses
      FROM season_players sp
      JOIN players p ON sp.player_id = p.id
      JOIN teams t ON sp.chosen_team_id = t.id
      LEFT JOIN player_performances pp ON p.id = pp.player_id 
        AND pp.match_id IN (SELECT id FROM matches WHERE season_id = $1)
      LEFT JOIN matches m ON pp.match_id = m.id
      LEFT JOIN fixtures f ON m.fixture_id = f.id
      WHERE sp.season_id = $1
      GROUP BY p.id, p.name, t.name, sp.chosen_team_id
      ORDER BY 
        (COUNT(CASE WHEN m.status = 'completed' AND pp.performance_type = 'chosen_team' AND
          ((pp.team_id = f.home_team_id AND m.home_score > m.away_score) OR
           (pp.team_id = f.away_team_id AND m.away_score > m.home_score)) THEN 1 END) * 3 +
         COUNT(CASE WHEN m.status = 'completed' AND pp.performance_type = 'chosen_team' AND
          m.home_score = m.away_score THEN 1 END)) DESC,
        (SUM(pp.goals_scored) - SUM(pp.goals_conceded)) DESC,
        SUM(pp.goals_scored) DESC
    `, [id]);
    
    // Calculate points for each player
    const leaderboard = result.rows.map(row => ({
      ...row,
      chosen_team_points: (parseInt(row.chosen_team_wins) * 3) + parseInt(row.chosen_team_draws),
      matches_played: parseInt(row.matches_played) || 0,
      total_goals: parseInt(row.total_goals) || 0,
      total_conceded: parseInt(row.total_conceded) || 0,
      goal_difference: parseInt(row.goal_difference) || 0,
      chosen_team_wins: parseInt(row.chosen_team_wins) || 0,
      chosen_team_draws: parseInt(row.chosen_team_draws) || 0,
      chosen_team_losses: parseInt(row.chosen_team_losses) || 0,
    }));
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching season leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch season leaderboard' });
  }
});

export default router;