import { db } from '../index';

export interface SimulationResult {
  home_score: number;
  away_score: number;
  home_probability: number;
  away_probability: number;
  draw_probability: number;
  home_advantage: number;
  strength_difference: number;
}

export interface TeamStrength {
  team_id: number;
  team_name: string;
  strength_rating: number;
  league: string;
}

/**
 * Home advantage factor (typically 3-5 points)
 */
const HOME_ADVANTAGE = 5;

/**
 * Maximum goal difference that can realistically occur
 */
const MAX_GOAL_DIFFERENCE = 8;

/**
 * Gets team strength ratings
 */
export async function getTeamStrengths(teamIds: number[]): Promise<TeamStrength[]> {
  const result = await db.query(
    'SELECT id as team_id, name as team_name, strength_rating, league FROM teams WHERE id = ANY($1)',
    [teamIds]
  );
  
  return result.rows;
}

/**
 * Calculates win probabilities based on team strengths
 */
export function calculateProbabilities(
  homeStrength: number,
  awayStrength: number,
  homeAdvantage: number = HOME_ADVANTAGE
): { home: number; draw: number; away: number } {
  // Adjust home team strength with home advantage
  const adjustedHomeStrength = homeStrength + homeAdvantage;
  
  // Calculate strength difference (-100 to +100)
  const strengthDiff = adjustedHomeStrength - awayStrength;
  
  // Convert strength difference to probability using logistic function
  // This creates a more realistic probability curve
  const homeProbability = 1 / (1 + Math.exp(-strengthDiff / 15)); // Divisor controls sensitivity
  
  // Draw probability is highest when teams are evenly matched
  const strengthBalance = 1 - Math.abs(strengthDiff) / 100;
  const drawProbability = 0.15 + (strengthBalance * 0.15); // 15-30% draw chance
  
  // Away probability is what remains
  const awayProbability = 1 - homeProbability - drawProbability;
  
  // Ensure probabilities are non-negative and sum to 1
  const total = homeProbability + drawProbability + Math.max(0, awayProbability);
  
  return {
    home: homeProbability / total,
    draw: drawProbability / total,
    away: Math.max(0, awayProbability) / total
  };
}

/**
 * Simulates a match score based on team strengths
 */
export function simulateMatchScore(
  homeStrength: number,
  awayStrength: number,
  homeAdvantage: number = HOME_ADVANTAGE
): SimulationResult {
  const probabilities = calculateProbabilities(homeStrength, awayStrength, homeAdvantage);
  
  // Generate random outcome based on probabilities
  const random = Math.random();
  let outcome: 'home' | 'draw' | 'away';
  
  if (random < probabilities.home) {
    outcome = 'home';
  } else if (random < probabilities.home + probabilities.draw) {
    outcome = 'draw';
  } else {
    outcome = 'away';
  }
  
  // Generate realistic scores based on outcome
  let homeScore: number;
  let awayScore: number;
  
  switch (outcome) {
    case 'home':
      // Home win - home team scores more
      homeScore = 1 + Math.floor(Math.random() * 4); // 1-4 goals
      awayScore = Math.floor(Math.random() * homeScore); // 0 to homeScore-1
      break;
      
    case 'away':
      // Away win - away team scores more
      awayScore = 1 + Math.floor(Math.random() * 4); // 1-4 goals
      homeScore = Math.floor(Math.random() * awayScore); // 0 to awayScore-1
      break;
      
    case 'draw':
      // Draw - same score for both teams
      const drawScore = Math.floor(Math.random() * 4); // 0-3 goals each
      homeScore = drawScore;
      awayScore = drawScore;
      break;
  }
  
  // Ensure scores don't exceed realistic limits
  homeScore = Math.min(homeScore, 6);
  awayScore = Math.min(awayScore, 6);
  
  return {
    home_score: homeScore,
    away_score: awayScore,
    home_probability: probabilities.home,
    away_probability: probabilities.away,
    draw_probability: probabilities.draw,
    home_advantage: homeAdvantage,
    strength_difference: (homeStrength + homeAdvantage) - awayStrength
  };
}

/**
 * Simulates a match using database team data
 */
export async function simulateMatch(homeTeamId: number, awayTeamId: number): Promise<SimulationResult> {
  const teams = await getTeamStrengths([homeTeamId, awayTeamId]);
  
  if (teams.length !== 2) {
    throw new Error('Could not find both teams in database');
  }
  
  const homeTeam = teams.find(t => t.team_id === homeTeamId);
  const awayTeam = teams.find(t => t.team_id === awayTeamId);
  
  if (!homeTeam || !awayTeam) {
    throw new Error('Could not match team IDs to team data');
  }
  
  return simulateMatchScore(homeTeam.strength_rating, awayTeam.strength_rating);
}

/**
 * Simulates multiple fixtures and returns results
 */
export async function simulateMultipleFixtures(fixtures: Array<{ id: number; home_team_id: number; away_team_id: number }>): Promise<Array<{ fixture_id: number; simulation: SimulationResult }>> {
  const results = [];
  
  for (const fixture of fixtures) {
    try {
      const simulation = await simulateMatch(fixture.home_team_id, fixture.away_team_id);
      results.push({
        fixture_id: fixture.id,
        simulation
      });
    } catch (error) {
      console.error(`Error simulating fixture ${fixture.id}:`, error);
      // Fallback to random result if simulation fails
      results.push({
        fixture_id: fixture.id,
        simulation: {
          home_score: Math.floor(Math.random() * 4),
          away_score: Math.floor(Math.random() * 4),
          home_probability: 0.33,
          away_probability: 0.33,
          draw_probability: 0.34,
          home_advantage: HOME_ADVANTAGE,
          strength_difference: 0
        }
      });
    }
  }
  
  return results;
}

/**
 * Updates team strength ratings
 */
export async function updateTeamStrength(teamId: number, newRating: number): Promise<void> {
  if (newRating < 1 || newRating > 100) {
    throw new Error('Team strength rating must be between 1 and 100');
  }
  
  await db.query(
    'UPDATE teams SET strength_rating = $1 WHERE id = $2',
    [newRating, teamId]
  );
}

/**
 * Bulk update team strength ratings
 */
export async function bulkUpdateTeamStrengths(updates: Array<{ team_id: number; strength_rating: number }>): Promise<void> {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const update of updates) {
      if (update.strength_rating < 1 || update.strength_rating > 100) {
        throw new Error(`Invalid strength rating ${update.strength_rating} for team ${update.team_id}`);
      }
      
      await client.query(
        'UPDATE teams SET strength_rating = $1 WHERE id = $2',
        [update.strength_rating, update.team_id]
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Gets league strength analysis
 */
export async function getLeagueStrengthAnalysis(league: string): Promise<{
  league: string;
  team_count: number;
  average_strength: number;
  min_strength: number;
  max_strength: number;
  strength_range: number;
  teams: TeamStrength[];
}> {
  const result = await db.query(`
    SELECT 
      COUNT(*) as team_count,
      AVG(strength_rating) as average_strength,
      MIN(strength_rating) as min_strength,
      MAX(strength_rating) as max_strength,
      MAX(strength_rating) - MIN(strength_rating) as strength_range
    FROM teams 
    WHERE league = $1
  `, [league]);
  
  const teamsResult = await db.query(`
    SELECT id as team_id, name as team_name, strength_rating, league
    FROM teams 
    WHERE league = $1 
    ORDER BY strength_rating DESC, name
  `, [league]);
  
  const stats = result.rows[0];
  
  return {
    league,
    team_count: parseInt(stats.team_count),
    average_strength: parseFloat(parseFloat(stats.average_strength).toFixed(1)),
    min_strength: parseInt(stats.min_strength),
    max_strength: parseInt(stats.max_strength),
    strength_range: parseInt(stats.strength_range),
    teams: teamsResult.rows
  };
}

/**
 * Suggests realistic team strength ratings based on real-world performance
 */
export function suggestTeamStrengths(league: string): Record<string, number> {
  const suggestions: Record<string, Record<string, number>> = {
    'Premier League': {
      'Manchester City': 95,
      'Arsenal': 88,
      'Liverpool': 87,
      'Chelsea': 82,
      'Newcastle United': 75,
      'Manchester United': 78,
      'Tottenham Hotspur': 76,
      'Brighton & Hove Albion': 68,
      'West Ham United': 65,
      'Crystal Palace': 62,
      'Aston Villa': 70,
      'Fulham': 60,
      'Wolverhampton Wanderers': 58,
      'Everton': 55,
      'Brentford': 57,
      'Nottingham Forest': 52,
      'Luton Town': 45,
      'Burnley': 48,
      'Sheffield United': 46,
      'Bournemouth': 54
    },
    'Championship': {
      'Leicester City': 78,
      'Leeds United': 75,
      'Southampton': 73,
      'West Bromwich Albion': 70,
      'Norwich City': 68,
      'Middlesbrough': 65,
      'Hull City': 62,
      'Coventry City': 60,
      'Bristol City': 58,
      'Preston North End': 55,
      'Blackburn Rovers': 57,
      'Cardiff City': 54,
      'Swansea City': 56,
      'Millwall': 53,
      'Queens Park Rangers': 52,
      'Stoke City': 51,
      'Watford': 59,
      'Sheffield Wednesday': 50,
      'Birmingham City': 48,
      'Rotherham United': 45,
      'Plymouth Argyle': 42,
      'Ipswich Town': 49,
      'Derby County': 47,
      'Portsmouth': 46
    }
  };
  
  return suggestions[league] || {};
}