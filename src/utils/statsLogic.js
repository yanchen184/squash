// 歷史統計邏輯 - 從 2026-06-18 (台灣時間) 起算
// 因為更早的歷史資料很多沒按結束 = 垃圾資料

import { computeRoundRanking } from './rankingLogic';

// 2026-06-18 00:00:00 +08:00 = UTC 2026-06-17 16:00:00
export const STATS_START_TIMESTAMP = Date.parse('2026-06-18T00:00:00+08:00');

// 取時間區間的下限 (Asia/Taipei 為基準)
// rangeKey: 'today' | 'month' | 'quarter' | 'year' | 'all'
export const getRangeStart = (rangeKey) => {
  if (rangeKey === 'all') return STATS_START_TIMESTAMP;
  // 用台灣時區的「今天 00:00」算
  const now = new Date();
  const tw = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const y = tw.getFullYear();
  const m = tw.getMonth();
  const d = tw.getDate();
  let start;
  if (rangeKey === 'today') {
    start = new Date(y, m, d);
  } else if (rangeKey === 'month') {
    start = new Date(y, m, 1);
  } else if (rangeKey === 'quarter') {
    const qStart = Math.floor(m / 3) * 3;
    start = new Date(y, qStart, 1);
  } else if (rangeKey === 'year') {
    start = new Date(y, 0, 1);
  } else {
    start = new Date(STATS_START_TIMESTAMP);
  }
  // 轉成 Asia/Taipei 的 timestamp (start 是 local browser timezone,需要對齊 TW)
  // 簡化:用 toLocaleString 來推算 offset
  const localOffset = tw.getTime() - now.getTime();
  const ts = start.getTime() - localOffset;
  // 不能早於 STATS_START_TIMESTAMP
  return Math.max(ts, STATS_START_TIMESTAMP);
};

export const RANGE_LABELS = {
  today: '當天',
  month: '當月',
  quarter: '當季',
  year: '當年',
  all: '最久 (2026-06-18 起)',
};

/**
 * 從歷史記錄聚合每位玩家的統計
 * @param {Array} historyRecords 歷史記錄陣列 (來自 getAllHistory)
 * @returns {Object} {
 *   players: { [name]: { totalGames, wins, winRate, handicapGiven, handicapReceived, avgHandicapGiven, avgHandicapReceived } },
 *   pairs: { [`name1|name2`]: { totalGames, name1Wins, name2Wins, name1AvgHandicapGiven, name2AvgHandicapGiven } }
 * }
 */
export const computeStats = (historyRecords, rangeStart = STATS_START_TIMESTAMP, rangeEnd = Infinity) => {
  const players = {};   // by name
  const pairs = {};     // by sorted pair key

  const ensurePlayer = (name) => {
    if (!players[name]) {
      players[name] = {
        name,
        totalGames: 0,
        wins: 0,
        handicapGiven: 0,
        handicapReceived: 0,
        handicapGivenCount: 0,
        handicapReceivedCount: 0,
        rankSum: 0,
        rankCount: 0,
        rankCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
      };
    }
    return players[name];
  };

  const ensurePair = (n1, n2) => {
    const key = [n1, n2].sort().join('|');
    if (!pairs[key]) {
      pairs[key] = {
        key,
        names: [n1, n2].sort(),
        totalGames: 0,
        winsByName: {},
        handicapGivenByName: {},
      };
    }
    return pairs[key];
  };

  // Filter by cutoff
  const filtered = historyRecords.filter(h =>
    h && h.gameEndTime && h.gameEndTime >= rangeStart && h.gameEndTime <= rangeEnd
  );

  filtered.forEach(record => {
    const playerNames = record.players || {};
    const matches = record.matches || [];

    // 每個完整 round 的排名計入「平均名次」
    [1, 2].forEach(r => {
      const start = (r - 1) * 18;
      const completeCount = matches.slice(start, start + 18).filter(m => m && m.winner).length;
      if (completeCount === 18) {
        const ranking = computeRoundRanking(matches, r, {}, true);
        ranking.ranking.forEach(item => {
          const name = playerNames[item.player] || item.player;
          const p = ensurePlayer(name);
          p.rankSum += item.rank;
          p.rankCount += 1;
          // 名次 1-4 分桶計次 (rank > 4 罕見;若有並列 rank 在 1-4 之內仍計入)
          if (item.rank >= 1 && item.rank <= 4) {
            p.rankCounts[item.rank] = (p.rankCounts[item.rank] || 0) + 1;
          }
        });
      }
    });

    matches.forEach(m => {
      if (!m || !m.winner) return;
      // 找 pair (p1Id, p2Id)
      let p1Id, p2Id;
      if (m.pair && m.pair.length === 2) {
        [p1Id, p2Id] = m.pair;
      } else {
        // 沒 pair → 跳過 (老資料)
        return;
      }

      const n1 = playerNames[p1Id] || p1Id;
      const n2 = playerNames[p2Id] || p2Id;
      const winnerName = playerNames[m.winner] || m.winner;

      ensurePlayer(n1).totalGames++;
      ensurePlayer(n2).totalGames++;
      ensurePlayer(winnerName).wins++;

      // handicap
      if (m.handicap && m.handicap.amount > 0) {
        const giverName = playerNames[m.handicap.giver] || m.handicap.giver;
        const receiverName = playerNames[m.handicap.receiver] || m.handicap.receiver;
        const amt = m.handicap.amount;
        const giverP = ensurePlayer(giverName);
        giverP.handicapGiven += amt;
        giverP.handicapGivenCount += 1;
        const receiverP = ensurePlayer(receiverName);
        receiverP.handicapReceived += amt;
        receiverP.handicapReceivedCount += 1;
      }

      // pair tracking
      const pair = ensurePair(n1, n2);
      pair.totalGames++;
      pair.winsByName[winnerName] = (pair.winsByName[winnerName] || 0) + 1;
      if (m.handicap && m.handicap.amount > 0) {
        const gn = playerNames[m.handicap.giver] || m.handicap.giver;
        pair.handicapGivenByName[gn] = (pair.handicapGivenByName[gn] || 0) + m.handicap.amount;
      }
    });
  });

  // 加 derived 指標
  Object.values(players).forEach(p => {
    p.winRate = p.totalGames > 0 ? p.wins / p.totalGames : 0;
    p.avgHandicapGiven = p.totalGames > 0 ? p.handicapGiven / p.totalGames : 0;
    p.avgHandicapReceived = p.totalGames > 0 ? p.handicapReceived / p.totalGames : 0;
    p.avgRank = p.rankCount > 0 ? p.rankSum / p.rankCount : null;
  });

  return {
    players,
    pairs,
    recordCount: filtered.length,
    rangeStart,
    rangeEnd,
    cutoffDate: new Date(rangeStart).toLocaleDateString('zh-TW'),
  };
};

/**
 * 列出所有場次 (供統計「指定場次」下拉用) — 依結束時間新到舊
 * @returns {Array<{id:string, gameEndTime:number, label:string}>}
 */
export const listSessions = (historyRecords) => {
  const pad = (n) => String(n).padStart(2, '0');
  return (historyRecords || [])
    .filter(h => h && h.gameEndTime)
    .slice()
    .sort((a, b) => b.gameEndTime - a.gameEndTime)
    .map(h => {
      const names = Object.values(h.players || {}).map(p => (p && p.name) || '').filter(Boolean);
      const d = new Date(h.gameEndTime);
      const dateStr = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const label = `${dateStr}${h.roomName ? ' · ' + h.roomName : ''}${names.length ? ' · ' + names.join('/') : ''}`;
      return { id: String(h.gameEndTime), gameEndTime: h.gameEndTime, label };
    });
};

/**
 * 取某玩家對其他人的對戰統計
 */
export const getPlayerOpponentStats = (stats, playerName) => {
  const result = [];
  Object.values(stats.pairs).forEach(pair => {
    if (!pair.names.includes(playerName)) return;
    const opponent = pair.names[0] === playerName ? pair.names[1] : pair.names[0];
    const myWins = pair.winsByName[playerName] || 0;
    const oppWins = pair.winsByName[opponent] || 0;
    result.push({
      opponent,
      games: pair.totalGames,
      wins: myWins,
      losses: oppWins,
      winRate: pair.totalGames > 0 ? myWins / pair.totalGames : 0,
      myAvgHandicapGiven: pair.totalGames > 0 ? (pair.handicapGivenByName[playerName] || 0) / pair.totalGames : 0,
      oppAvgHandicapGiven: pair.totalGames > 0 ? (pair.handicapGivenByName[opponent] || 0) / pair.totalGames : 0,
    });
  });
  return result.sort((a, b) => b.games - a.games);
};
