import express from 'express';
import { db } from '../index';

const router = express.Router();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const { league, country } = req.query;
    
    let query = 'SELECT * FROM teams WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (league) {
      query += ` AND league = $${paramIndex++}`;
      params.push(league);
    }
    
    if (country) {
      query += ` AND country = $${paramIndex++}`;
      params.push(country);
    }
    
    query += ' ORDER BY league, name';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get unique leagues
router.get('/leagues', async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT league FROM teams ORDER BY league');
    res.json(result.rows.map(row => row.league));
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// Get unique countries
router.get('/countries', async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT country FROM teams ORDER BY country');
    res.json(result.rows.map(row => row.country));
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// Get team by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM teams WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Create new team
router.post('/', async (req, res) => {
  try {
    const { name, league, country, strength_rating } = req.body;
    
    if (!name || !league || !country) {
      return res.status(400).json({ error: 'Name, league, and country are required' });
    }
    
    if (strength_rating && (strength_rating < 1 || strength_rating > 100)) {
      return res.status(400).json({ error: 'Strength rating must be between 1 and 100' });
    }
    
    // Check if team already exists in this league
    const existingTeam = await db.query(
      'SELECT id FROM teams WHERE name = $1 AND league = $2',
      [name.trim(), league.trim()]
    );
    
    if (existingTeam.rows.length > 0) {
      return res.status(400).json({ error: 'Team already exists in this league' });
    }
    
    const result = await db.query(
      'INSERT INTO teams (name, league, country, strength_rating) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), league.trim(), country.trim(), strength_rating || 50]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update team
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, league, country, strength_rating } = req.body;
    
    // Check if team exists
    const teamCheck = await db.query('SELECT id FROM teams WHERE id = $1', [id]);
    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Team name cannot be empty' });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    
    if (league !== undefined) {
      if (!league || league.trim().length === 0) {
        return res.status(400).json({ error: 'League cannot be empty' });
      }
      updates.push(`league = $${paramIndex++}`);
      values.push(league.trim());
    }
    
    if (country !== undefined) {
      if (!country || country.trim().length === 0) {
        return res.status(400).json({ error: 'Country cannot be empty' });
      }
      updates.push(`country = $${paramIndex++}`);
      values.push(country.trim());
    }
    
    if (strength_rating !== undefined) {
      if (strength_rating < 1 || strength_rating > 100) {
        return res.status(400).json({ error: 'Strength rating must be between 1 and 100' });
      }
      updates.push(`strength_rating = $${paramIndex++}`);
      values.push(strength_rating);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Check for duplicate team name in league (if name or league is being updated)
    if (name !== undefined || league !== undefined) {
      const checkQuery = `
        SELECT id FROM teams 
        WHERE name = COALESCE($1, name) 
        AND league = COALESCE($2, league) 
        AND id != $3
      `;
      const duplicateCheck = await db.query(checkQuery, [
        name?.trim() || null,
        league?.trim() || null,
        id
      ]);
      
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Team with this name already exists in the league' });
      }
    }
    
    values.push(id);
    const result = await db.query(
      `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if team is used in any fixtures or seasons
    const usageCheck = await db.query(`
      SELECT 
        COUNT(f.id) as fixture_count,
        COUNT(sp.id) as season_player_count
      FROM teams t
      LEFT JOIN fixtures f ON (t.id = f.home_team_id OR t.id = f.away_team_id)
      LEFT JOIN season_players sp ON t.id = sp.chosen_team_id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);
    
    if (usageCheck.rows.length > 0) {
      const usage = usageCheck.rows[0];
      if (parseInt(usage.fixture_count) > 0 || parseInt(usage.season_player_count) > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete team that is used in fixtures or chosen by players' 
        });
      }
    }
    
    const result = await db.query('DELETE FROM teams WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ message: 'Team deleted successfully', team: result.rows[0] });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

export default router;