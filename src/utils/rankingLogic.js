// 排名 + 讓分 + tie-break 規則引擎
//
// 正確模型 (2026-06-18 二次修正):
// - 1 場 = 7 分制
// - 1 輪 = 6 場 (4 人全 pair 各打 1 次)
// - 1 round = 3 輪 = 18 場 (約 1 小時)
// - 共 2 round = 36 場 (約 2 小時)
// - **每 round 分數歸零獨立計算**,各自決定 1/2/3/4 名
// - 讓分:當下這 round 累積場勝差,領先方讓對手 N 分
//
// Tie-break:
// - Round 1 末 2 人同分: 用「Round 2 第一次交手」結果決定 (不是本 round)
// - Round 1 末 3 人同分: 用「Round 2 第 1 輪」這 3 人 H2H 決定
// - Round 2 末 2 人同分: 用「Round 2 第 3 輪」這兩人第一次交手結果決定
// - Round 2 末 3 人同分: 用「Round 2 第 3 輪」這 3 人 H2H 決定
// - H2H 勝場均等 → 比累積得分 (deuce 視 8:6)
// - 得分一致 → 被讓分多的輸
// - 還比不出來 → 猜拳

import { generateDynamicMatchOrder } from './gameLogic';

export const MATCHES_PER_SUBROUND = 6;
export const SUBROUNDS_PER_ROUND = 3;
export const MATCHES_PER_ROUND = MATCHES_PER_SUBROUND * SUBROUNDS_PER_ROUND; // 18
export const TOTAL_ROUNDS = 2;
export const TOTAL_MATCHES = MATCHES_PER_ROUND * TOTAL_ROUNDS; // 36

/** 某 round 內各人累積場勝 (該 round 範圍的 18 場) */
export const cumulativeWinsInRound = (matches, round) => {
  const scores = { A: 0, B: 0, C: 0, D: 0 };
  const start = (round - 1) * MATCHES_PER_ROUND;
  const end = start + MATCHES_PER_ROUND;
  for (let i = start; i < Math.min(end, matches.length); i++) {
    const m = matches[i];
    if (m && m.winner) scores[m.winner] = (scores[m.winner] || 0) + 1;
  }
  return scores;
};

/**
 * 計算到某 match index 為止 (不含該場) 在「當前 round」的累積場勝
 * 用於 UI 顯示「即將打的這場前,本 round 雙方累積戰績」+ 讓分
 */
export const cumulativeWinsUpToMatch = (matches, matchIndex) => {
  const round = Math.floor(matchIndex / MATCHES_PER_ROUND) + 1;
  const start = (round - 1) * MATCHES_PER_ROUND;
  const scores = { A: 0, B: 0, C: 0, D: 0 };
  for (let i = start; i < matchIndex && i < matches.length; i++) {
    const m = matches[i];
    if (m && m.winner) scores[m.winner] = (scores[m.winner] || 0) + 1;
  }
  return scores;
};

/** 讓分:領先方讓對手 N 分 */
export const calculateHandicap = (cumulativeScores, p1, p2) => {
  const s1 = cumulativeScores?.[p1] || 0;
  const s2 = cumulativeScores?.[p2] || 0;
  const diff = Math.abs(s1 - s2);
  if (diff === 0) return { giver: null, receiver: null, amount: 0 };
  if (s1 > s2) return { giver: p1, receiver: p2, amount: diff };
  return { giver: p2, receiver: p1, amount: diff };
};

/** 取某 round / 某 sub-round 的 match indexes */
export const subRoundMatchIndexes = (round, subRound) => {
  const base = (round - 1) * MATCHES_PER_ROUND + (subRound - 1) * MATCHES_PER_SUBROUND;
  return Array.from({ length: MATCHES_PER_SUBROUND }, (_, i) => base + i);
};

/** 取某場比賽的 pair。優先讀 match.pair,沒有就 fallback (用 perms 重建) */
export const getPairForMatch = (matches, matchIndex, perms = null) => {
  const m = matches[matchIndex];
  if (m && m.pair && m.pair.length === 2) return m.pair;
  const subroundStart = Math.floor(matchIndex / MATCHES_PER_SUBROUND) * MATCHES_PER_SUBROUND;
  const order = generateDynamicMatchOrder(matches, subroundStart, perms);
  return order[matchIndex - subroundStart] || null;
};

/** 指定玩家組之間在某 round (或全部) 的所有 H2H match indexes */
export const matchesBetweenPlayers = (matches, players, round = null) => {
  const set = new Set(players);
  const indexes = [];
  matches.forEach((m, i) => {
    if (!m || !m.winner) return;
    if (round !== null) {
      const matchRound = Math.floor(i / MATCHES_PER_ROUND) + 1;
      if (matchRound !== round) return;
    }
    const pair = getPairForMatch(matches, i);
    if (!pair) return;
    if (set.has(pair[0]) && set.has(pair[1])) indexes.push(i);
  });
  return indexes;
};

/** 被讓分總和 (在指定 indexes 範圍內) */
export const handicapReceivedAcross = (matches, indexes) => {
  const received = { A: 0, B: 0, C: 0, D: 0 };
  indexes.forEach(i => {
    const m = matches[i];
    if (m && m.handicap && m.handicap.receiver && m.handicap.amount) {
      received[m.handicap.receiver] = (received[m.handicap.receiver] || 0) + m.handicap.amount;
    }
  });
  return received;
};

/** 有效比分 (沒輸入當 7:0;deuce 視 8:6) */
export const effectiveScores = (match) => {
  if (!match) return { winner: 0, loser: 0 };
  const w = match.scores?.winner;
  const l = match.scores?.loser;
  if (typeof w !== 'number' || typeof l !== 'number') {
    return { winner: 7, loser: 0 };
  }
  if (w > 7) return { winner: 8, loser: 6 };
  return { winner: w, loser: l };
};

/** group by score (高到低) */
export const groupByScore = (scores) => {
  const buckets = {};
  Object.entries(scores).forEach(([player, sc]) => {
    if (!buckets[sc]) buckets[sc] = [];
    buckets[sc].push(player);
  });
  return Object.keys(buckets)
    .map(s => parseInt(s, 10))
    .sort((a, b) => b - a)
    .map(s => buckets[s]);
};

/**
 * tie-break 主邏輯
 *
 * @param {Array<string>} tiedPlayers 同分玩家
 * @param {Array} matches 全部比賽
 * @param {number} round 目前要結算的 round (1 or 2)
 * @param {boolean} hasBreakerData 是否有 tie-break 用的後續資料
 *   - round=1: 是否 Round 2 第 1 輪已打完 (match 24)
 *   - round=2: 永遠 true (最終結算)
 * @param {Object} rpsResults 猜拳結果
 */
export const resolveTie = (tiedPlayers, matches, round, hasBreakerData, rpsResults = {}) => {
  const audit = [];
  const needsRps = [];

  if (tiedPlayers.length === 1) {
    return { ordered: [...tiedPlayers], audit, needsRps };
  }

  // 2 人平手 → 看「下一段」H2H
  //   Round 1 末: Round 2 第一次交手
  //   Round 2 末: Round 2 第 3 輪 第一次交手
  if (tiedPlayers.length === 2) {
    const [p1, p2] = tiedPlayers;
    let h2hIndexes;
    let breakerName;
    if (round === 1) {
      h2hIndexes = matchesBetweenPlayers(matches, [p1, p2], 2);
      breakerName = 'Round 2';
    } else {
      const lastSub = new Set(subRoundMatchIndexes(2, 3));
      h2hIndexes = matchesBetweenPlayers(matches, [p1, p2]).filter(i => lastSub.has(i));
      breakerName = 'Round 2 第 3 輪';
    }
    if (h2hIndexes.length > 0) {
      const firstIdx = h2hIndexes[0];
      const winner = matches[firstIdx].winner;
      const loser = winner === p1 ? p2 : p1;
      audit.push(`2 人平手 (${p1} vs ${p2}): ${breakerName} 第一次 H2H 在第 ${firstIdx + 1} 場 → ${winner} 贏,${winner} 排前`);
      return { ordered: [winner, loser], audit, needsRps };
    }
    // 沒資料
    if (!hasBreakerData) {
      audit.push(`2 人平手 (${p1} vs ${p2}): 待 ${breakerName} 首次交手後決定`);
      return { ordered: tiedPlayers, audit, needsRps };
    }
    // 最終結算還沒打到 → 猜拳
    audit.push(`2 人平手但 ${breakerName} 無 H2H → 猜拳`);
    const key = [p1, p2].sort().join('-');
    needsRps.push({ key, players: [p1, p2] });
    const rpsW = rpsResults[key];
    if (rpsW) {
      const loser = rpsW === p1 ? p2 : p1;
      audit.push(`猜拳 ${rpsW} 贏`);
      return { ordered: [rpsW, loser], audit, needsRps: [] };
    }
    return { ordered: tiedPlayers, audit, needsRps };
  }

  // 3 人平手
  if (tiedPlayers.length === 3) {
    if (!hasBreakerData) {
      audit.push(`3 人平手 (${tiedPlayers.join(',')}): 排名待 ${round === 1 ? 'Round 2 第 1 輪' : 'Round 2 第 3 輪'} 後決定`);
      return { ordered: tiedPlayers, audit, needsRps };
    }

    // 取 H2H 範圍
    // Round 1 末 3 人平 → Round 2 第 1 輪 (subRound 1, matches 18-23) 之間的 H2H
    // Round 2 末 3 人平 → Round 2 第 3 輪 (subRound 3, matches 30-35) 之間的 H2H
    const targetIndexes = new Set(
      round === 1
        ? subRoundMatchIndexes(2, 1)
        : subRoundMatchIndexes(2, 3)
    );
    const h2hIndexes = matchesBetweenPlayers(matches, tiedPlayers).filter(i => targetIndexes.has(i));
    const breakerName = round === 1 ? 'Round 2 第 1 輪' : 'Round 2 第 3 輪';
    audit.push(`3 人 (${tiedPlayers.join(',')}) 用 ${breakerName} 共 ${h2hIndexes.length} 場 H2H 決定`);

    if (h2hIndexes.length === 0) {
      audit.push(`沒有 H2H 資料,需要猜拳`);
      const key = tiedPlayers.slice().sort().join('-');
      needsRps.push({ key, players: tiedPlayers });
      return { ordered: tiedPlayers, audit, needsRps };
    }

    // wins
    const wins = {};
    tiedPlayers.forEach(p => { wins[p] = 0; });
    h2hIndexes.forEach(i => {
      const w = matches[i]?.winner;
      if (w && wins[w] !== undefined) wins[w]++;
    });
    audit.push(`H2H 勝場: ${tiedPlayers.map(p => `${p}=${wins[p]}`).join(' ')}`);

    const winValues = Object.values(wins);
    const allEqual = winValues.every(v => v === winValues[0]);

    if (allEqual) {
      // 比累積得分 (deuce 視 8:6)
      const pts = {};
      tiedPlayers.forEach(p => { pts[p] = 0; });
      h2hIndexes.forEach(i => {
        const m = matches[i];
        if (!m) return;
        const pair = getPairForMatch(matches, i);
        if (!pair) return;
        const sc = effectiveScores(m);
        if (m.winner === pair[0]) { pts[pair[0]] += sc.winner; pts[pair[1]] += sc.loser; }
        else if (m.winner === pair[1]) { pts[pair[1]] += sc.winner; pts[pair[0]] += sc.loser; }
      });
      audit.push(`勝場均等,比得分 (deuce 視 8:6): ${tiedPlayers.map(p => `${p}=${pts[p]}`).join(' ')}`);

      const grouped = groupByScore(pts);
      const ordered = [];
      grouped.forEach(g => {
        if (g.length === 1) { ordered.push(g[0]); return; }
        const handicapRecv = handicapReceivedAcross(matches, h2hIndexes);
        audit.push(`得分一致 (${g.join(',')}),比被讓分: ${g.map(p => `${p}=${handicapRecv[p]}`).join(' ')},被讓多的輸`);
        const hpGroups = groupByScore(Object.fromEntries(g.map(p => [p, -handicapRecv[p]])));
        hpGroups.forEach(hg => {
          if (hg.length === 1) ordered.push(hg[0]);
          else {
            audit.push(`還是平 (${hg.join(',')}) → 猜拳`);
            const key = hg.slice().sort().join('-');
            needsRps.push({ key, players: hg });
            const rpsW = rpsResults[key];
            if (rpsW && hg.includes(rpsW)) {
              ordered.push(rpsW);
              hg.filter(p => p !== rpsW).forEach(p => ordered.push(p));
            } else {
              hg.forEach(p => ordered.push(p));
            }
          }
        });
      });
      return { ordered, audit, needsRps };
    }

    // 勝場不均等 → 直接按勝場排,同勝場再遞迴
    const grouped = groupByScore(wins);
    const ordered = [];
    grouped.forEach(g => {
      if (g.length === 1) ordered.push(g[0]);
      else {
        const sub = resolveTie(g, matches, round, hasBreakerData, rpsResults);
        sub.ordered.forEach(p => ordered.push(p));
        sub.audit.forEach(a => audit.push('  ↳ ' + a));
        sub.needsRps.forEach(r => needsRps.push(r));
      }
    });
    return { ordered, audit, needsRps };
  }

  // 4 人都平 (罕見)
  audit.push('4 人都平,未實作專屬流程');
  return { ordered: [...tiedPlayers], audit, needsRps };
};

/**
 * 計算某 round 的排名 (含 tie-break)
 * @param {number} round 1 or 2
 * @param {boolean} hasBreakerData 是否已有 tie-break 用的後續輪 H2H 資料
 */
export const computeRoundRanking = (matches, round, rpsResults = {}, hasBreakerData = false) => {
  const scores = cumulativeWinsInRound(matches, round);
  const grouped = groupByScore(scores);
  const audit = [];
  const allRps = [];
  let unresolved = false;
  const ranking = [];
  let currentRank = 1;

  grouped.forEach(group => {
    if (group.length === 1) {
      ranking.push({ rank: currentRank, player: group[0], score: scores[group[0]], tied: false });
      currentRank++;
      return;
    }
    const tie = resolveTie(group, matches, round, hasBreakerData, rpsResults);
    audit.push(...tie.audit);
    allRps.push(...tie.needsRps);
    if (tie.needsRps.length > 0) unresolved = true;

    // 若還沒 breaker data 且 needsRps 為空 (= 結算還不能完成) → 標記為並列
    const isUnresolvedTie = !hasBreakerData && tie.audit.some(a => a.includes('待'));
    tie.ordered.forEach((p, i) => {
      ranking.push({
        rank: currentRank + (isUnresolvedTie ? 0 : i),
        player: p,
        score: scores[p],
        tied: isUnresolvedTie,
      });
    });
    currentRank += group.length;
  });

  return { ranking, audit, needsRps: allRps, hasUnresolvedTie: unresolved, scores };
};

/**
 * 此場是否需要收集比分 (UI 用) — 模擬剩餘對局所有可能結果,
 * 只有「真的可能會用到此場比分」才收集。
 *
 * 條件:
 * - Round 1: 永遠不需要
 * - Round 2: 模擬所有剩餘對局,若存在一種結局是:
 *   (a) Round 2 末 3 人同分,且此場介於那 3 人之間 (供 R2 末 tie-break) → 需要
 *   (b) Round 1 末有 3 人同分,且此場屬 R2 第 1 輪那 3 人 H2H,
 *       且該 3 場結果可能讓 3 人各 1 勝 (deuce 比較情境) → 需要
 *   否則 → 不需要
 */
export const shouldCollectScore = (matchIndex, matches) => {
  const round = Math.floor(matchIndex / MATCHES_PER_ROUND) + 1;
  if (round !== 2) return false;

  const matchInRound = matchIndex - MATCHES_PER_ROUND;
  const subRound = Math.floor(matchInRound / MATCHES_PER_SUBROUND) + 1;
  if (subRound === 2) return false; // 第 2 輪 永遠用不到

  const currentPair = getPairForMatch(matches, matchIndex);
  if (!currentPair) return false;

  // Round 1 是否 3 人同分 (供 第 1 輪 判斷)
  let r1Tied3 = null;
  if (subRound === 1) {
    const r1 = cumulativeWinsInRound(matches, 1);
    const groups = groupByScore(r1);
    const g3 = groups.find(g => g.length >= 3);
    if (!g3) return false; // 第 1 輪 但 round 1 沒 3 人同分 → 不需要
    r1Tied3 = g3;
    // 此場是不是 那 3 人之間
    const set = new Set(r1Tied3);
    if (!(set.has(currentPair[0]) && set.has(currentPair[1]))) return false;
  }

  // 第 3 輪:還要進一步看「此場有沒有可能介於 R2 末 3 人 tied 之中」
  // 收集剩餘 (含當前) 未完成的 round 2 matches
  const endR2 = 2 * MATCHES_PER_ROUND;
  const remaining = [];
  for (let i = matchIndex; i < endR2; i++) {
    if (!matches[i] || !matches[i].winner) remaining.push(i);
  }
  if (remaining.length === 0) return false;
  const remainingPairs = remaining.map(i => getPairForMatch(matches, i));
  if (remainingPairs.some(p => !p)) return true; // 沒辦法判斷就收集

  // 限制爆炸 (理論最多 18 場,2^18 = 262144 還可接受;> 18 保守 return true)
  if (remaining.length > 20) return true;

  const baseR2Scores = cumulativeWinsUpToMatch(matches, matchIndex);

  // For 第 1 輪 case: 計算這 3 人的 H2H 範圍 (在 sub-round 1)
  const sub1Set = new Set(subRoundMatchIndexes(2, 1));

  const totalCombos = 1 << remaining.length;
  for (let combo = 0; combo < totalCombos; combo++) {
    // 模擬最終 round 2 分數
    const finalScores = { ...baseR2Scores };
    for (let j = 0; j < remaining.length; j++) {
      const winnerIdx = (combo >> j) & 1;
      const w = remainingPairs[j][winnerIdx];
      finalScores[w] = (finalScores[w] || 0) + 1;
    }

    if (subRound === 3) {
      // 是否 round 2 末 3 人同分? 此場是否介於那 3 人
      const groups = groupByScore(finalScores);
      const threeWay = groups.find(g => g.length >= 3);
      if (threeWay) {
        const set = new Set(threeWay);
        if (set.has(currentPair[0]) && set.has(currentPair[1])) {
          return true;
        }
      }
    }

    if (subRound === 1 && r1Tied3) {
      // 看 R2 第 1 輪那 3 人 H2H 在此 combo 下的勝場分布,有沒有可能各 1 勝
      const set = new Set(r1Tied3);
      const wins = {};
      r1Tied3.forEach(p => { wins[p] = 0; });
      sub1Set.forEach(idx => {
        // 取勝者:已下的用紀錄;未下的依 combo
        let winner;
        let pair;
        if (matches[idx] && matches[idx].winner) {
          winner = matches[idx].winner;
          pair = getPairForMatch(matches, idx);
        } else {
          const remIdx = remaining.indexOf(idx);
          if (remIdx === -1) return;
          pair = remainingPairs[remIdx];
          const wi = (combo >> remIdx) & 1;
          winner = pair[wi];
        }
        if (!pair) return;
        if (set.has(pair[0]) && set.has(pair[1])) {
          wins[winner] = (wins[winner] || 0) + 1;
        }
      });
      const vals = Object.values(wins);
      if (vals.length === 3 && vals.every(v => v === vals[0])) {
        // 3 人各贏相同數 (極端可能各 1 勝) → 需要 deuce 比較 → 收集比分
        return true;
      }
    }
  }

  return false;
};
