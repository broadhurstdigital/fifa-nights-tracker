import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { db } from '../index';
import { FixtureCSVRow } from '../models/types';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Get fixtures for a season
router.get('/season/:seasonId', async (req, res) => {
  try {
    const { seasonId } = req.params;
    const { round } = req.query;
    
    let query = `
      SELECT 
        f.*,
        ht.name as home_team_name,
        ht.league as home_team_league,
        at.name as away_team_name,
        at.league as away_team_league
      FROM fixtures f
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      WHERE f.season_id = $1
    `;
    const params = [seasonId];
    
    if (round) {
      query += ' AND f.round_number = $2';
      params.push(round as string);
    }
    
    query += ' ORDER BY f.round_number, f.match_number';
    
    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return res.status(500).json({ error: 'Failed to fetch fixtures' });
  }
});

// Get fixture by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        f.*,
        ht.name as home_team_name,
        ht.league as home_team_league,
        at.name as away_team_name,
        at.league as away_team_league
      FROM fixtures f
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      WHERE f.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fixture not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching fixture:', error);
    return res.status(500).json({ error: 'Failed to fetch fixture' });
  }
});

// Upload and import fixtures from CSV
router.post('/season/:seasonId/import-csv', upload.single('csv'), async (req, res) => {
  try {
    const { seasonId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }
    
    // Check if season exists and is in setup
    const seasonCheck = await db.query('SELECT * FROM seasons WHERE id = $1', [seasonId]);
    if (seasonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    if (seasonCheck.rows[0].status !== 'setup') {
      return res.status(400).json({ error: 'Can only import fixtures for seasons in setup status' });
    }
    
    // Parse CSV data
    const csvData: FixtureCSVRow[] = [];
    const stream = Readable.from(req.file.buffer.toString());
    
    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data: FixtureCSVRow) => {
          csvData.push(data);
        })
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });
    
    if (csvData.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' });
    }
    
    // Validate CSV structure
    const requiredColumns = ['Match Number', 'Round Number', 'Date', 'Location', 'Home Team', 'Away Team'];
    const firstRow = csvData[0];

    if (!firstRow) {
      return res.status(400).json({ error: 'CSV file appears to be empty or invalid' });
    }

    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      });
    }
    
    // Extract unique team names
    const teamNames = new Set<string>();
    csvData.forEach(row => {
      teamNames.add(row['Home Team'].trim());
      teamNames.add(row['Away Team'].trim());
    });
    
    const teamNamesArray = Array.from(teamNames);
    
    // Check which teams exist in database
    const existingTeamsResult = await db.query(
      'SELECT name, id FROM teams WHERE name = ANY($1)',
      [teamNamesArray]
    );
    
    const existingTeamsMap = new Map<string, number>();
    existingTeamsResult.rows.forEach(team => {
      existingTeamsMap.set(team.name, team.id);
    });
    
    // Find missing teams
    const missingTeams = teamNamesArray.filter(name => !existingTeamsMap.has(name));
    
    if (missingTeams.length > 0) {
      return res.status(400).json({ 
        error: 'The following teams are not in the database',
        missing_teams: missingTeams,
        suggestion: 'Please add these teams to the database first, or ensure team names in CSV match exactly'
      });
    }
    
    // Delete existing fixtures for this season (in case of re-import)
    await db.query('DELETE FROM fixtures WHERE season_id = $1', [seasonId]);
    
    // Prepare fixture data
    const fixtureData: any[] = [];
    const errors: string[] = [];
    
    csvData.forEach((row, index) => {
      try {
        const matchNumber = parseInt(row['Match Number']);
        const roundNumber = parseInt(row['Round Number']);
        const homeTeamId = existingTeamsMap.get(row['Home Team'].trim());
        const awayTeamId = existingTeamsMap.get(row['Away Team'].trim());
        
        if (isNaN(matchNumber) || isNaN(roundNumber)) {
          errors.push(`Row ${index + 2}: Invalid match or round number`);
          return;
        }
        
        if (!homeTeamId || !awayTeamId) {
          errors.push(`Row ${index + 2}: Could not find team IDs`);
          return;
        }
        
        if (homeTeamId === awayTeamId) {
          errors.push(`Row ${index + 2}: Home and away teams cannot be the same`);
          return;
        }
        
        // Parse date (optional)
        let matchDate: Date | null = null;
        if (row.Date && row.Date.trim()) {
          try {
            matchDate = new Date(row.Date);
            if (isNaN(matchDate.getTime())) {
              matchDate = null;
            }
          } catch {
            matchDate = null;
          }
        }
        
        fixtureData.push({
          season_id: seasonId,
          round_number: roundNumber,
          match_number: matchNumber,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          match_date: matchDate,
          location: row.Location?.trim() || null,
        });
      } catch (error) {
        errors.push(`Row ${index + 2}: ${error}`);
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'CSV contains errors',
        errors: errors.slice(0, 10), // Limit to first 10 errors
        total_errors: errors.length
      });
    }
    
    // Insert fixtures into database
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      for (const fixture of fixtureData) {
        await client.query(`
          INSERT INTO fixtures (season_id, round_number, match_number, home_team_id, away_team_id, match_date, location)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          fixture.season_id,
          fixture.round_number,
          fixture.match_number,
          fixture.home_team_id,
          fixture.away_team_id,
          fixture.match_date,
          fixture.location
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    // Get statistics
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_fixtures,
        COUNT(DISTINCT round_number) as total_rounds,
        COUNT(DISTINCT home_team_id) + COUNT(DISTINCT away_team_id) as total_teams_involved,
        MIN(round_number) as first_round,
        MAX(round_number) as last_round
      FROM fixtures 
      WHERE season_id = $1
    `, [seasonId]);
    
    const stats = statsResult.rows[0];
    
    return res.status(201).json({
      message: 'Fixtures imported successfully',
      stats: {
        total_fixtures: parseInt(stats.total_fixtures),
        total_rounds: parseInt(stats.total_rounds),
        teams_involved: Math.floor(parseInt(stats.total_teams_involved) / 2), // Divide by 2 since teams appear as both home and away
        first_round: parseInt(stats.first_round),
        last_round: parseInt(stats.last_round),
      },
      teams_found: teamNamesArray.length,
    });
    
  } catch (error) {
    console.error('Error importing fixtures:', error);
    return res.status(500).json({ error: 'Failed to import fixtures from CSV' });
  }
});

// Get rounds for a season
router.get('/season/:seasonId/rounds', async (req, res) => {
  try {
    const { seasonId } = req.params;
    
    const result = await db.query(`
      SELECT 
        round_number,
        COUNT(*) as fixture_count,
        MIN(match_date) as earliest_match,
        MAX(match_date) as latest_match
      FROM fixtures 
      WHERE season_id = $1
      GROUP BY round_number
      ORDER BY round_number
    `, [seasonId]);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rounds:', error);
    return res.status(500).json({ error: 'Failed to fetch rounds' });
  }
});

// Delete all fixtures for a season
router.delete('/season/:seasonId', async (req, res) => {
  try {
    const { seasonId } = req.params;
    
    // Check if season is in setup
    const seasonCheck = await db.query('SELECT status FROM seasons WHERE id = $1', [seasonId]);
    if (seasonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    if (seasonCheck.rows[0].status !== 'setup') {
      return res.status(400).json({ error: 'Can only delete fixtures for seasons in setup status' });
    }
    
    const result = await db.query('DELETE FROM fixtures WHERE season_id = $1', [seasonId]);
    
    return res.json({ 
      message: 'All fixtures deleted successfully',
      deleted_count: result.rowCount 
    });
  } catch (error) {
    console.error('Error deleting fixtures:', error);
    return res.status(500).json({ error: 'Failed to delete fixtures' });
  }
});

export default router;