import { db } from '../index';

export interface PenaltyAttemptResult {
  player_id: number;
  attempt_number: number;
  guess: 'heads' | 'tails';
  coin_result: 'heads' | 'tails';
  successful: boolean;
  description: string;
}

export interface ShootoutResult {
  shootout_id: number;
  winning_team_id: number;
  winning_player_id: number;
  final_score: {
    team1_score: number;
    team2_score: number;
  };
  attempts: PenaltyAttemptResult[];
  summary: string;
}

/**
 * Simulates a coin flip
 */
export function flipCoin(): 'heads' | 'tails' {
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

/**
 * Generates a descriptive message for a penalty attempt
 */
export function generatePenaltyDescription(successful: boolean, guess: 'heads' | 'tails', result: 'heads' | 'tails'): string {
  const descriptions = {
    successful: [
      `Perfect placement! The keeper dove the wrong way.`,
      `Rocket into the top corner! Unstoppable!`,
      `Cool as ice, slots it down the middle.`,
      `Keeper guessed right but couldn't reach it!`,
      `Powerful shot finds the bottom corner.`,
      `Cheeky panenka! The keeper looks foolish.`,
      `Side-footed perfectly into the corner.`,
      `Thunderbolt into the roof of the net!`,
    ],
    failed: [
      `Blazed it over the bar! Pressure got to them.`,
      `Keeper made a brilliant save!`,
      `Hit the post! So close but no goal.`,
      `Weak effort, easily saved by the keeper.`,
      `Skied it into the stands! Terrible penalty.`,
      `Keeper dived the right way and palmed it away.`,
      `Hit the crossbar and bounced out!`,
      `Scuffed the shot completely wide of the goal.`,
      `Keeper stayed in the middle and caught it!`,
    ]
  };
  
  const relevantDescriptions = successful ? descriptions.successful : descriptions.failed;
  const randomDescription = relevantDescriptions[Math.floor(Math.random() * relevantDescriptions.length)];
  
  return `Guessed ${guess}, coin showed ${result}. ${randomDescription}`;
}

/**
 * Conducts a penalty shootout between two players
 */
export async function conductPenaltyShootout(
  matchId: number | null,
  cupMatchId: number | null,
  player1Id: number,
  player2Id: number,
  team1Id: number,
  team2Id: number
): Promise<ShootoutResult> {
  
  if (!matchId && !cupMatchId) {
    throw new Error('Either matchId or cupMatchId must be provided');
  }
  
  if (matchId && cupMatchId) {
    throw new Error('Cannot provide both matchId and cupMatchId');
  }
  
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create the penalty shootout record
    const shootoutResult = await client.query(`
      INSERT INTO penalty_shootouts (match_id, cup_match_id, winning_team_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [matchId, cupMatchId, team1Id]); // Temporary winning team, will update later
    
    const shootoutId = shootoutResult.rows[0].id;
    
    let team1Score = 0;
    let team2Score = 0;
    const attempts: PenaltyAttemptResult[] = [];
    
    // Regular 5-round shootout
    for (let round = 1; round <= 5; round++) {
      // Player 1 attempt (team 1)
      const player1Guess: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails'; // In real app, this would come from UI
      const player1CoinResult = flipCoin();
      const player1Success = player1Guess === player1CoinResult;
      if (player1Success) team1Score++;
      
      const player1Description = generatePenaltyDescription(player1Success, player1Guess, player1CoinResult);
      
      await client.query(`
        INSERT INTO penalty_attempts (shootout_id, player_id, attempt_number, guess, coin_result, successful, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [shootoutId, player1Id, round * 2 - 1, player1Guess, player1CoinResult, player1Success, player1Description]);
      
      attempts.push({
        player_id: player1Id,
        attempt_number: round * 2 - 1,
        guess: player1Guess,
        coin_result: player1CoinResult,
        successful: player1Success,
        description: player1Description,
      });
      
      // Player 2 attempt (team 2)
      const player2Guess: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails'; // In real app, this would come from UI
      const player2CoinResult = flipCoin();
      const player2Success = player2Guess === player2CoinResult;
      if (player2Success) team2Score++;
      
      const player2Description = generatePenaltyDescription(player2Success, player2Guess, player2CoinResult);
      
      await client.query(`
        INSERT INTO penalty_attempts (shootout_id, player_id, attempt_number, guess, coin_result, successful, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [shootoutId, player2Id, round * 2, player2Guess, player2CoinResult, player2Success, player2Description]);
      
      attempts.push({
        player_id: player2Id,
        attempt_number: round * 2,
        guess: player2Guess,
        coin_result: player2CoinResult,
        successful: player2Success,
        description: player2Description,
      });
      
      // Check for early finish (if one team can't catch up)
      const remainingRounds = 5 - round;
      const maxPossibleTeam1 = team1Score + remainingRounds;
      const maxPossibleTeam2 = team2Score + remainingRounds;
      
      if (team1Score > maxPossibleTeam2 || team2Score > maxPossibleTeam1) {
        break; // Early finish
      }
    }
    
    // Sudden death if tied after 5 rounds
    let extraRound = 6;
    while (team1Score === team2Score && extraRound <= 10) { // Max 10 rounds to prevent infinite loops
      // Player 1 sudden death attempt
      const player1Guess: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
      const player1CoinResult = flipCoin();
      const player1Success = player1Guess === player1CoinResult;
      if (player1Success) team1Score++;
      
      const player1Description = generatePenaltyDescription(player1Success, player1Guess, player1CoinResult);
      
      await client.query(`
        INSERT INTO penalty_attempts (shootout_id, player_id, attempt_number, guess, coin_result, successful, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [shootoutId, player1Id, extraRound * 2 - 1, player1Guess, player1CoinResult, player1Success, player1Description]);
      
      attempts.push({
        player_id: player1Id,
        attempt_number: extraRound * 2 - 1,
        guess: player1Guess,
        coin_result: player1CoinResult,
        successful: player1Success,
        description: player1Description,
      });
      
      // Player 2 sudden death attempt
      const player2Guess: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
      const player2CoinResult = flipCoin();
      const player2Success = player2Guess === player2CoinResult;
      if (player2Success) team2Score++;
      
      const player2Description = generatePenaltyDescription(player2Success, player2Guess, player2CoinResult);
      
      await client.query(`
        INSERT INTO penalty_attempts (shootout_id, player_id, attempt_number, guess, coin_result, successful, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [shootoutId, player2Id, extraRound * 2, player2Guess, player2CoinResult, player2Success, player2Description]);
      
      attempts.push({
        player_id: player2Id,
        attempt_number: extraRound * 2,
        guess: player2Guess,
        coin_result: player2CoinResult,
        successful: player2Success,
        description: player2Description,
      });
      
      extraRound++;
    }
    
    // Determine winner
    const winningTeamId = team1Score > team2Score ? team1Id : team2Id;
    const winningPlayerId = team1Score > team2Score ? player1Id : player2Id;
    
    // Update shootout with winning team
    await client.query(`
      UPDATE penalty_shootouts SET winning_team_id = $1 WHERE id = $2
    `, [winningTeamId, shootoutId]);
    
    await client.query('COMMIT');
    
    return {
      shootout_id: shootoutId,
      winning_team_id: winningTeamId,
      winning_player_id: winningPlayerId,
      final_score: {
        team1_score: team1Score,
        team2_score: team2Score,
      },
      attempts,
      summary: `Penalty shootout completed! Final score: ${team1Score}-${team2Score}. Winner: Team ${winningTeamId}`,
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Gets penalty shootout details by ID
 */
export async function getPenaltyShootout(shootoutId: number) {
  const shootoutResult = await db.query(`
    SELECT 
      ps.*,
      wt.name as winning_team_name
    FROM penalty_shootouts ps
    JOIN teams wt ON ps.winning_team_id = wt.id
    WHERE ps.id = $1
  `, [shootoutId]);
  
  if (shootoutResult.rows.length === 0) {
    throw new Error('Penalty shootout not found');
  }
  
  const attemptsResult = await db.query(`
    SELECT 
      pa.*,
      p.name as player_name
    FROM penalty_attempts pa
    JOIN players p ON pa.player_id = p.id
    WHERE pa.shootout_id = $1
    ORDER BY pa.attempt_number
  `, [shootoutId]);
  
  return {
    ...shootoutResult.rows[0],
    attempts: attemptsResult.rows,
  };
}

/**
 * Manual penalty attempt (for interactive shootouts)
 */
export async function makePenaltyAttempt(
  shootoutId: number,
  playerId: number,
  attemptNumber: number,
  guess: 'heads' | 'tails'
): Promise<PenaltyAttemptResult> {
  const coinResult = flipCoin();
  const successful = guess === coinResult;
  const description = generatePenaltyDescription(successful, guess, coinResult);
  
  await db.query(`
    INSERT INTO penalty_attempts (shootout_id, player_id, attempt_number, guess, coin_result, successful, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [shootoutId, playerId, attemptNumber, guess, coinResult, successful, description]);
  
  return {
    player_id: playerId,
    attempt_number: attemptNumber,
    guess,
    coin_result: coinResult,
    successful,
    description,
  };
}