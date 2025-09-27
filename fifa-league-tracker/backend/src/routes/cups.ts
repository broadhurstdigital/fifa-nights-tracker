import express from 'express';
import { db } from '../index';

const router = express.Router();

// Get all cups
router.get('/', async (req, res) => {
  try {
    const { country } = req.query;
    
    let query = 'SELECT * FROM cups WHERE 1=1';
    const params: any[] = [];
    
    if (country) {
      query += ' AND country = $1';
      params.push(country);
    }
    
    query += ' ORDER BY country, name';
    
    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cups:', error);
    return res.status(500).json({ error: 'Failed to fetch cups' });
  }
});

// Get cup by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM cups WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cup not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching cup:', error);
    return res.status(500).json({ error: 'Failed to fetch cup' });
  }
});

// Get cup fixtures for a season
router.get('/:id/season/:seasonId/fixtures', async (req, res) => {
  try {
    const { id, seasonId } = req.params;
    
    const result = await db.query(`
      SELECT 
        cf.*,
        ht.name as home_team_name,
        at.name as away_team_name,
        c.name as cup_name
      FROM cup_fixtures cf
      JOIN cups c ON cf.cup_id = c.id
      JOIN teams ht ON cf.home_team_id = ht.id
      JOIN teams at ON cf.away_team_id = at.id
      WHERE cf.cup_id = $1 AND cf.season_id = $2
      ORDER BY cf.round_name, cf.id
    `, [id, seasonId]);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cup fixtures:', error);
    return res.status(500).json({ error: 'Failed to fetch cup fixtures' });
  }
});

// Get cup matches for a season
router.get('/:id/season/:seasonId/matches', async (req, res) => {
  try {
    const { id, seasonId } = req.params;
    const { round_name, status } = req.query;
    
    let query = `
      SELECT 
        cm.*,
        cf.round_name,
        ht.name as home_team_name,
        at.name as away_team_name,
        ph.name as player_home_name,
        pa.name as player_away_name,
        c.name as cup_name
      FROM cup_matches cm
      JOIN cup_fixtures cf ON cm.cup_fixture_id = cf.id
      JOIN cups c ON cf.cup_id = c.id
      JOIN teams ht ON cf.home_team_id = ht.id
      JOIN teams at ON cf.away_team_id = at.id
      LEFT JOIN players ph ON cm.player_home_id = ph.id
      LEFT JOIN players pa ON cm.player_away_id = pa.id
      WHERE cf.cup_id = $1 AND cm.season_id = $2
    `;
    const params = [id, seasonId];
    let paramIndex = 3;
    
    if (round_name) {
      query += ` AND cf.round_name = $${paramIndex++}`;
      params.push(round_name as string);
    }
    
    if (status) {
      query += ` AND cm.status = $${paramIndex++}`;
      params.push(status as string);
    }
    
    query += ' ORDER BY cf.round_name, cm.id';
    
    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cup matches:', error);
    return res.status(500).json({ error: 'Failed to fetch cup matches' });
  }
});

// Create cup fixture
router.post('/:id/season/:seasonId/fixtures', async (req, res) => {
  try {
    const { id, seasonId } = req.params;
    const { round_name, home_team_id, away_team_id, match_date } = req.body;
    
    if (!round_name || !home_team_id || !away_team_id) {
      return res.status(400).json({ error: 'Round name, home team ID, and away team ID are required' });
    }
    
    if (home_team_id === away_team_id) {
      return res.status(400).json({ error: 'Home and away teams must be different' });
    }
    
    // Check if cup and season exist
    const cupCheck = await db.query('SELECT * FROM cups WHERE id = $1', [id]);
    if (cupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cup not found' });
    }
    
    const seasonCheck = await db.query('SELECT * FROM seasons WHERE id = $1', [seasonId]);
    if (seasonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Check if teams exist
    const teamsCheck = await db.query('SELECT id FROM teams WHERE id = ANY($1)', [[home_team_id, away_team_id]]);
    if (teamsCheck.rows.length !== 2) {
      return res.status(400).json({ error: 'One or both teams not found' });
    }
    
    const result = await db.query(`
      INSERT INTO cup_fixtures (cup_id, season_id, round_name, home_team_id, away_team_id, match_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, seasonId, round_name, home_team_id, away_team_id, match_date || null]);
    
    // Return with joined data
    const joinedResult = await db.query(`
      SELECT 
        cf.*,
        ht.name as home_team_name,
        at.name as away_team_name,
        c.name as cup_name
      FROM cup_fixtures cf
      JOIN cups c ON cf.cup_id = c.id
      JOIN teams ht ON cf.home_team_id = ht.id
      JOIN teams at ON cf.away_team_id = at.id
      WHERE cf.id = $1
    `, [result.rows[0].id]);
    
    return res.status(201).json(joinedResult.rows[0]);
  } catch (error) {
    console.error('Error creating cup fixture:', error);
    return res.status(500).json({ error: 'Failed to create cup fixture' });
  }
});

// Create cup match (assign players to cup fixture)
router.post('/fixtures/:fixtureId/matches', async (req, res) => {
  try {
    const { fixtureId } = req.params;
    const { player_home_id, player_away_id } = req.body;
    
    if (!player_home_id || !player_away_id) {
      return res.status(400).json({ error: 'Player home ID and player away ID are required' });
    }
    
    if (player_home_id === player_away_id) {
      return res.status(400).json({ error: 'Home and away players must be different' });
    }
    
    // Check if cup fixture exists
    const fixtureCheck = await db.query('SELECT * FROM cup_fixtures WHERE id = $1', [fixtureId]);
    if (fixtureCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cup fixture not found' });
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
    
    // Check if match already exists for this fixture
    const existingMatch = await db.query('SELECT id FROM cup_matches WHERE cup_fixture_id = $1', [fixtureId]);
    if (existingMatch.rows.length > 0) {
      return res.status(400).json({ error: 'Match already exists for this cup fixture' });
    }
    
    const result = await db.query(`
      INSERT INTO cup_matches (cup_fixture_id, season_id, player_home_id, player_away_id, status)
      VALUES ($1, $2, $3, $4, 'scheduled')
      RETURNING *
    `, [fixtureId, fixture.season_id, player_home_id, player_away_id]);
    
    // Return with joined data
    const joinedResult = await db.query(`
      SELECT 
        cm.*,
        cf.round_name,
        ht.name as home_team_name,
        at.name as away_team_name,
        ph.name as player_home_name,
        pa.name as player_away_name,
        c.name as cup_name
      FROM cup_matches cm
      JOIN cup_fixtures cf ON cm.cup_fixture_id = cf.id
      JOIN cups c ON cf.cup_id = c.id
      JOIN teams ht ON cf.home_team_id = ht.id
      JOIN teams at ON cf.away_team_id = at.id
      JOIN players ph ON cm.player_home_id = ph.id
      JOIN players pa ON cm.player_away_id = pa.id
      WHERE cm.id = $1
    `, [result.rows[0].id]);
    
    return res.status(201).json(joinedResult.rows[0]);
  } catch (error) {
    console.error('Error creating cup match:', error);
    return res.status(500).json({ error: 'Failed to create cup match' });
  }
});

// Update cup match score
router.patch('/matches/:id/score', async (req, res) => {
  try {
    const { id } = req.params;
    const { home_score, away_score, penalties_home, penalties_away } = req.body;
    
    if (typeof home_score !== 'number' || typeof away_score !== 'number') {
      return res.status(400).json({ error: 'Home score and away score must be numbers' });
    }
    
    if (home_score < 0 || away_score < 0) {
      return res.status(400).json({ error: 'Scores cannot be negative' });
    }
    
    // Validate penalty scores if provided
    if (penalties_home !== undefined || penalties_away !== undefined) {
      if (typeof penalties_home !== 'number' || typeof penalties_away !== 'number') {
        return res.status(400).json({ error: 'Penalty scores must be numbers' });
      }
      
      if (penalties_home < 0 || penalties_away < 0) {
        return res.status(400).json({ error: 'Penalty scores cannot be negative' });
      }
      
      if (penalties_home === penalties_away) {
        return res.status(400).json({ error: 'Penalty shootout must have a winner' });
      }
    }
    
    const result = await db.query(`
      UPDATE cup_matches 
      SET 
        home_score = $1, 
        away_score = $2, 
        penalties_home = $3,
        penalties_away = $4,
        status = 'completed', 
        completed_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [home_score, away_score, penalties_home || 0, penalties_away || 0, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cup match not found' });
    }
    
    // Return with joined data
    const joinedResult = await db.query(`
      SELECT 
        cm.*,
        cf.round_name,
        ht.name as home_team_name,
        at.name as away_team_name,
        ph.name as player_home_name,
        pa.name as player_away_name,
        c.name as cup_name
      FROM cup_matches cm
      JOIN cup_fixtures cf ON cm.cup_fixture_id = cf.id
      JOIN cups c ON cf.cup_id = c.id
      JOIN teams ht ON cf.home_team_id = ht.id
      JOIN teams at ON cf.away_team_id = at.id
      JOIN players ph ON cm.player_home_id = ph.id
      JOIN players pa ON cm.player_away_id = pa.id
      WHERE cm.id = $1
    `, [id]);
    
    return res.json(joinedResult.rows[0]);
  } catch (error) {
    console.error('Error updating cup match score:', error);
    return res.status(500).json({ error: 'Failed to update cup match score' });
  }
});

// Generate cup fixtures for a season based on league teams
router.post('/:id/season/:seasonId/generate-fixtures', async (req, res) => {
  try {
    const { id, seasonId } = req.params;
    const { include_lower_leagues = false } = req.body;
    
    // Get cup details
    const cupResult = await db.query('SELECT * FROM cups WHERE id = $1', [id]);
    if (cupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cup not found' });
    }
    
    const cup = cupResult.rows[0];
    
    // Get season details
    const seasonResult = await db.query('SELECT * FROM seasons WHERE id = $1', [seasonId]);
    if (seasonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    const season = seasonResult.rows[0];
    
    // Get teams from eligible leagues
    let eligibleTeams;
    if (include_lower_leagues) {
      // Include all teams from eligible leagues
      eligibleTeams = await db.query(
        'SELECT * FROM teams WHERE league = ANY($1) AND country = $2 ORDER BY name',
        [cup.eligible_leagues, cup.country]
      );
    } else {
      // Only include teams from the season's league
      eligibleTeams = await db.query(
        'SELECT * FROM teams WHERE league = $1 AND country = $2 ORDER BY name',
        [season.league_name, cup.country]
      );
    }
    
    if (eligibleTeams.rows.length < 2) {
      return res.status(400).json({ error: 'Not enough eligible teams for cup competition' });
    }
    
    // Delete existing cup fixtures for this season
    await db.query('DELETE FROM cup_fixtures WHERE cup_id = $1 AND season_id = $2', [id, seasonId]);
    
    // Generate first round fixtures
    const teams = eligibleTeams.rows;
    const fixtures = [];
    
    // Simple pairing for first round (can be enhanced with seeding)
    for (let i = 0; i < teams.length - 1; i += 2) {
      if (teams[i + 1]) {
        fixtures.push({
          cup_id: id,
          season_id: seasonId,
          round_name: 'Round 1',
          home_team_id: teams[i].id,
          away_team_id: teams[i + 1].id,
        });
      }
    }
    
    // Insert fixtures
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      for (const fixture of fixtures) {
        await client.query(`
          INSERT INTO cup_fixtures (cup_id, season_id, round_name, home_team_id, away_team_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [fixture.cup_id, fixture.season_id, fixture.round_name, fixture.home_team_id, fixture.away_team_id]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    return res.status(201).json({
      message: 'Cup fixtures generated successfully',
      cup_name: cup.name,
      fixtures_created: fixtures.length,
      teams_included: teams.length,
      round_name: 'Round 1'
    });
    
  } catch (error) {
    console.error('Error generating cup fixtures:', error);
    return res.status(500).json({ error: 'Failed to generate cup fixtures' });
  }
});

export default router;