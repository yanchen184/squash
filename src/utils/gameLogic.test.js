// Unit tests for gameLogic pure functions
import {
  PLAYERS,
  rotatePlayersForRound,
  getPositionMappingForRound,
  generateRandomPermutation,
  generateDynamicMatchOrder,
  generateRoomCode,
  getCurrentMatch,
  getRoundNumber,
  getMatchInRound,
  calculateScores,
  getLeaderboard,
  isValidRoomCode,
} from './gameLogic';

describe('isValidRoomCode', () => {
  it('accepts exactly 6 digits', () => {
    expect(isValidRoomCode('123456')).toBe(true);
    expect(isValidRoomCode('000000')).toBe(true);
  });

  it('rejects wrong length or non-digits', () => {
    expect(isValidRoomCode('12345')).toBe(false);
    expect(isValidRoomCode('1234567')).toBe(false);
    expect(isValidRoomCode('12a456')).toBe(false);
    expect(isValidRoomCode('')).toBe(false);
  });
});

describe('generateRoomCode', () => {
  it('always produces a valid 6-digit code', () => {
    for (let i = 0; i < 100; i++) {
      expect(isValidRoomCode(generateRoomCode())).toBe(true);
    }
  });
});

describe('getRoundNumber / getMatchInRound (legacy 6-per-round semantics)', () => {
  it('maps match index to round (6 matches per round)', () => {
    expect(getRoundNumber(0)).toBe(1);
    expect(getRoundNumber(5)).toBe(1);
    expect(getRoundNumber(6)).toBe(2);
    expect(getRoundNumber(11)).toBe(2);
    expect(getRoundNumber(12)).toBe(3);
  });

  it('maps match index to 1-based position within round', () => {
    expect(getMatchInRound(0)).toBe(1);
    expect(getMatchInRound(5)).toBe(6);
    expect(getMatchInRound(6)).toBe(1);
  });
});

describe('rotatePlayersForRound (legacy, no perms)', () => {
  it('round 1 keeps base order', () => {
    expect(rotatePlayersForRound(1)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('rotates clockwise by (round-1) % 4 steps', () => {
    // one rotation: last element moves to front
    expect(rotatePlayersForRound(2)).toEqual(['D', 'A', 'B', 'C']);
    expect(rotatePlayersForRound(3)).toEqual(['C', 'D', 'A', 'B']);
    expect(rotatePlayersForRound(4)).toEqual(['B', 'C', 'D', 'A']);
    // wraps back to base at round 5
    expect(rotatePlayersForRound(5)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('returns a new array (no mutation of base)', () => {
    const r = rotatePlayersForRound(2);
    r[0] = 'X';
    expect(rotatePlayersForRound(2)).toEqual(['D', 'A', 'B', 'C']);
  });
});

describe('rotatePlayersForRound (with perms)', () => {
  const perms = { 1: ['B', 'D', 'A', 'C'], 2: ['A', 'C', 'D', 'B'] };

  it('sub-round 1 of a user-round uses the perm base unchanged', () => {
    expect(rotatePlayersForRound(1, perms)).toEqual(['B', 'D', 'A', 'C']);
    // user-round 2 starts at game-round 4
    expect(rotatePlayersForRound(4, perms)).toEqual(['A', 'C', 'D', 'B']);
  });

  it('rotates within a user-round per sub-round', () => {
    // round 2 = user-round 1, sub-round 2 -> one rotation of perm[1]
    expect(rotatePlayersForRound(2, perms)).toEqual(['C', 'B', 'D', 'A']);
  });
});

describe('getPositionMappingForRound', () => {
  it('maps original positions A-D to rotated positions', () => {
    expect(getPositionMappingForRound(1)).toEqual({ A: 'A', B: 'B', C: 'C', D: 'D' });
    expect(getPositionMappingForRound(2)).toEqual({ A: 'D', B: 'A', C: 'B', D: 'C' });
  });
});

describe('generateRandomPermutation', () => {
  it('returns a permutation of all 4 players', () => {
    for (let i = 0; i < 50; i++) {
      const perm = generateRandomPermutation();
      expect([...perm].sort()).toEqual(['A', 'B', 'C', 'D']);
    }
  });

  it('avoids the given first pair (order-independent)', () => {
    for (let i = 0; i < 50; i++) {
      const perm = generateRandomPermutation(['A', 'B']);
      const firstPairSet = new Set([perm[0], perm[1]]);
      const isSamePair = firstPairSet.has('A') && firstPairSet.has('B');
      expect(isSamePair).toBe(false);
    }
  });
});

describe('generateDynamicMatchOrder', () => {
  it('produces 2 base matches when no results yet', () => {
    const order = generateDynamicMatchOrder([], 0);
    expect(order[0]).toEqual(['A', 'B']);
    expect(order[1]).toEqual(['C', 'D']);
  });

  it('builds winners/losers brackets for matches 3 and 4', () => {
    const results = [
      { winner: 'A' }, // M1: A beats B
      { winner: 'C' }, // M2: C beats D
    ];
    const order = generateDynamicMatchOrder(results, 0);
    expect(order[2]).toEqual(['A', 'C']); // winners
    expect(order[3]).toEqual(['B', 'D']); // losers
  });

  it('completes to 6 unique pairs', () => {
    const results = [{ winner: 'A' }, { winner: 'C' }];
    const order = generateDynamicMatchOrder(results, 0);
    expect(order).toHaveLength(6);
    const pairs = order.map((m) => [...m].sort().join('-'));
    expect(new Set(pairs).size).toBe(6);
  });
});

describe('getCurrentMatch', () => {
  it('returns the pair for the given match index in the round', () => {
    expect(getCurrentMatch(0, [])).toEqual(['A', 'B']);
    expect(getCurrentMatch(1, [])).toEqual(['C', 'D']);
  });
});

describe('calculateScores', () => {
  it('counts wins per player, ignoring matches without a winner', () => {
    const matches = [
      { winner: 'A' },
      { winner: 'A' },
      { winner: 'B' },
      {},
      { winner: null },
    ];
    expect(calculateScores(matches)).toEqual({ A: 2, B: 1, C: 0, D: 0 });
  });
});

describe('getLeaderboard', () => {
  it('sorts by score descending and uses player names', () => {
    const scores = { A: 1, B: 3, C: 2, D: 0 };
    const names = { A: 'white', B: 'bob', C: 'jimmy', D: 'dada' };
    const board = getLeaderboard(scores, names);
    expect(board.map((e) => e.player)).toEqual(['B', 'C', 'A', 'D']);
    expect(board[0]).toEqual({ player: 'B', name: 'bob', score: 3 });
  });

  it('falls back to player id when name missing', () => {
    const board = getLeaderboard({ A: 1, B: 0, C: 0, D: 0 }, {});
    expect(board[0].name).toBe('A');
  });
});

describe('PLAYERS constant', () => {
  it('is the canonical A-D list', () => {
    expect(PLAYERS).toEqual(['A', 'B', 'C', 'D']);
  });
});
