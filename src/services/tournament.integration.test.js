// End-to-end integration test for the tournament game logic.
//
// This is NOT a UI test. It drives a full tournament through the *real*
// production code path with Firebase reads/writes mocked by an in-memory DB:
//
//   gameLogic (scheduling / pairing / permutations)
//     -> database.recordMatchResult (scoring + R2 permutation trigger)
//     -> rankingLogic (per-round ranking + handicap + tie-break)
//     -> database.finishTournament + getAllHistory
//     -> statsLogic (cross-game aggregation)
//
// The driver reproduces GameRoom.js's exact input path for each match:
//   pair    = getCurrentMatch(currentMatchIndex, persistedMatches, perms)
//   handicap= calculateHandicap(cumulativeWinsUpToMatch(persistedMatches, idx), p1, p2)
//   extras  = { pair, handicap, [scores] }
// so the test exercises the same payload the live frontend sends, not a
// hand-built one.

// --- wire the in-memory Firebase under database.js ----------------------------
// jest.mock factories are hoisted above imports and may only reference
// variables prefixed with "mock". So the in-memory DB is created lazily inside
// the firebase/database factory and re-exposed for reset/inspection below.
jest.mock('./firebase', () => ({
  database: { __isMockDatabase: true },
  analytics: {},
}));

jest.mock('firebase/database', () => {
  // eslint-disable-next-line global-require
  const { createFirebaseMock } = require('./__mocks__/firebaseMock');
  const mockFb = createFirebaseMock();
  return {
    __mockFb: mockFb,
    ref: (...args) => mockFb.ref(...args),
    get: (...args) => mockFb.get(...args),
    set: (...args) => mockFb.set(...args),
    update: (...args) => mockFb.update(...args),
    onValue: (...args) => mockFb.onValue(...args),
    off: (...args) => mockFb.off(...args),
    serverTimestamp: (...args) => mockFb.serverTimestamp(...args),
  };
});

// eslint-disable-next-line import/first
import * as firebaseDatabase from 'firebase/database';
const fb = firebaseDatabase.__mockFb;

// database.js runs for real on top of the mock
import {
  createRoom,
  getRoom,
  recordMatchResult,
  finishTournament,
  getAllHistory,
} from './database';

import { getCurrentMatch } from '../utils/gameLogic';
import {
  cumulativeWinsUpToMatch,
  calculateHandicap,
  computeRoundRanking,
  shouldCollectScore,
  TOTAL_MATCHES,
  MATCHES_PER_ROUND,
} from '../utils/rankingLogic';
import { computeStats, getPlayerOpponentStats } from '../utils/statsLogic';

// -----------------------------------------------------------------------------
// Tournament driver: plays `matchCount` matches into roomCode.
// pickWinner(pair, idx, persistedMatches) -> 'A'|'B'|'C'|'D' (one of the pair).
// Mirrors GameRoom.handlePlayerWin: always sends pair; sends handicap; sends
// scores only when the live UI would collect them (shouldCollectScore).
// -----------------------------------------------------------------------------
const playTournament = async (roomCode, matchCount, pickWinner) => {
  for (let idx = 0; idx < matchCount; idx++) {
    const room = await getRoom(roomCode);
    const persisted = room.matches || [];
    const perms = room.permutations || null;

    const pair = getCurrentMatch(idx, persisted, perms);
    const winner = pickWinner(pair, idx, persisted);

    const roundScores = cumulativeWinsUpToMatch(persisted, idx);
    const handicap = calculateHandicap(roundScores, pair[0], pair[1]);

    const extras = { pair: [pair[0], pair[1]], handicap };
    if (shouldCollectScore(idx, persisted, roundScores)) {
      // a representative 7:5 win when the UI would ask for a score
      extras.scores = { winner: 7, loser: 5 };
    }

    await recordMatchResult(roomCode, idx, winner, extras);
  }
};

// deterministic winner pickers ------------------------------------------------
// "first of pair always wins" gives a predictable score distribution.
const firstWins = (pair) => pair[0];

beforeEach(() => {
  // reset the in-memory DB between tests
  Object.keys(fb.__root).forEach((k) => delete fb.__root[k]);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('tournament integration — full game end to end', () => {
  it('plays 36 matches and persists a consistent room + history', async () => {
    const roomCode = '100001';
    await createRoom(roomCode, 'white', 'integration room');

    await playTournament(roomCode, TOTAL_MATCHES, firstWins);

    const room = await getRoom(roomCode);

    // every slot 0..35 filled, in order, with a winner from its pair
    expect(room.currentMatch).toBe(TOTAL_MATCHES);
    expect(room.matches).toHaveLength(TOTAL_MATCHES);
    room.matches.forEach((m, i) => {
      expect(m).toBeTruthy();
      expect(m.index).toBe(i);
      expect(['A', 'B', 'C', 'D']).toContain(m.winner);
      expect(m.pair).toHaveLength(2);
      expect(m.pair).toContain(m.winner); // winner must be one of the pair
    });

    // room.scores is the *cumulative lifetime* win count across all 36 matches
    const totalWins =
      room.scores.A + room.scores.B + room.scores.C + room.scores.D;
    expect(totalWins).toBe(TOTAL_MATCHES);
  });

  it('generates a Round-2 permutation only after match 17 is recorded', async () => {
    const roomCode = '100002';
    await createRoom(roomCode, 'white');

    // before any play: only the Round-1 perm exists
    let room = await getRoom(roomCode);
    expect(room.permutations[1]).toBeDefined();
    expect(room.permutations[2]).toBeUndefined();

    // play through match index 16 (17 matches): still no R2 perm
    await playTournament(roomCode, 17, firstWins);
    room = await getRoom(roomCode);
    expect(room.permutations[2]).toBeUndefined();

    // record match index 17 (the 18th / last of Round 1): R2 perm appears
    await playTournament2ndHalf(roomCode, 17, 18, firstWins);
    room = await getRoom(roomCode);
    expect(room.permutations[2]).toBeDefined();
    expect([...room.permutations[2]].sort()).toEqual(['A', 'B', 'C', 'D']);

    // R2 first pair must differ from R1 last pair (anti-repeat rule)
    const r1Last = room.matches[17].pair;
    const r2FirstPerm = room.permutations[2];
    const r2FirstPair = new Set([r2FirstPerm[0], r2FirstPerm[1]]);
    const sameAsR1Last =
      r2FirstPair.has(r1Last[0]) && r2FirstPair.has(r1Last[1]);
    expect(sameAsR1Last).toBe(false);
  });

  it('per-round rankings sum to the full win count and rank by round wins', async () => {
    const roomCode = '100003';
    await createRoom(roomCode, 'white');
    await playTournament(roomCode, TOTAL_MATCHES, firstWins);

    const room = await getRoom(roomCode);

    const r1 = computeRoundRanking(room.matches, 1);
    const r2 = computeRoundRanking(room.matches, 2);

    // each round has exactly 18 wins distributed across 4 players
    const sum = (s) => s.A + s.B + s.C + s.D;
    expect(sum(r1.scores)).toBe(MATCHES_PER_ROUND);
    expect(sum(r2.scores)).toBe(MATCHES_PER_ROUND);

    // ranking is sorted by round score descending
    [r1, r2].forEach((r) => {
      expect(r.ranking).toHaveLength(4);
      for (let i = 1; i < r.ranking.length; i++) {
        expect(r.ranking[i - 1].score).toBeGreaterThanOrEqual(
          r.ranking[i].score
        );
      }
      // rank field is 1-based and monotonic
      expect(r.ranking[0].rank).toBe(1);
    });

    // lifetime scores == round1 + round2 per player
    ['A', 'B', 'C', 'D'].forEach((p) => {
      expect(room.scores[p]).toBe(r1.scores[p] + r2.scores[p]);
    });
  });

  it('records handicap inside a round once a player builds a win lead', async () => {
    const roomCode = '100004';
    await createRoom(roomCode, 'white');
    await playTournament(roomCode, TOTAL_MATCHES, firstWins);

    const room = await getRoom(roomCode);

    // With "first of pair always wins", the same players keep accumulating
    // round wins, so later matches in each round must carry a handicap.
    const matchesWithHandicap = room.matches.filter(
      (m) => m.handicap && m.handicap.amount > 0
    );
    expect(matchesWithHandicap.length).toBeGreaterThan(0);

    // every recorded handicap is internally consistent
    matchesWithHandicap.forEach((m) => {
      expect(m.handicap.amount).toBeGreaterThan(0);
      expect(['A', 'B', 'C', 'D']).toContain(m.handicap.giver);
      expect(['A', 'B', 'C', 'D']).toContain(m.handicap.receiver);
      expect(m.handicap.giver).not.toBe(m.handicap.receiver);
      // giver/receiver must be the two players in that match
      expect(m.pair).toContain(m.handicap.giver);
      expect(m.pair).toContain(m.handicap.receiver);
    });
  });
});

describe('tournament integration — history + stats aggregation', () => {
  it('saves a finished game to history and aggregates it into stats', async () => {
    const roomCode = '200001';
    await createRoom(roomCode, 'white', 'stats game');
    await playTournament(roomCode, TOTAL_MATCHES, firstWins);
    await finishTournament(roomCode);

    // room is marked finished
    const room = await getRoom(roomCode);
    expect(room.status).toBe('finished');

    // history has exactly one record, matching the room
    const history = await getAllHistory();
    expect(history).toHaveLength(1);
    const rec = history[0];
    expect(rec.roomId).toBe(roomCode);
    expect(rec.finalScores).toEqual(room.scores);
    expect(rec.matches).toHaveLength(TOTAL_MATCHES);
    expect(rec.players).toEqual(room.playerNames);

    // stats computed over all history (cutoff 0 = include everything)
    const stats = computeStats(history, 0);
    expect(stats.recordCount).toBe(1);

    // total games counted across players = 2 * number of matches
    // (each match contributes 1 game to each of its two players)
    const totalPlayerGames = Object.values(stats.players).reduce(
      (acc, p) => acc + p.totalGames,
      0
    );
    expect(totalPlayerGames).toBe(TOTAL_MATCHES * 2);

    // total wins counted across players = number of matches
    const totalPlayerWins = Object.values(stats.players).reduce(
      (acc, p) => acc + p.wins,
      0
    );
    expect(totalPlayerWins).toBe(TOTAL_MATCHES);

    // win rate is wins/games for each player
    Object.values(stats.players).forEach((p) => {
      if (p.totalGames > 0) {
        expect(p.winRate).toBeCloseTo(p.wins / p.totalGames, 5);
      }
    });
  });

  it('aggregates two finished games into cumulative stats', async () => {
    await createRoom('200002', 'white', 'game one');
    await playTournament('200002', TOTAL_MATCHES, firstWins);
    await finishTournament('200002');

    await createRoom('200003', 'white', 'game two');
    await playTournament('200003', TOTAL_MATCHES, firstWins);
    await finishTournament('200003');

    const history = await getAllHistory();
    expect(history).toHaveLength(2);

    const stats = computeStats(history, 0);
    expect(stats.recordCount).toBe(2);

    // two full games => 2 * 36 wins distributed across players
    const totalPlayerWins = Object.values(stats.players).reduce(
      (acc, p) => acc + p.wins,
      0
    );
    expect(totalPlayerWins).toBe(TOTAL_MATCHES * 2);

    // opponent breakdown for the default host name is well-formed
    const winnerName = history[0].players.A; // 'white' (A always wins here)
    const opponents = getPlayerOpponentStats(stats, winnerName);
    expect(opponents.length).toBeGreaterThan(0);
    opponents.forEach((o) => {
      expect(o.games).toBe(o.wins + o.losses);
      expect(o.winRate).toBeCloseTo(o.wins / o.games, 5);
    });
  });
});

// helper: play a contiguous slice [from, to) of matches (used to step over the
// match-17 boundary precisely). Same input path as playTournament.
async function playTournament2ndHalf(roomCode, from, to, pickWinner) {
  for (let idx = from; idx < to; idx++) {
    const room = await getRoom(roomCode);
    const persisted = room.matches || [];
    const perms = room.permutations || null;

    const pair = getCurrentMatch(idx, persisted, perms);
    const winner = pickWinner(pair, idx, persisted);

    const roundScores = cumulativeWinsUpToMatch(persisted, idx);
    const handicap = calculateHandicap(roundScores, pair[0], pair[1]);

    const extras = { pair: [pair[0], pair[1]], handicap };
    if (shouldCollectScore(idx, persisted, roundScores)) {
      extras.scores = { winner: 7, loser: 5 };
    }
    await recordMatchResult(roomCode, idx, winner, extras);
  }
}
