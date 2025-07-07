// Simple test to verify TBC logic
import React from 'react';
import MatchSchedule from '../components/MatchSchedule';

// Test component to verify TBC behavior
const TestTBC = () => {
  const playerNames = {
    A: 'Alice',
    B: 'Bob', 
    C: 'Charlie',
    D: 'David'
  };

  console.log('=== Testing TBC Display Logic ===');
  
  // Test case 1: Start of round 1, no matches completed
  console.log('\nTest 1: Start of round 1 (matches 3-6 should show TBC)');
  const scenario1 = {
    currentMatchIndex: 0,
    matchResults: []
  };
  
  // Test case 2: After first match completed
  console.log('\nTest 2: After first match (matches 3-6 should still show TBC)');
  const scenario2 = {
    currentMatchIndex: 1,
    matchResults: [{ winner: 'A' }]
  };
  
  // Test case 3: After first two matches completed
  console.log('\nTest 3: After first two matches (all matches should be confirmed)');
  const scenario3 = {
    currentMatchIndex: 2,
    matchResults: [{ winner: 'A' }, { winner: 'C' }]
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>TBC Display Test</h2>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Scenario 1: Match 1 starting</h3>
        <MatchSchedule 
          currentMatchIndex={scenario1.currentMatchIndex}
          playerNames={playerNames}
          matchResults={scenario1.matchResults}
        />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Scenario 2: After match 1</h3>
        <MatchSchedule 
          currentMatchIndex={scenario2.currentMatchIndex}
          playerNames={playerNames}
          matchResults={scenario2.matchResults}
        />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Scenario 3: After matches 1-2</h3>
        <MatchSchedule 
          currentMatchIndex={scenario3.currentMatchIndex}
          playerNames={playerNames}
          matchResults={scenario3.matchResults}
        />
      </div>
    </div>
  );
};

export default TestTBC;