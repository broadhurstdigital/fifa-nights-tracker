import express from 'express';
import { db } from '../index';
import { CreateMatchRequest, UpdateMatchScoreRequest } from '../models/types';
import { assignPlayersToRound, assignPlayersToSeason, getAssignmentStats } from '../services/playerAssignment';

const router = express.Router();

// Get matches for a season
router.get('/season/:seasonId', async (req, res) => {
  try {
    const { seasonId } = req.params;
    const { round, status, player_id } = req.query;
    
    let query = `
      SELECT 
        m.*,
        f.round_number,
        f.match_number,
        f.match_date,
        f.location,
        ht.name as home_team_name,
        ht.league as home_team_league,
        at.name as away_team_name,
        at.league as away_team_league,
        ph.name as player_home_name,
        pa.name as player_away_name
      FROM matches m
      JOIN fixtures f ON m.fixture_id = f.id
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      JOIN players ph ON m.player_home_id = ph.id
      JOIN players pa ON m.player_away_id = pa.id
      WHERE m.season_id = $1
    `;
    const params = [seasonId];
    let paramIndex = 2;
    
    if (round) {
      query += ` AND f.round_number = $${paramIndex++}`;
      params.push(round as string);
    }
    
    if (status) {
      query += ` AND m.status = $${paramIndex++}`;
      params.push(status as string);
    }
    
    if (player_id) {
      query += ` AND (m.player_home_id = $${paramIndex++} OR m.player_away_id = $${paramIndex++})`;
      params.push(player_id as string, player_id as string);
    }
    
    query += ' ORDER BY f.round_number, f.match_number';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Get match by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        m.*,
        f.round_number,
        f.match_number,
        f.match_date,
        f.location,
        ht.name as home_team_name,
        ht.league as home_team_league,
        at.name as away_team_name,
        at.league as away_team_league,
        ph.name as player_home_name,
        pa.name as player_away_name
      FROM matches m
      JOIN fixtures f ON m.fixture_id = f.id
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      JOIN players ph ON m.player_home_id = ph.id
      JOIN players pa ON m.player_away_id = pa.id
      WHERE m.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

// Create match manually (alternative to auto-assignment)
router.post('/', async (req, res) => {
  try {
    const { fixture_id, player_home_id, player_away_id }: CreateMatchRequest = req.body;
    
    if (!fixture_id || !player_home_id || !player_away_id) {
      return res.status(400).json({ error: 'Fixture ID, player home ID, and player away ID are required' });
    }
    
    if (player_home_id === player_away_id) {
      return res.status(400).json({ error: 'Home and away players must be different' });
    }
    
    // Check if fixture exists
    const fixtureCheck = await db.query('SELECT * FROM fixtures WHERE id = $1', [fixture_id]);
    if (fixtureCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    
    const fixture = fixtureCheck.rows[0];
    
    // Check if players exist and are in the season
    const playersCheck = await db.query(`
      SELECT sp.player_id, sp.chosen_team_id, p.name as player_name
      FROM season_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE sp.season_id = $1 AND sp.player_id = ANY($2)
    `, [fixture.season_id, [player_home_id, player_away_id]]);
    
    if (playersCheck.rows.length !== 2) {
      return res.status(400).json({ error: 'One or both players are not in this season' });
    }
    
    const playersMap = new Map(playersCheck.rows.map(p => [p.player_id, p]));
    const homePlayer = playersMap.get(player_home_id);
    const awayPlayer = playersMap.get(player_away_id);
    
    // Check that players are not playing as their chosen team
    if (homePlayer?.chosen_team_id === fixture.home_team_id || homePlayer?.chosen_team_id === fixture.away_team_id) {
      return res.status(400).json({ error: 'Home player cannot play as their chosen team' });
    }
    
    if (awayPlayer?.chosen_team_id === fixture.home_team_id || awayPlayer?.chosen_team_id === fixture.away_team_id) {
      return res.status(400).json({ error: 'Away player cannot play as their chosen team' });
    }
    
    // Check if match already exists for this fixture
    const existingMatch = await db.query('SELECT id FROM matches WHERE fixture_id = $1', [fixture_id]);
    if (existingMatch.rows.length > 0) {
      return res.status(400).json({ error: 'Match already exists for this fixture' });
    }
    
    const result = await db.query(`
      INSERT INTO matches (fixture_id, season_id, player_home_id, player_away_id, status)
      VALUES ($1, $2, $3, $4, 'scheduled')
      RETURNING *
    `, [fixture_id, fixture.season_id, player_home_id, player_away_id]);
    
    // Return with joined data
    const joinedResult = await db.query(`
      SELECT 
        m.*,
        f.round_number,
        f.match_number,
        f.match_date,
        f.location,
        ht.name as home_team_name,
        at.name as away_team_name,
        ph.name as player_home_name,
        pa.name as player_away_name
      FROM matches m
      JOIN fixtures f ON m.fixture_id = f.id
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      JOIN players ph ON m.player_home_id = ph.id
      JOIN players pa ON m.player_away_id = pa.id
      WHERE m.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json(joinedResult.rows[0]);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// Update match score
router.patch('/:id/score', async (req, res) => {
  try {
    const { id } = req.params;
    const { home_score, away_score }: UpdateMatchScoreRequest = req.body;
    
    if (typeof home_score !== 'number' || typeof away_score !== 'number') {
      return res.status(400).json({ error: 'Home score and away score must be numbers' });
    }
    
    if (home_score < 0 || away_score < 0) {
      return res.status(400).json({ error: 'Scores cannot be negative' });
    }
    
    if (home_score > 20 || away_score > 20) {
      return res.status(400).json({ error: 'Scores seem unrealistic (max 20 goals)' });
    }
    
    // Get match details
    const matchCheck = await db.query(`
      SELECT m.*, f.home_team_id, f.away_team_id
      FROM matches m
      JOIN fixtures f ON m.fixture_id = f.id
      WHERE m.id = $1
    `, [id]);
    
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const match = matchCheck.rows[0];
    
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Update match score and status
      await client.query(`
        UPDATE matches 
        SET home_score = $1, away_score = $2, status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [home_score, away_score, id]);
      
      // Delete existing performance records for this match
      await client.query('DELETE FROM player_performances WHERE match_id = $1', [id]);
      
      // Create performance records for both players
      
      // Home player performance (playing as home team)
      await client.query(`
        INSERT INTO player_performances (match_id, player_id, team_id, goals_scored, goals_conceded, performance_type)
        VALUES ($1, $2, $3, $4, $5, 'opposition_home')
      `, [id, match.player_home_id, match.home_team_id, home_score, away_score]);
      
      // Away player performance (playing as away team)
      await client.query(`
        INSERT INTO player_performances (match_id, player_id, team_id, goals_scored, goals_conceded, performance_type)
        VALUES ($1, $2, $3, $4, $5, 'opposition_away')
      `, [id, match.player_away_id, match.away_team_id, away_score, home_score]);
      
      // Check if either player was playing as their chosen team (shouldn't happen with proper assignment)
      const chosenTeamCheck = await client.query(`
        SELECT sp.player_id, sp.chosen_team_id
        FROM season_players sp
        WHERE sp.season_id = $1 AND sp.player_id = ANY($2)
      `, [match.season_id, [match.player_home_id, match.player_away_id]]);
      
      for (const playerData of chosenTeamCheck.rows) {
        const isHomeTeam = playerData.chosen_team_id === match.home_team_id && playerData.player_id === match.player_home_id;
        const isAwayTeam = playerData.chosen_team_id === match.away_team_id && playerData.player_id === match.player_away_id;
        
        if (isHomeTeam) {
          // Update the performance record to be chosen_team type
          await client.query(`
            UPDATE player_performances 
            SET performance_type = 'chosen_team'
            WHERE match_id = $1 AND player_id = $2 AND team_id = $3
          `, [id, playerData.player_id, playerData.chosen_team_id]);
        } else if (isAwayTeam) {
          // Update the performance record to be chosen_team type
          await client.query(`
            UPDATE player_performances 
            SET performance_type = 'chosen_team'
            WHERE match_id = $1 AND player_id = $2 AND team_id = $3
          `, [id, playerData.player_id, playerData.chosen_team_id]);
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    // Return updated match with joined data
    const updatedResult = await db.query(`
      SELECT 
        m.*,
        f.round_number,
        f.match_number,
        f.match_date,
        f.location,
        ht.name as home_team_name,
        at.name as away_team_name,
        ph.name as player_home_name,
        pa.name as player_away_name
      FROM matches m
      JOIN fixtures f ON m.fixture_id = f.id
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      JOIN players ph ON m.player_home_id = ph.id
      JOIN players pa ON m.player_away_id = pa.id
      WHERE m.id = $1
    `, [id]);
    
    res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error('Error updating match score:', error);
    res.status(500).json({ error: 'Failed to update match score' });
  }
});

// Auto-assign players to a specific round
router.post('/season/:seasonId/assign-round/:roundNumber', async (req, res) => {
  try {
    const { seasonId, roundNumber } = req.params;
    
    // Check if season exists
    const seasonCheck = await db.query('SELECT status FROM seasons WHERE id = $1', [seasonId]);
    if (seasonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    const assignments = await assignPlayersToRound(parseInt(seasonId), parseInt(roundNumber));
    
    res.json({
      message: `Successfully assigned players to round ${roundNumber}`,
      round_number: parseInt(roundNumber),
      assignments_made: assignments.length,
      assignments
    });
    
  } catch (error) {
    console.error('Error assigning players to round:', error);
    res.status(500).json({ 
      error: 'Failed to assign players to round',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Auto-assign players to entire season
router.post('/season/:seasonId/assign-all', async (req, res) => {
  try {
    const { seasonId } = req.params;
    
    // Check if season exists
    const seasonCheck = await db.query('SELECT status FROM seasons WHERE id = $1', [seasonId]);
    if (seasonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    const stats = await assignPlayersToSeason(parseInt(seasonId));
    
    res.json({
      message: 'Successfully assigned players to all fixtures',
      ...stats
    });
    
  } catch (error) {
    console.error('Error assigning players to season:', error);
    res.status(500).json({ 
      error: 'Failed to assign players to season',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get assignment statistics for a season
router.get('/season/:seasonId/assignment-stats', async (req, res) => {
  try {
    const { seasonId } = req.params;
    
    const stats = await getAssignmentStats(parseInt(seasonId));
    res.json(stats);
    
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    res.status(500).json({ error: 'Failed to fetch assignment statistics' });
  }
});

// Delete match
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM matches WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

export default router;