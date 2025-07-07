// Game logic utilities
export const PLAYERS = ['A', 'B', 'C', 'D'];

// Fixed first two matches
export const INITIAL_MATCHES = [
  ['A', 'B'], // Match 1
  ['C', 'D']  // Match 2
];

// Traditional fixed match order (for reference)
export const TRADITIONAL_MATCH_ORDER = [
  ['A', 'B'],
  ['C', 'D'],
  ['C', 'A'],
  ['B', 'D'],
  ['B', 'C'],
  ['A', 'D']
];

// Rotate players for new round: A->B, B->C, C->D, D->A
export const rotatePlayersForRound = (roundNumber) => {
  const basePositions = ['A', 'B', 'C', 'D'];
  if (roundNumber <= 1) {
    return basePositions;
  }
  
  // For round 2 and beyond, rotate positions
  const rotationOffset = (roundNumber - 1) % 4;
  const rotatedPositions = [...basePositions];
  
  for (let i = 0; i < rotationOffset; i++) {
    // A->B, B->C, C->D, D->A rotation
    const temp = rotatedPositions[3]; // Save D
    rotatedPositions[3] = rotatedPositions[2]; // D = C
    rotatedPositions[2] = rotatedPositions[1]; // C = B
    rotatedPositions[1] = rotatedPositions[0]; // B = A
    rotatedPositions[0] = temp; // A = D
  }
  
  return rotatedPositions;
};

// Get position mapping for current round
export const getPositionMappingForRound = (roundNumber) => {
  const rotatedPositions = rotatePlayersForRound(roundNumber);
  const mapping = {};
  
  // Map original positions to rotated positions
  ['A', 'B', 'C', 'D'].forEach((originalPos, index) => {
    mapping[originalPos] = rotatedPositions[index];
  });
  
  return mapping;
};

// Dynamic match order based on previous results and round rotation
export const generateDynamicMatchOrder = (matchResults = [], currentMatchIndex = 0) => {
  // Calculate current round (6 matches per round)
  const currentRound = Math.floor(currentMatchIndex / 6) + 1;
  const positionMapping = getPositionMappingForRound(currentRound);
  
  // Apply position mapping to get current round players
  const currentPlayers = {
    A: positionMapping['A'],
    B: positionMapping['B'], 
    C: positionMapping['C'],
    D: positionMapping['D']
  };
  
  // Base match order with rotated players
  const baseMatches = [
    [currentPlayers.A, currentPlayers.B], // Match 1
    [currentPlayers.C, currentPlayers.D]  // Match 2
  ];
  
  // Get results for current round only
  const roundStartIndex = (currentRound - 1) * 6;
  const roundResults = matchResults.slice(roundStartIndex, roundStartIndex + 6);
  
  // If we have results for first two matches, generate next two
  if (roundResults.length >= 2) {
    const match1Winner = roundResults[0]?.winner;
    const match1Loser = roundResults[0]?.winner === currentPlayers.A ? currentPlayers.B : currentPlayers.A;
    const match2Winner = roundResults[1]?.winner;
    const match2Loser = roundResults[1]?.winner === currentPlayers.C ? currentPlayers.D : currentPlayers.C;
    
    if (match1Winner && match2Winner) {
      // Match 3: Winners bracket
      baseMatches.push([match1Winner, match2Winner]);
      // Match 4: Losers bracket
      baseMatches.push([match1Loser, match2Loser]);
    }
  }
  
  // Add remaining combinations for complete round (6 total matches)
  if (baseMatches.length < 6) {
    const allCurrentPlayers = [currentPlayers.A, currentPlayers.B, currentPlayers.C, currentPlayers.D];
    const existingPairs = new Set();
    
    // Track existing pairs
    baseMatches.forEach(match => {
      const pair = [match[0], match[1]].sort().join('-');
      existingPairs.add(pair);
    });
    
    // Add remaining combinations
    for (let i = 0; i < allCurrentPlayers.length; i++) {
      for (let j = i + 1; j < allCurrentPlayers.length; j++) {
        const pair = [allCurrentPlayers[i], allCurrentPlayers[j]].sort().join('-');
        if (!existingPairs.has(pair) && baseMatches.length < 6) {
          baseMatches.push([allCurrentPlayers[i], allCurrentPlayers[j]]);
          existingPairs.add(pair);
        }
      }
    }
  }
  
  return baseMatches;
};

// Default match order for initial state
export const MATCH_ORDER = generateDynamicMatchOrder();

// Generate random 6-digit room code
export const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get current match based on match index and previous results
export const getCurrentMatch = (matchIndex, matchResults = []) => {
  const dynamicOrder = generateDynamicMatchOrder(matchResults, matchIndex);
  const matchInCurrentRound = matchIndex % 6;
  return dynamicOrder[matchInCurrentRound] || dynamicOrder[0];
};

// Get current match order based on results and match index
export const getCurrentMatchOrder = (matchResults = [], currentMatchIndex = 0) => {
  return generateDynamicMatchOrder(matchResults, currentMatchIndex);
};

// Get round number based on match index (6 matches per round)
export const getRoundNumber = (matchIndex) => {
  return Math.floor(matchIndex / 6) + 1;
};

// Get match number in current round
export const getMatchInRound = (matchIndex) => {
  return (matchIndex % 6) + 1;
};

// Get player rotation info for display
export const getPlayerRotationInfo = (roundNumber) => {
  const positionMapping = getPositionMappingForRound(roundNumber);
  return {
    round: roundNumber,
    mapping: positionMapping,
    rotatedPositions: rotatePlayersForRound(roundNumber)
  };
};

// Calculate total scores for all players
export const calculateScores = (matches) => {
  const scores = { A: 0, B: 0, C: 0, D: 0 };
  
  matches.forEach(match => {
    if (match.winner) {
      scores[match.winner] += 1;
    }
  });
  
  return scores;
};

// Get leaderboard sorted by scores
export const getLeaderboard = (scores, playerNames) => {
  return Object.entries(scores)
    .map(([player, score]) => ({
      player,
      name: playerNames[player] || player,
      score
    }))
    .sort((a, b) => b.score - a.score);
};

// Check if room code is valid (6 digits)
export const isValidRoomCode = (code) => {
  return /^\d{6}$/.test(code);
};