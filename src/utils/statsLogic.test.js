// Unit tests for statsLogic — history aggregation (pure parts)
import { computeStats, getPlayerOpponentStats, RANGE_LABELS } from './statsLogic';

// A history record: matches carry pair + winner (+ optional handicap).
// gameEndTime gates the cutoff filter.
const record = (overrides = {}) => ({
  gameEndTime: 2_000_000_000_000, // well after any cutoff used below
  players: { A: 'white', B: 'bob', C: 'jimmy', D: 'dada' },
  matches: [
    { winner: 'A', pair: ['A', 'B'] },
    { winner: 'A', pair: ['A', 'C'] },
    { winner: 'B', pair: ['B', 'C'], handicap: { giver: 'A', receiver: 'B', amount: 2 } },
  ],
  ...overrides,
});

const CUTOFF = 1_000_000_000_000;

describe('RANGE_LABELS', () => {
  it('exposes the five time-range keys', () => {
    expect(Object.keys(RANGE_LABELS).sort()).toEqual(
      ['all', 'today', 'month', 'quarter', 'year'].sort()
    );
  });
});

describe('computeStats — cutoff filtering', () => {
  it('excludes records older than rangeStart', () => {
    const records = [
      record({ gameEndTime: CUTOFF - 1 }), // too old
      record({ gameEndTime: CUTOFF + 1 }), // kept
    ];
    const stats = computeStats(records, CUTOFF);
    expect(stats.recordCount).toBe(1);
  });

  it('ignores records without gameEndTime', () => {
    const stats = computeStats([record({ gameEndTime: null })], CUTOFF);
    expect(stats.recordCount).toBe(0);
  });
});

describe('computeStats — per-player aggregation', () => {
  it('counts games, wins, and win rate by player name', () => {
    const stats = computeStats([record()], CUTOFF);
    const white = stats.players['white'];
    const bob = stats.players['bob'];

    // white (A) played 2 games (vs B, vs C), won both
    expect(white.totalGames).toBe(2);
    expect(white.wins).toBe(2);
    expect(white.winRate).toBe(1);

    // bob (B) played 2 games (vs A, vs C), won 1
    expect(bob.totalGames).toBe(2);
    expect(bob.wins).toBe(1);
    expect(bob.winRate).toBe(0.5);
  });

  it('tracks handicap given and received per player', () => {
    const stats = computeStats([record()], CUTOFF);
    expect(stats.players['white'].handicapGiven).toBe(2);
    expect(stats.players['white'].handicapGivenCount).toBe(1);
    expect(stats.players['bob'].handicapReceived).toBe(2);
    expect(stats.players['bob'].handicapReceivedCount).toBe(1);
  });
});

describe('computeStats — pair aggregation', () => {
  it('aggregates head-to-head wins by name', () => {
    const stats = computeStats([record()], CUTOFF);
    const key = ['white', 'bob'].sort().join('|');
    const pair = stats.pairs[key];
    expect(pair.totalGames).toBe(1);
    expect(pair.winsByName['white']).toBe(1);
  });
});

describe('getPlayerOpponentStats', () => {
  it('returns opponent breakdown for a given player', () => {
    const stats = computeStats([record()], CUTOFF);
    const opponents = getPlayerOpponentStats(stats, 'white');
    const names = opponents.map((o) => o.opponent).sort();
    expect(names).toEqual(['bob', 'jimmy']);
  });

  it('returns empty for an unknown player', () => {
    const stats = computeStats([record()], CUTOFF);
    expect(getPlayerOpponentStats(stats, 'nobody')).toEqual([]);
  });
});
