// Game logic utilities
export const PLAYERS = ['A', 'B', 'C', 'D'];

// Fixed match order for 4 players
export const MATCH_ORDER = [
  ['A', 'B'],
  ['C', 'D'],
  ['C', 'A'],
  ['B', 'D'],
  ['B', 'C'],
  ['A', 'D']
];

// Generate random 6-digit room code
export const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get current match based on match index
export const getCurrentMatch = (matchIndex) => {
  const totalMatches = MATCH_ORDER.length;
  return MATCH_ORDER[matchIndex % totalMatches];
};

// Get round number based on match index
export const getRoundNumber = (matchIndex) => {
  return Math.floor(matchIndex / MATCH_ORDER.length) + 1;
};

// Get match number in current round
export const getMatchInRound = (matchIndex) => {
  return (matchIndex % MATCH_ORDER.length) + 1;
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