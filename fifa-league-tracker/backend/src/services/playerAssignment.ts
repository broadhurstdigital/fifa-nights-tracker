import { db } from '../index';

export interface PlayerAssignmentResult {
  fixture_id: number;
  home_team_id: number;
  away_team_id: number;
  assigned_home_player_id: number;
  assigned_away_player_id: number;
  home_team_name: string;
  away_team_name: string;
  assigned_home_player_name: string;
  assigned_away_player_name: string;
}

export interface AssignmentStats {
  total_fixtures: number;
  assignments_made: number;
  fixtures_needing_assignment: number;
  player_assignment_counts: Array<{
    player_id: number;
    player_name: string;
    chosen_team_name: string;
    opposition_assignments: number;
  }>;
}

/**
 * Assigns opposition players to fixtures for a given round
 * This is the core algorithm that determines which players play as opposition teams
 */
export async function assignPlayersToRound(seasonId: number, roundNumber: number): Promise<PlayerAssignmentResult[]> {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get all fixtures for this round
    const fixturesResult = await client.query(`
      SELECT 
        f.id as fixture_id,
        f.home_team_id,
        f.away_team_id,
        ht.name as home_team_name,
        at.name as away_team_name
      FROM fixtures f
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      WHERE f.season_id = $1 AND f.round_number = $2
      ORDER BY f.match_number
    `, [seasonId, roundNumber]);
    
    if (fixturesResult.rows.length === 0) {
      throw new Error(`No fixtures found for season ${seasonId}, round ${roundNumber}`);
    }
    
    // Get all players in this season with their chosen teams
    const playersResult = await client.query(`
      SELECT 
        sp.player_id,
        sp.chosen_team_id,
        p.name as player_name,
        t.name as chosen_team_name
      FROM season_players sp
      JOIN players p ON sp.player_id = p.id
      JOIN teams t ON sp.chosen_team_id = t.id
      WHERE sp.season_id = $1
    `, [seasonId]);
    
    if (playersResult.rows.length < 2) {
      throw new Error('Need at least 2 players in the season to assign opposition players');
    }
    
    // Get existing assignments for this round to avoid duplicates
    const existingAssignments = await client.query(`
      SELECT m.fixture_id, m.player_home_id, m.player_away_id
      FROM matches m
      JOIN fixtures f ON m.fixture_id = f.id
      WHERE f.season_id = $1 AND f.round_number = $2
    `, [seasonId, roundNumber]);
    
    const assignedFixtures = new Set(existingAssignments.rows.map(row => row.fixture_id));
    
    const players = playersResult.rows;
    const fixtures = fixturesResult.rows.filter(fixture => !assignedFixtures.has(fixture.fixture_id));
    
    // Track assignments to ensure fair distribution
    const playerAssignmentCount = new Map<number, number>();
    players.forEach(player => {
      playerAssignmentCount.set(player.player_id, 0);
    });
    
    // Get existing assignment counts for the entire season to maintain balance
    const seasonAssignmentsResult = await client.query(`
      SELECT 
        COALESCE(m.player_home_id, m.player_away_id) as player_id,
        COUNT(*) as assignment_count
      FROM matches m
      JOIN fixtures f ON m.fixture_id = f.id
      WHERE f.season_id = $1 
      AND (m.player_home_id IS NOT NULL OR m.player_away_id IS NOT NULL)
      GROUP BY COALESCE(m.player_home_id, m.player_away_id)
    `, [seasonId]);
    
    // Update assignment counts with existing assignments
    seasonAssignmentsResult.rows.forEach(row => {
      const currentCount = playerAssignmentCount.get(row.player_id) || 0;
      playerAssignmentCount.set(row.player_id, currentCount + parseInt(row.assignment_count));
    });
    
    const assignments: PlayerAssignmentResult[] = [];
    
    // Process each fixture
    for (const fixture of fixtures) {
      // Find players who are not playing as their chosen team in this fixture
      const availablePlayersForHome = players.filter(player => 
        player.chosen_team_id !== fixture.home_team_id && 
        player.chosen_team_id !== fixture.away_team_id
      );
      
      const availablePlayersForAway = players.filter(player => 
        player.chosen_team_id !== fixture.home_team_id && 
        player.chosen_team_id !== fixture.away_team_id
      );
      
      if (availablePlayersForHome.length === 0 || availablePlayersForAway.length === 0) {
        console.warn(`Not enough available players for fixture ${fixture.fixture_id}: ${fixture.home_team_name} vs ${fixture.away_team_name}`);
        continue;
      }
      
      // Select players with the lowest assignment count for fair distribution
      const sortedPlayersForHome = availablePlayersForHome.sort((a, b) => {
        const countA = playerAssignmentCount.get(a.player_id) || 0;
        const countB = playerAssignmentCount.get(b.player_id) || 0;
        if (countA !== countB) return countA - countB;
        // If same assignment count, use player ID for deterministic ordering
        return a.player_id - b.player_id;
      });
      
      const selectedHomePlayer = sortedPlayersForHome[0];
      
      // For away player, exclude the selected home player and choose next best
      const sortedPlayersForAway = availablePlayersForAway
        .filter(player => player.player_id !== selectedHomePlayer.player_id)
        .sort((a, b) => {
          const countA = playerAssignmentCount.get(a.player_id) || 0;
          const countB = playerAssignmentCount.get(b.player_id) || 0;
          if (countA !== countB) return countA - countB;
          return a.player_id - b.player_id;
        });
      
      if (sortedPlayersForAway.length === 0) {
        console.warn(`No available away player for fixture ${fixture.fixture_id} after selecting home player`);
        continue;
      }
      
      const selectedAwayPlayer = sortedPlayersForAway[0];
      
      // Create the match assignment
      const matchResult = await client.query(`
        INSERT INTO matches (fixture_id, season_id, player_home_id, player_away_id, status)
        VALUES ($1, $2, $3, $4, 'scheduled')
        RETURNING id
      `, [fixture.fixture_id, seasonId, selectedHomePlayer.player_id, selectedAwayPlayer.player_id]);
      
      // Update assignment counts
      playerAssignmentCount.set(selectedHomePlayer.player_id, 
        (playerAssignmentCount.get(selectedHomePlayer.player_id) || 0) + 1
      );
      playerAssignmentCount.set(selectedAwayPlayer.player_id, 
        (playerAssignmentCount.get(selectedAwayPlayer.player_id) || 0) + 1
      );
      
      assignments.push({
        fixture_id: fixture.fixture_id,
        home_team_id: fixture.home_team_id,
        away_team_id: fixture.away_team_id,
        assigned_home_player_id: selectedHomePlayer.player_id,
        assigned_away_player_id: selectedAwayPlayer.player_id,
        home_team_name: fixture.home_team_name,
        away_team_name: fixture.away_team_name,
        assigned_home_player_name: selectedHomePlayer.player_name,
        assigned_away_player_name: selectedAwayPlayer.player_name,
      });
    }
    
    await client.query('COMMIT');
    return assignments;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Assigns players to all remaining unassigned fixtures in a season
 */
export async function assignPlayersToSeason(seasonId: number): Promise<AssignmentStats> {
  // Get all rounds that have fixtures
  const roundsResult = await db.query(`
    SELECT DISTINCT round_number
    FROM fixtures
    WHERE season_id = $1
    ORDER BY round_number
  `, [seasonId]);
  
  let totalAssignments = 0;
  const playerStats = new Map<number, { player_name: string; chosen_team_name: string; assignments: number }>();
  
  for (const roundRow of roundsResult.rows) {
    const roundNumber = roundRow.round_number;
    
    try {
      const assignments = await assignPlayersToRound(seasonId, roundNumber);
      totalAssignments += assignments.length;
      
      // Track player assignment stats
      assignments.forEach(assignment => {
        // Count home player assignment
        const homeKey = assignment.assigned_home_player_id;
        if (!playerStats.has(homeKey)) {
          playerStats.set(homeKey, {
            player_name: assignment.assigned_home_player_name,
            chosen_team_name: '', // Will be filled later
            assignments: 0
          });
        }
        playerStats.get(homeKey)!.assignments += 1;
        
        // Count away player assignment
        const awayKey = assignment.assigned_away_player_id;
        if (!playerStats.has(awayKey)) {
          playerStats.set(awayKey, {
            player_name: assignment.assigned_away_player_name,
            chosen_team_name: '', // Will be filled later
            assignments: 0
          });
        }
        playerStats.get(awayKey)!.assignments += 1;
      });
      
    } catch (error) {
      console.error(`Error assigning players to round ${roundNumber}:`, error);
    }
  }
  
  // Get player chosen team names
  const playersResult = await db.query(`
    SELECT 
      sp.player_id,
      t.name as chosen_team_name
    FROM season_players sp
    JOIN teams t ON sp.chosen_team_id = t.id
    WHERE sp.season_id = $1
  `, [seasonId]);
  
  playersResult.rows.forEach(row => {
    if (playerStats.has(row.player_id)) {
      playerStats.get(row.player_id)!.chosen_team_name = row.chosen_team_name;
    }
  });
  
  // Get total fixtures and remaining assignments needed
  const statsResult = await db.query(`
    SELECT 
      COUNT(f.id) as total_fixtures,
      COUNT(m.id) as assigned_fixtures
    FROM fixtures f
    LEFT JOIN matches m ON f.id = m.fixture_id
    WHERE f.season_id = $1
  `, [seasonId]);
  
  const stats = statsResult.rows[0];
  const totalFixtures = parseInt(stats.total_fixtures);
  const assignedFixtures = parseInt(stats.assigned_fixtures);
  
  return {
    total_fixtures: totalFixtures,
    assignments_made: assignedFixtures,
    fixtures_needing_assignment: totalFixtures - assignedFixtures,
    player_assignment_counts: Array.from(playerStats.entries()).map(([playerId, data]) => ({
      player_id: playerId,
      player_name: data.player_name,
      chosen_team_name: data.chosen_team_name,
      opposition_assignments: data.assignments,
    })).sort((a, b) => b.opposition_assignments - a.opposition_assignments),
  };
}

/**
 * Gets assignment statistics for a season
 */
export async function getAssignmentStats(seasonId: number): Promise<AssignmentStats> {
  const statsResult = await db.query(`
    SELECT 
      COUNT(f.id) as total_fixtures,
      COUNT(m.id) as assigned_fixtures
    FROM fixtures f
    LEFT JOIN matches m ON f.id = m.fixture_id
    WHERE f.season_id = $1
  `, [seasonId]);
  
  const playerStatsResult = await db.query(`
    SELECT 
      p.id as player_id,
      p.name as player_name,
      t.name as chosen_team_name,
      COUNT(CASE WHEN m.player_home_id = p.id OR m.player_away_id = p.id THEN 1 END) as opposition_assignments
    FROM season_players sp
    JOIN players p ON sp.player_id = p.id
    JOIN teams t ON sp.chosen_team_id = t.id
    LEFT JOIN matches m ON (m.player_home_id = p.id OR m.player_away_id = p.id)
      AND m.season_id = sp.season_id
    WHERE sp.season_id = $1
    GROUP BY p.id, p.name, t.name
    ORDER BY opposition_assignments DESC
  `, [seasonId]);
  
  const stats = statsResult.rows[0];
  const totalFixtures = parseInt(stats.total_fixtures);
  const assignedFixtures = parseInt(stats.assigned_fixtures);
  
  return {
    total_fixtures: totalFixtures,
    assignments_made: assignedFixtures,
    fixtures_needing_assignment: totalFixtures - assignedFixtures,
    player_assignment_counts: playerStatsResult.rows.map(row => ({
      player_id: row.player_id,
      player_name: row.player_name,
      chosen_team_name: row.chosen_team_name,
      opposition_assignments: parseInt(row.opposition_assignments),
    })),
  };
}