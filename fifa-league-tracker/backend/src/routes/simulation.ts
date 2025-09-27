import express from 'express';
import { db } from '../index';
import { 
  simulateMatch, 
  simulateMultipleFixtures, 
  updateTeamStrength, 
  bulkUpdateTeamStrengths,
  getLeagueStrengthAnalysis,
  suggestTeamStrengths
} from '../services/matchSimulation';

const router = express.Router();

// Simulate a single match
router.post('/match', async (req, res) => {
  try {
    const { home_team_id, away_team_id } = req.body;
    
    if (!home_team_id || !away_team_id) {
      return res.status(400).json({ error: 'Home team ID and away team ID are required' });
    }
    
    if (home_team_id === away_team_id) {
      return res.status(400).json({ error: 'Home and away teams must be different' });
    }
    
    const result = await simulateMatch(home_team_id, away_team_id);
    
    // Get team names for response
    const teamsResult = await db.query(
      'SELECT id, name FROM teams WHERE id = ANY($1)',
      [[home_team_id, away_team_id]]
    );
    
    const teams = new Map(teamsResult.rows.map(t => [t.id, t.name]));
    
    res.json({
      home_team: {
        id: home_team_id,
        name: teams.get(home_team_id),
        score: result.home_score
      },
      away_team: {
        id: away_team_id,
        name: teams.get(away_team_id),
        score: result.away_score
      },
      probabilities: {
        home_win: (result.home_probability * 100).toFixed(1) + '%',
        draw: (result.draw_probability * 100).toFixed(1) + '%',
        away_win: (result.away_probability * 100).toFixed(1) + '%'
      },
      simulation_details: {
        home_advantage: result.home_advantage,
        strength_difference: result.strength_difference
      }
    });
    
  } catch (error) {
    console.error('Error simulating match:', error);
    res.status(500).json({ error: 'Failed to simulate match' });
  }
});

// Simulate all unplayed fixtures in a round
router.post('/round/:seasonId/:roundNumber', async (req, res) => {
  try {
    const { seasonId, roundNumber } = req.params;
    const { auto_apply = false } = req.body;
    
    // Get unplayed fixtures for this round
    const fixturesResult = await db.query(`
      SELECT 
        f.id,
        f.home_team_id,
        f.away_team_id,
        ht.name as home_team_name,
        at.name as away_team_name
      FROM fixtures f
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      LEFT JOIN matches m ON f.id = m.fixture_id
      WHERE f.season_id = $1 AND f.round_number = $2 AND m.id IS NULL
      ORDER BY f.match_number
    `, [seasonId, roundNumber]);
    
    if (fixturesResult.rows.length === 0) {
      return res.json({
        message: 'No unplayed fixtures found for this round',
        simulated_fixtures: []
      });
    }
    
    const fixtures = fixturesResult.rows;
    const simulations = await simulateMultipleFixtures(fixtures);
    
    // If auto_apply is true, create match records with simulated scores
    if (auto_apply) {
      const client = await db.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const simulation of simulations) {
          const fixture = fixtures.find(f => f.id === simulation.fixture_id);
          
          if (fixture) {
            // Create match record with 'simulated' status
            await client.query(`
              INSERT INTO matches (fixture_id, season_id, player_home_id, player_away_id, home_score, away_score, status, completed_at)
              VALUES ($1, $2, NULL, NULL, $3, $4, 'simulated', CURRENT_TIMESTAMP)
            `, [
              simulation.fixture_id,
              seasonId,
              simulation.simulation.home_score,
              simulation.simulation.away_score
            ]);
          }
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    
    // Format response
    const results = simulations.map(sim => {
      const fixture = fixtures.find(f => f.id === sim.fixture_id);
      return {
        fixture_id: sim.fixture_id,
        home_team: {
          id: fixture?.home_team_id,
          name: fixture?.home_team_name,
          score: sim.simulation.home_score
        },
        away_team: {
          id: fixture?.away_team_id,
          name: fixture?.away_team_name,
          score: sim.simulation.away_score
        },
        probabilities: {
          home_win: (sim.simulation.home_probability * 100).toFixed(1) + '%',
          draw: (sim.simulation.draw_probability * 100).toFixed(1) + '%',
          away_win: (sim.simulation.away_probability * 100).toFixed(1) + '%'
        }
      };
    });
    
    res.json({
      message: auto_apply 
        ? `Simulated and applied results for ${results.length} fixtures in round ${roundNumber}`
        : `Simulated ${results.length} fixtures in round ${roundNumber}`,
      season_id: parseInt(seasonId),
      round_number: parseInt(roundNumber),
      auto_applied: auto_apply,
      simulated_fixtures: results
    });
    
  } catch (error) {
    console.error('Error simulating round:', error);
    res.status(500).json({ error: 'Failed to simulate round' });
  }
});

// Update team strength rating
router.patch('/teams/:teamId/strength', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { strength_rating } = req.body;
    
    if (typeof strength_rating !== 'number') {
      return res.status(400).json({ error: 'Strength rating must be a number' });
    }
    
    await updateTeamStrength(parseInt(teamId), strength_rating);
    
    // Return updated team
    const teamResult = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({
      message: 'Team strength updated successfully',
      team: teamResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating team strength:', error);
    res.status(500).json({ 
      error: 'Failed to update team strength',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Bulk update team strengths
router.patch('/teams/bulk-strength', async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    // Validate updates format
    const invalidUpdates = updates.filter(update => 
      !update.team_id || 
      typeof update.strength_rating !== 'number' ||
      update.strength_rating < 1 ||
      update.strength_rating > 100
    );
    
    if (invalidUpdates.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid updates format',
        details: 'Each update must have team_id and strength_rating (1-100)'
      });
    }
    
    await bulkUpdateTeamStrengths(updates);
    
    res.json({
      message: `Successfully updated strength ratings for ${updates.length} teams`,
      updated_teams: updates.length
    });
    
  } catch (error) {
    console.error('Error bulk updating team strengths:', error);
    res.status(500).json({ 
      error: 'Failed to bulk update team strengths',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get league strength analysis
router.get('/leagues/:league/analysis', async (req, res) => {
  try {
    const { league } = req.params;
    
    const analysis = await getLeagueStrengthAnalysis(league);
    
    if (analysis.team_count === 0) {
      return res.status(404).json({ error: 'League not found or has no teams' });
    }
    
    res.json(analysis);
    
  } catch (error) {
    console.error('Error getting league analysis:', error);
    res.status(500).json({ error: 'Failed to get league strength analysis' });
  }
});

// Get suggested team strengths for a league
router.get('/leagues/:league/suggestions', async (req, res) => {
  try {
    const { league } = req.params;
    
    const suggestions = suggestTeamStrengths(league);
    
    if (Object.keys(suggestions).length === 0) {
      return res.json({
        message: `No predefined suggestions available for ${league}`,
        suggestions: {},
        note: 'You can manually set team strengths based on real-world performance'
      });
    }
    
    // Check which teams from suggestions exist in database
    const teamNames = Object.keys(suggestions);
    const existingTeams = await db.query(
      'SELECT name, id, strength_rating FROM teams WHERE name = ANY($1) AND league = $2',
      [teamNames, league]
    );
    
    const applicableSuggestions = existingTeams.rows.map(team => ({
      team_id: team.id,
      team_name: team.name,
      current_strength: team.strength_rating,
      suggested_strength: suggestions[team.name],
      difference: suggestions[team.name] - team.strength_rating
    }));
    
    res.json({
      league,
      total_suggestions: Object.keys(suggestions).length,
      applicable_suggestions: applicableSuggestions.length,
      suggestions: applicableSuggestions,
      bulk_update_payload: applicableSuggestions.map(s => ({
        team_id: s.team_id,
        strength_rating: s.suggested_strength
      }))
    });
    
  } catch (error) {
    console.error('Error getting league suggestions:', error);
    res.status(500).json({ error: 'Failed to get league suggestions' });
  }
});

// Apply suggested strengths for a league
router.post('/leagues/:league/apply-suggestions', async (req, res) => {
  try {
    const { league } = req.params;
    
    const suggestions = suggestTeamStrengths(league);
    
    if (Object.keys(suggestions).length === 0) {
      return res.status(404).json({ error: 'No suggestions available for this league' });
    }
    
    // Get existing teams that match suggestions
    const teamNames = Object.keys(suggestions);
    const existingTeams = await db.query(
      'SELECT name, id FROM teams WHERE name = ANY($1) AND league = $2',
      [teamNames, league]
    );
    
    if (existingTeams.rows.length === 0) {
      return res.status(404).json({ error: 'No matching teams found in database' });
    }
    
    // Create bulk update payload
    const updates = existingTeams.rows.map(team => ({
      team_id: team.id,
      strength_rating: suggestions[team.name]
    }));
    
    await bulkUpdateTeamStrengths(updates);
    
    res.json({
      message: `Applied suggested strength ratings for ${updates.length} teams in ${league}`,
      league,
      updated_teams: updates.length,
      updates
    });
    
  } catch (error) {
    console.error('Error applying league suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to apply league suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;