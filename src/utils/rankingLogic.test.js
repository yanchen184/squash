// Unit tests for rankingLogic — tie-break engine, handicap, round scoring
import {
  MATCHES_PER_SUBROUND,
  MATCHES_PER_ROUND,
  TOTAL_ROUNDS,
  TOTAL_MATCHES,
  cumulativeWinsInRound,
  cumulativeWinsUpToMatch,
  calculateHandicap,
  subRoundMatchIndexes,
  matchesBetweenPlayers,
  handicapReceivedAcross,
  effectiveScores,
  groupByScore,
  resolveTie,
  computeRoundRanking,
  shouldCollectScore,
} from './rankingLogic';

// Helper: build a sparse matches array with winners at given indexes.
// entries: { [index]: { winner, pair?, handicap?, scores? } }
const buildMatches = (entries, length = TOTAL_MATCHES) => {
  const arr = new Array(length).fill(null);
  Object.entries(entries).forEach(([i, v]) => {
    arr[Number(i)] = v;
  });
  return arr;
};

describe('round/match constants', () => {
  it('encodes 1 round = 3 sub-rounds = 18 matches; 2 rounds = 36', () => {
    expect(MATCHES_PER_SUBROUND).toBe(6);
    expect(MATCHES_PER_ROUND).toBe(18);
    expect(TOTAL_ROUNDS).toBe(2);
    expect(TOTAL_MATCHES).toBe(36);
  });
});

describe('cumulativeWinsInRound', () => {
  it('counts only wins inside the given round window', () => {
    const matches = buildMatches({
      0: { winner: 'A' },
      1: { winner: 'A' },
      17: { winner: 'B' }, // last match of round 1
      18: { winner: 'C' }, // first match of round 2
    });
    expect(cumulativeWinsInRound(matches, 1)).toEqual({ A: 2, B: 1, C: 0, D: 0 });
    expect(cumulativeWinsInRound(matches, 2)).toEqual({ A: 0, B: 0, C: 1, D: 0 });
  });
});

describe('cumulativeWinsUpToMatch', () => {
  it('excludes the target match and resets per round', () => {
    const matches = buildMatches({
      0: { winner: 'A' },
      1: { winner: 'B' },
      2: { winner: 'A' },
      18: { winner: 'C' },
    });
    // up to index 2 (exclusive) in round 1
    expect(cumulativeWinsUpToMatch(matches, 2)).toEqual({ A: 1, B: 1, C: 0, D: 0 });
    // index 19 is round 2; only counts round-2 matches before it
    expect(cumulativeWinsUpToMatch(matches, 19)).toEqual({ A: 0, B: 0, C: 1, D: 0 });
  });
});

describe('calculateHandicap', () => {
  it('leader gives the difference to the trailing player', () => {
    expect(calculateHandicap({ A: 5, B: 2 }, 'A', 'B')).toEqual({
      giver: 'A',
      receiver: 'B',
      amount: 3,
    });
  });

  it('is symmetric in argument order', () => {
    expect(calculateHandicap({ A: 5, B: 2 }, 'B', 'A')).toEqual({
      giver: 'A',
      receiver: 'B',
      amount: 3,
    });
  });

  it('returns zero handicap when tied', () => {
    expect(calculateHandicap({ A: 3, B: 3 }, 'A', 'B')).toEqual({
      giver: null,
      receiver: null,
      amount: 0,
    });
  });

  it('treats missing scores as zero', () => {
    expect(calculateHandicap({ A: 2 }, 'A', 'B')).toEqual({
      giver: 'A',
      receiver: 'B',
      amount: 2,
    });
  });
});

describe('subRoundMatchIndexes', () => {
  it('returns 6 consecutive indexes for a (round, sub-round)', () => {
    expect(subRoundMatchIndexes(1, 1)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(subRoundMatchIndexes(1, 3)).toEqual([12, 13, 14, 15, 16, 17]);
    expect(subRoundMatchIndexes(2, 1)).toEqual([18, 19, 20, 21, 22, 23]);
    expect(subRoundMatchIndexes(2, 3)).toEqual([30, 31, 32, 33, 34, 35]);
  });
});

describe('effectiveScores', () => {
  it('defaults to 7:0 when no scores recorded', () => {
    expect(effectiveScores({ winner: 'A' })).toEqual({ winner: 7, loser: 0 });
    expect(effectiveScores(null)).toEqual({ winner: 0, loser: 0 });
  });

  it('treats anything above 7 as a deuce 8:6', () => {
    expect(effectiveScores({ scores: { winner: 8, loser: 6 } })).toEqual({ winner: 8, loser: 6 });
    expect(effectiveScores({ scores: { winner: 9, loser: 7 } })).toEqual({ winner: 8, loser: 6 });
  });

  it('passes through normal recorded scores', () => {
    expect(effectiveScores({ scores: { winner: 7, loser: 5 } })).toEqual({ winner: 7, loser: 5 });
  });
});

describe('groupByScore', () => {
  it('groups players by score, buckets ordered high to low', () => {
    expect(groupByScore({ A: 3, B: 1, C: 3, D: 2 })).toEqual([['A', 'C'], ['D'], ['B']]);
  });
});

describe('matchesBetweenPlayers', () => {
  it('finds H2H match indexes by recorded pair, optionally filtered by round', () => {
    const matches = buildMatches({
      0: { winner: 'A', pair: ['A', 'B'] },
      3: { winner: 'A', pair: ['A', 'C'] },
      18: { winner: 'B', pair: ['A', 'B'] },
    });
    expect(matchesBetweenPlayers(matches, ['A', 'B'])).toEqual([0, 18]);
    expect(matchesBetweenPlayers(matches, ['A', 'B'], 1)).toEqual([0]);
    expect(matchesBetweenPlayers(matches, ['A', 'B'], 2)).toEqual([18]);
  });
});

describe('handicapReceivedAcross', () => {
  it('sums handicap amount per receiver over the given indexes', () => {
    const matches = buildMatches({
      0: { winner: 'A', handicap: { giver: 'A', receiver: 'B', amount: 3 } },
      1: { winner: 'B', handicap: { giver: 'C', receiver: 'B', amount: 1 } },
      2: { winner: 'C', handicap: { giver: null, receiver: null, amount: 0 } },
    });
    expect(handicapReceivedAcross(matches, [0, 1, 2])).toEqual({ A: 0, B: 4, C: 0, D: 0 });
  });
});

describe('resolveTie', () => {
  it('passes a single player through unchanged', () => {
    const { ordered, needsRps } = resolveTie(['A'], buildMatches({}), 1, false);
    expect(ordered).toEqual(['A']);
    expect(needsRps).toEqual([]);
  });

  it('breaks a 2-way round-1 tie using the first round-2 H2H winner', () => {
    const matches = buildMatches({
      // round 2 first H2H between A and B at index 18, B wins
      18: { winner: 'B', pair: ['A', 'B'] },
    });
    const { ordered } = resolveTie(['A', 'B'], matches, 1, true);
    expect(ordered).toEqual(['B', 'A']);
  });
});

describe('computeRoundRanking', () => {
  it('ranks players by wins within a round', () => {
    const matches = buildMatches({
      0: { winner: 'A', pair: ['A', 'B'] },
      1: { winner: 'A', pair: ['A', 'C'] },
      2: { winner: 'B', pair: ['B', 'C'] },
    });
    const result = computeRoundRanking(matches, 1);
    // ranking is an array of { rank, player, score, tied }
    expect(result.ranking[0].player).toBe('A');
    expect(result.ranking[0].score).toBe(2);
    expect(result.ranking[0].rank).toBe(1);
    expect(result.ranking).toHaveLength(4);
    expect(result.scores).toEqual({ A: 2, B: 1, C: 0, D: 0 });
  });
});

describe('shouldCollectScore', () => {
  it('never collects in round 1', () => {
    expect(shouldCollectScore(0, buildMatches({}))).toBe(false);
    expect(shouldCollectScore(17, buildMatches({}))).toBe(false);
  });

  it('never collects in round-2 sub-round 2', () => {
    // index 24..29 are round 2, sub-round 2
    expect(shouldCollectScore(24, buildMatches({}))).toBe(false);
  });

  it('does not collect in R2 sub-round 1 when round 1 had no 3-way tie', () => {
    const matches = buildMatches({
      0: { winner: 'A', pair: ['A', 'B'] },
      1: { winner: 'A', pair: ['A', 'C'] },
      18: { winner: 'A', pair: ['A', 'B'] },
    });
    expect(shouldCollectScore(18, matches)).toBe(false);
  });
});
