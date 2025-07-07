// Test file to verify rotation logic
import { 
  rotatePlayersForRound, 
  getPositionMappingForRound, 
  generateDynamicMatchOrder, 
  getCurrentMatch,
  getRoundNumber,
  getMatchInRound 
} from './gameLogic';

// Test rotation logic
console.log('=== Testing Player Rotation ===');

for (let round = 1; round <= 4; round++) {
  console.log(`\nRound ${round}:`);
  const rotatedPositions = rotatePlayersForRound(round);
  const mapping = getPositionMappingForRound(round);
  
  console.log('Rotated positions:', rotatedPositions);
  console.log('Position mapping:', mapping);
  
  // Generate match order for this round
  const matchOrder = generateDynamicMatchOrder([], (round - 1) * 6);
  console.log('Match order:', matchOrder);
}

// Test specific scenarios
console.log('\n=== Testing Match Generation ===');

// Mock some match results
const mockResults = [
  { winner: 'A' }, // Match 1: A beats B
  { winner: 'C' }, // Match 2: C beats D
  { winner: 'A' }, // Match 3: A beats C (winner bracket)
  { winner: 'B' }, // Match 4: B beats D (loser bracket)
  { winner: 'A' }, // Match 5: A beats B
  { winner: 'C' }  // Match 6: A beats D
];

// Test round 1 matches
console.log('\nRound 1 matches:');
for (let i = 0; i < 6; i++) {
  const match = getCurrentMatch(i, mockResults.slice(0, i));
  const roundNum = getRoundNumber(i);
  const matchInRound = getMatchInRound(i);
  console.log(`Match ${i}: Round ${roundNum}, Match ${matchInRound}/6 -> ${match[0]} vs ${match[1]}`);
}

// Test round 2 matches (should have rotation)
console.log('\nRound 2 matches:');
for (let i = 6; i < 12; i++) {
  const match = getCurrentMatch(i, mockResults);
  const roundNum = getRoundNumber(i);
  const matchInRound = getMatchInRound(i);
  console.log(`Match ${i}: Round ${roundNum}, Match ${matchInRound}/6 -> ${match[0]} vs ${match[1]}`);
}

export { }; // Make this a module