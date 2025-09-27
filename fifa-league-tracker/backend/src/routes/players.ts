import express from 'express';
import { db } from '../index';
import { Player, CreatePlayerRequest } from '../models/types';

const router = express.Router();

// Get all players
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM players ORDER BY name');
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching players:', error);
    return res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get player by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM players WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching player:', error);
    return res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Create new player
router.post('/', async (req, res) => {
  try {
    const { name, email }: CreatePlayerRequest = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    // Check if email already exists (if provided)
    if (email) {
      const emailCheck = await db.query('SELECT id FROM players WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    const result = await db.query(
      'INSERT INTO players (name, email) VALUES ($1, $2) RETURNING *',
      [name.trim(), email || null]
    );
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating player:', error);
    return res.status(500).json({ error: 'Failed to create player' });
  }
});

// Update player
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email }: Partial<CreatePlayerRequest> = req.body;
    
    // Check if player exists
    const playerCheck = await db.query('SELECT id FROM players WHERE id = $1', [id]);
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if email already exists (if provided and different)
    if (email) {
      const emailCheck = await db.query('SELECT id FROM players WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Player name cannot be empty' });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    const result = await db.query(
      `UPDATE players SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating player:', error);
    return res.status(500).json({ error: 'Failed to update player' });
  }
});

// Delete player
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if player is in any active seasons
    const seasonCheck = await db.query(
      'SELECT COUNT(*) as count FROM season_players sp JOIN seasons s ON sp.season_id = s.id WHERE sp.player_id = $1 AND s.status IN ($2, $3)',
      [id, 'setup', 'active']
    );
    
    if (parseInt(seasonCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete player who is in active or setup seasons' });
    }
    
    const result = await db.query('DELETE FROM players WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    return res.json({ message: 'Player deleted successfully', player: result.rows[0] });
  } catch (error) {
    console.error('Error deleting player:', error);
    return res.status(500).json({ error: 'Failed to delete player' });
  }
});

// Get player statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { season_id } = req.query;
    
    // Check if player exists
    const playerCheck = await db.query('SELECT * FROM players WHERE id = $1', [id]);
    if (playerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    let seasonFilter = '';
    const queryParams = [id];
    
    if (season_id) {
      seasonFilter = 'AND pp.match_id IN (SELECT id FROM matches WHERE season_id = $2)';
      queryParams.push(season_id as string);
    }
    
    const statsQuery = `
      SELECT 
        p.id as player_id,
        p.name as player_name,
        COUNT(DISTINCT pp.match_id) as total_matches,
        SUM(pp.goals_scored) as total_goals_scored,
        SUM(pp.goals_conceded) as total_goals_conceded,
        SUM(pp.goals_scored) - SUM(pp.goals_conceded) as goal_difference,
        pp.performance_type,
        COUNT(CASE WHEN m.status = 'completed' AND 
          ((pp.team_id = f.home_team_id AND m.home_score > m.away_score) OR
           (pp.team_id = f.away_team_id AND m.away_score > m.home_score)) THEN 1 END) as wins,
        COUNT(CASE WHEN m.status = 'completed' AND m.home_score = m.away_score THEN 1 END) as draws,
        COUNT(CASE WHEN m.status = 'completed' AND 
          ((pp.team_id = f.home_team_id AND m.home_score < m.away_score) OR
           (pp.team_id = f.away_team_id AND m.away_score < m.home_score)) THEN 1 END) as losses
      FROM players p
      LEFT JOIN player_performances pp ON p.id = pp.player_id
      LEFT JOIN matches m ON pp.match_id = m.id
      LEFT JOIN fixtures f ON m.fixture_id = f.id
      WHERE p.id = $1 ${seasonFilter}
      GROUP BY p.id, p.name, pp.performance_type
    `;
    
    const result = await db.query(statsQuery, queryParams);
    
    // Process results to group by performance type
    const player = playerCheck.rows[0];
    const stats = {
      player_id: player.id,
      player_name: player.name,
      total_matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_scored: 0,
      goals_conceded: 0,
      goal_difference: 0,
      points: 0,
      chosen_team_stats: {
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_scored: 0,
        goals_conceded: 0,
        points: 0,
      },
      opposition_stats: {
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_scored: 0,
        goals_conceded: 0,
        points: 0,
      }
    };
    
    result.rows.forEach(row => {
      const matches = parseInt(row.total_matches) || 0;
      const wins = parseInt(row.wins) || 0;
      const draws = parseInt(row.draws) || 0;
      const losses = parseInt(row.losses) || 0;
      const goalsScored = parseInt(row.total_goals_scored) || 0;
      const goalsConceded = parseInt(row.total_goals_conceded) || 0;
      const points = wins * 3 + draws;
      
      stats.total_matches += matches;
      stats.wins += wins;
      stats.draws += draws;
      stats.losses += losses;
      stats.goals_scored += goalsScored;
      stats.goals_conceded += goalsConceded;
      stats.points += points;
      
      if (row.performance_type === 'chosen_team') {
        stats.chosen_team_stats = {
          matches,
          wins,
          draws,
          losses,
          goals_scored: goalsScored,
          goals_conceded: goalsConceded,
          points,
        };
      } else if (row.performance_type === 'opposition_home' || row.performance_type === 'opposition_away') {
        stats.opposition_stats.matches += matches;
        stats.opposition_stats.wins += wins;
        stats.opposition_stats.draws += draws;
        stats.opposition_stats.losses += losses;
        stats.opposition_stats.goals_scored += goalsScored;
        stats.opposition_stats.goals_conceded += goalsConceded;
        stats.opposition_stats.points += points;
      }
    });
    
    stats.goal_difference = stats.goals_scored - stats.goals_conceded;
    
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return res.status(500).json({ error: 'Failed to fetch player statistics' });
  }
});

export default router;