import express from 'express';
import { db } from '../index';
import { PenaltyGuessRequest } from '../models/types';
import { 
  conductPenaltyShootout, 
  getPenaltyShootout, 
  makePenaltyAttempt, 
  flipCoin 
} from '../services/penaltyShootout';

const router = express.Router();

// Start a penalty shootout for a drawn match
router.post('/match/:matchId/start-shootout', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Get match details
    const matchResult = await db.query(`
      SELECT 
        m.*,
        f.home_team_id,
        f.away_team_id
      FROM matches m
      JOIN fixtures f ON m.fixture_id = f.id
      WHERE m.id = $1 AND m.status = 'completed' AND m.home_score = m.away_score
    `, [matchId]);
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or not a completed draw' });
    }
    
    const match = matchResult.rows[0];
    
    // Check if shootout already exists
    const existingShootout = await db.query(
      'SELECT id FROM penalty_shootouts WHERE match_id = $1',
      [matchId]
    );
    
    if (existingShootout.rows.length > 0) {
      return res.status(400).json({ error: 'Penalty shootout already exists for this match' });
    }
    
    // Conduct automatic shootout
    const result = await conductPenaltyShootout(
      parseInt(matchId),
      null,
      match.player_home_id,
      match.player_away_id,
      match.home_team_id,
      match.away_team_id
    );
    
    return res.status(201).json({
      message: 'Penalty shootout completed',
      ...result
    });
    
  } catch (error) {
    console.error('Error starting penalty shootout:', error);
    return res.status(500).json({ error: 'Failed to start penalty shootout' });
  }
});

// Start a penalty shootout for a drawn cup match
router.post('/cup-match/:cupMatchId/start-shootout', async (req, res) => {
  try {
    const { cupMatchId } = req.params;
    
    // Get cup match details
    const matchResult = await db.query(`
      SELECT 
        cm.*,
        cf.home_team_id,
        cf.away_team_id
      FROM cup_matches cm
      JOIN cup_fixtures cf ON cm.cup_fixture_id = cf.id
      WHERE cm.id = $1 AND cm.status = 'completed' AND cm.home_score = cm.away_score
    `, [cupMatchId]);
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cup match not found or not a completed draw' });
    }
    
    const match = matchResult.rows[0];
    
    // Check if shootout already exists
    const existingShootout = await db.query(
      'SELECT id FROM penalty_shootouts WHERE cup_match_id = $1',
      [cupMatchId]
    );
    
    if (existingShootout.rows.length > 0) {
      return res.status(400).json({ error: 'Penalty shootout already exists for this cup match' });
    }
    
    // Conduct automatic shootout
    const result = await conductPenaltyShootout(
      null,
      parseInt(cupMatchId),
      match.player_home_id,
      match.player_away_id,
      match.home_team_id,
      match.away_team_id
    );
    
    // Update cup match with penalty scores
    await db.query(`
      UPDATE cup_matches 
      SET penalties_home = $1, penalties_away = $2
      WHERE id = $3
    `, [
      result.final_score.team1_score,
      result.final_score.team2_score,
      cupMatchId
    ]);
    
    return res.status(201).json({
      message: 'Penalty shootout completed',
      ...result
    });
    
  } catch (error) {
    console.error('Error starting cup penalty shootout:', error);
    return res.status(500).json({ error: 'Failed to start penalty shootout' });
  }
});

// Get penalty shootout by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const shootout = await getPenaltyShootout(parseInt(id));
    return res.json(shootout);
    
  } catch (error) {
    console.error('Error fetching penalty shootout:', error);
    if (error instanceof Error && error.message === 'Penalty shootout not found') {
      return res.status(404).json({ error: 'Penalty shootout not found' });
    } else {
      return res.status(500).json({ error: 'Failed to fetch penalty shootout' });
    }
  }
});

// Get penalty shootout for a match
router.get('/match/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const shootoutResult = await db.query(
      'SELECT id FROM penalty_shootouts WHERE match_id = $1',
      [matchId]
    );
    
    if (shootoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'No penalty shootout found for this match' });
    }
    
    const shootout = await getPenaltyShootout(shootoutResult.rows[0].id);
    return res.json(shootout);
    
  } catch (error) {
    console.error('Error fetching match penalty shootout:', error);
    return res.status(500).json({ error: 'Failed to fetch penalty shootout' });
  }
});

// Get penalty shootout for a cup match
router.get('/cup-match/:cupMatchId', async (req, res) => {
  try {
    const { cupMatchId } = req.params;
    
    const shootoutResult = await db.query(
      'SELECT id FROM penalty_shootouts WHERE cup_match_id = $1',
      [cupMatchId]
    );
    
    if (shootoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'No penalty shootout found for this cup match' });
    }
    
    const shootout = await getPenaltyShootout(shootoutResult.rows[0].id);
    return res.json(shootout);
    
  } catch (error) {
    console.error('Error fetching cup match penalty shootout:', error);
    return res.status(500).json({ error: 'Failed to fetch penalty shootout' });
  }
});

// Create manual/interactive penalty shootout
router.post('/manual', async (req, res) => {
  try {
    const { match_id, cup_match_id, team1_id, team2_id, player1_id, player2_id } = req.body;
    
    if (!match_id && !cup_match_id) {
      return res.status(400).json({ error: 'Either match_id or cup_match_id is required' });
    }
    
    if (match_id && cup_match_id) {
      return res.status(400).json({ error: 'Cannot provide both match_id and cup_match_id' });
    }
    
    if (!team1_id || !team2_id || !player1_id || !player2_id) {
      return res.status(400).json({ error: 'Team IDs and player IDs are required' });
    }
    
    // Create empty shootout for manual attempts
    const shootoutResult = await db.query(`
      INSERT INTO penalty_shootouts (match_id, cup_match_id, winning_team_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [match_id || null, cup_match_id || null, team1_id]); // Temporary winner
    
    const shootoutId = shootoutResult.rows[0].id;
    
    return res.status(201).json({
      shootout_id: shootoutId,
      message: 'Manual penalty shootout created. Use the attempt endpoint to add penalties.',
      next_attempt: 1,
      player_turn: player1_id
    });
    
  } catch (error) {
    console.error('Error creating manual penalty shootout:', error);
    return res.status(500).json({ error: 'Failed to create manual penalty shootout' });
  }
});

// Make a penalty attempt in a manual shootout
router.post('/:id/attempt', async (req, res) => {
  try {
    const { id } = req.params;
    const { player_id, guess }: { player_id: number; guess: 'heads' | 'tails' } = req.body;
    
    if (!player_id || !guess) {
      return res.status(400).json({ error: 'Player ID and guess are required' });
    }
    
    if (!['heads', 'tails'].includes(guess)) {
      return res.status(400).json({ error: 'Guess must be "heads" or "tails"' });
    }
    
    // Get current attempt number
    const attemptCountResult = await db.query(
      'SELECT COUNT(*) as count FROM penalty_attempts WHERE shootout_id = $1',
      [id]
    );
    
    const nextAttemptNumber = parseInt(attemptCountResult.rows[0].count) + 1;
    
    if (nextAttemptNumber > 20) { // Max 10 rounds (20 attempts)
      return res.status(400).json({ error: 'Maximum penalty attempts reached' });
    }
    
    const attempt = await makePenaltyAttempt(
      parseInt(id),
      player_id,
      nextAttemptNumber,
      guess
    );
    
    // Get updated shootout state
    const allAttempts = await db.query(`
      SELECT 
        pa.*,
        p.name as player_name
      FROM penalty_attempts pa
      JOIN players p ON pa.player_id = p.id
      WHERE pa.shootout_id = $1
      ORDER BY pa.attempt_number
    `, [id]);
    
    // Calculate current scores (simplified - assumes two players alternating)
    let team1Score = 0;
    let team2Score = 0;
    
    allAttempts.rows.forEach((att, index) => {
      if (att.successful) {
        if (index % 2 === 0) {
          team1Score++;
        } else {
          team2Score++;
        }
      }
    });
    
    return res.json({
      attempt,
      current_scores: {
        team1_score: team1Score,
        team2_score: team2Score
      },
      total_attempts: allAttempts.rows.length,
      next_attempt: allAttempts.rows.length + 1,
      is_complete: false // Would need more logic to determine completion
    });
    
  } catch (error) {
    console.error('Error making penalty attempt:', error);
    return res.status(500).json({ error: 'Failed to make penalty attempt' });
  }
});

// Flip coin endpoint (for testing or manual coin flips)
router.post('/flip-coin', (req, res) => {
  const result = flipCoin();
  return res.json({
    result,
    timestamp: new Date().toISOString()
  });
});

// Get all penalty shootouts for a season
router.get('/season/:seasonId', async (req, res) => {
  try {
    const { seasonId } = req.params;
    
    const result = await db.query(`
      SELECT 
        ps.*,
        wt.name as winning_team_name,
        CASE 
          WHEN ps.match_id IS NOT NULL THEN 'league'
          ELSE 'cup'
        END as shootout_type,
        m.id as league_match_id,
        cm.id as cup_match_id,
        COUNT(pa.id) as total_attempts
      FROM penalty_shootouts ps
      JOIN teams wt ON ps.winning_team_id = wt.id
      LEFT JOIN matches m ON ps.match_id = m.id
      LEFT JOIN cup_matches cm ON ps.cup_match_id = cm.id
      LEFT JOIN penalty_attempts pa ON ps.id = pa.shootout_id
      WHERE (m.season_id = $1 OR cm.season_id = $1)
      GROUP BY ps.id, wt.name, m.id, cm.id
      ORDER BY ps.created_at DESC
    `, [seasonId]);
    
    return res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching season penalty shootouts:', error);
    return res.status(500).json({ error: 'Failed to fetch penalty shootouts' });
  }
});

export default router;