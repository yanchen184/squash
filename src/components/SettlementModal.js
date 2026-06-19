// Round 結算窗 — 顯示該 round 的排名、tie-break、審計資料
import React, { useState, useMemo } from 'react';
import {
  computeRoundRanking,
  handicapReceivedAcross,
  matchesBetweenPlayers,
  subRoundMatchIndexes,
  effectiveScores,
  getPairForMatch,
  groupByScore,
  cumulativeWinsInRound,
  MATCHES_PER_ROUND,
} from '../utils/rankingLogic';

const SettlementModal = ({ matches, playerNames, round, hasBreakerData, isFinal, isLastInQueue = true, onClose, onNext }) => {
  const [rpsResults, setRpsResults] = useState({});

  const { ranking, audit, needsRps, hasUnresolvedTie, scores } = useMemo(
    () => computeRoundRanking(matches, round, rpsResults, hasBreakerData),
    [matches, round, rpsResults, hasBreakerData]
  );

  const nameOf = (p) => playerNames?.[p] || p;
  const players = ['A', 'B', 'C', 'D'];

  // 該 round 各人被讓分總和
  const handicapTotals = useMemo(() => {
    const start = (round - 1) * MATCHES_PER_ROUND;
    const allIdx = Array.from({ length: MATCHES_PER_ROUND }, (_, i) => start + i);
    return handicapReceivedAcross(matches, allIdx);
  }, [matches, round]);

  // 找出 tie-break 用到的 H2H matches 細節
  const tieBreakDetails = useMemo(() => {
    const r1 = cumulativeWinsInRound(matches, round);
    const groups = groupByScore(r1);
    const result = [];
    groups.forEach(g => {
      if (g.length < 2) return;
      let h2hIndexes;
      let label;
      if (g.length === 2) {
        if (round === 1) {
          h2hIndexes = matchesBetweenPlayers(matches, g, 2);
          label = `${g.map(p => playerNames?.[p] || p).join(' vs ')} (Round 2 H2H 第一次)`;
          h2hIndexes = h2hIndexes.slice(0, 1);
        } else {
          const lastSub = new Set(subRoundMatchIndexes(2, 3));
          h2hIndexes = matchesBetweenPlayers(matches, g).filter(i => lastSub.has(i)).slice(0, 1);
          label = `${g.map(p => playerNames?.[p] || p).join(' vs ')} (Round 2 第 3 輪 H2H)`;
        }
      } else if (g.length === 3) {
        const target = new Set(
          round === 1 ? subRoundMatchIndexes(2, 1) : subRoundMatchIndexes(2, 3)
        );
        h2hIndexes = matchesBetweenPlayers(matches, g).filter(i => target.has(i));
        label = `${g.map(p => playerNames?.[p] || p).join(' / ')} (${round === 1 ? 'Round 2 第 1 輪' : 'Round 2 第 3 輪'} 3 人 H2H)`;
      } else {
        return;
      }
      if (h2hIndexes.length === 0) return;
      const matchDetails = h2hIndexes.map(idx => {
        const m = matches[idx];
        if (!m) return null;
        const pair = getPairForMatch(matches, idx);
        const sc = effectiveScores(m);
        const winnerName = playerNames?.[m.winner] || m.winner;
        const loser = pair ? (pair[0] === m.winner ? pair[1] : pair[0]) : null;
        const loserName = loser ? (playerNames?.[loser] || loser) : '?';
        const hc = m.handicap;
        return { idx, winnerName, loserName, sc, hc, pair };
      }).filter(Boolean);
      result.push({ tied: g, label, matchDetails });
    });
    return result;
  }, [matches, round, playerNames]);

  const handleRps = (key, winner) => {
    setRpsResults(prev => ({ ...prev, [key]: winner }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content settlement-modal">
        <div className="modal-header">
          <h2>
            {round === 1 && isFinal && '📋 Round 1 最終排名'}
            {round === 1 && !isFinal && hasBreakerData && '📋 Round 1 排名 (含 tie-break)'}
            {round === 1 && !isFinal && !hasBreakerData && '📋 Round 1 結算'}
            {round === 2 && '🏁 Round 2 最終結算'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="info-note">
            {round === 1 && !hasBreakerData && '本 round 結算。3 人同分留待 Round 2 第 1 輪後決定。'}
            {round === 1 && hasBreakerData && 'Round 2 第 1 輪已打完,Round 1 排名最終確定。'}
            {round === 2 && '套用 tie-break 規則決定 Round 2 最終 1/2/3/4 名 (場地費由各位自行討論)。'}
          </div>

          {/* 累積場勝 (本 round 內) */}
          <section className="sect">
            <h4>📊 Round {round} 場勝</h4>
            <div className="score-row">
              {players.map(p => (
                <div key={p} className="score-card">
                  <div className="score-name">{nameOf(p)}</div>
                  <div className="score-val">{scores[p]} 勝</div>
                  {handicapTotals[p] > 0 && (
                    <div className="score-meta">本 round 被讓 {handicapTotals[p]} 分</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 排名 */}
          <section className="sect">
            <h4>🏆 排名</h4>
            <div className="ranking-list">
              {ranking.map((r) => (
                <div key={r.player} className={`rank-item rank-${r.rank}`}>
                  <span className="rank-num">#{r.rank}{r.tied ? ' (並列)' : ''}</span>
                  <span className="rank-name">{nameOf(r.player)}</span>
                  <span className="rank-score">{r.score} 勝</span>
                </div>
              ))}
            </div>
            {hasUnresolvedTie && (
              <div className="warning-banner">
                ⚠️ 還有平手未解 (完成下方猜拳輸入)
              </div>
            )}
          </section>

          {/* 猜拳輸入 */}
          {needsRps.length > 0 && (
            <section className="sect">
              <h4>✊ 需要猜拳</h4>
              {needsRps.map(req => (
                <div key={req.key} className="rps-row">
                  <span>{req.players.map(nameOf).join(' vs ')}:</span>
                  {req.players.map(p => (
                    <button
                      key={p}
                      className={`rps-btn ${rpsResults[req.key] === p ? 'selected' : ''}`}
                      onClick={() => handleRps(req.key, p)}
                    >
                      {nameOf(p)} 贏
                    </button>
                  ))}
                </div>
              ))}
            </section>
          )}

          {/* H2H 明細 (tie-break 用到的場次,逐場列出比分+讓分) */}
          {tieBreakDetails.length > 0 && (
            <section className="sect">
              <h4>📑 H2H 明細 (tie-break 依據)</h4>
              {tieBreakDetails.map((tb, ti) => (
                <div key={ti} className="h2h-block">
                  <div className="h2h-title">{tb.label}</div>
                  <table className="h2h-table">
                    <thead>
                      <tr>
                        <th>場次</th>
                        <th>對局</th>
                        <th>勝者</th>
                        <th>比分 (含 deuce 規則)</th>
                        <th>讓分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tb.matchDetails.map((d, di) => (
                        <tr key={di}>
                          <td>第 {d.idx + 1} 場</td>
                          <td>{d.pair ? d.pair.map(p => playerNames?.[p] || p).join(' vs ') : '?'}</td>
                          <td><b>{d.winnerName}</b></td>
                          <td>{d.sc.winner} : {d.sc.loser}</td>
                          <td>{d.hc?.amount > 0 ? `${playerNames?.[d.hc.giver] || d.hc.giver} 讓 ${playerNames?.[d.hc.receiver] || d.hc.receiver} ${d.hc.amount} 分` : '無'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          )}

          {/* 審計 (邏輯文字流) */}
          {audit.length > 0 && (
            <section className="sect">
              <h4>🔍 Tie-break 邏輯 (查核用)</h4>
              <ul className="audit-list">
                {audit.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </section>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>關閉</button>
          {/* Round 1 中途 (尚未 final) */}
          {round === 1 && !isFinal && (
            <button className="primary-btn" onClick={onNext}>
              {hasBreakerData ? '知道了' : '繼續打 Round 2'}
            </button>
          )}
          {/* 最終 settlement (round 1 final 或 round 2 final) */}
          {isFinal && (
            <button
              className="primary-btn"
              onClick={onNext}
              disabled={hasUnresolvedTie}
              title={hasUnresolvedTie ? '請先完成猜拳' : ''}
            >
              {isLastInQueue ? '確認結束比賽' : '下一頁 (Round 2 結算)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettlementModal;
