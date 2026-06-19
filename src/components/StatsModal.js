// 歷史統計 modal — 顯示玩家勝率、平均讓分、對戰勝率
import React, { useState, useEffect, useMemo } from 'react';
import { getAllHistory } from '../services/database';
import { computeStats, getPlayerOpponentStats, getRangeStart, RANGE_LABELS } from '../utils/statsLogic';

const StatsModal = ({ onClose }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [range, setRange] = useState('today');

  useEffect(() => {
    let mounted = true;
    getAllHistory().then(h => {
      if (mounted) {
        setHistory(h || []);
        setLoading(false);
      }
    }).catch(e => {
      console.error('load history err', e);
      if (mounted) {
        setHistory([]);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => {
    if (!history) return null;
    const start = getRangeStart(range);
    return computeStats(history, start);
  }, [history, range]);
  const sortedPlayers = useMemo(() => {
    if (!stats) return [];
    return Object.values(stats.players).sort((a, b) => b.totalGames - a.totalGames);
  }, [stats]);

  const opponentStats = useMemo(() => {
    if (!stats || !selectedPlayer) return [];
    return getPlayerOpponentStats(stats, selectedPlayer);
  }, [stats, selectedPlayer]);

  const fmtRate = (r) => `${(r * 100).toFixed(1)}%`;
  const fmtNum = (n) => n.toFixed(2);

  return (
    <div className="modal-overlay">
      <div className="modal-content stats-modal">
        <div className="modal-header">
          <h2>📊 歷史統計</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading && <p>載入中...</p>}
          {!loading && stats && (
            <>
              <div className="range-tabs">
                {Object.entries(RANGE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    className={`range-btn ${range === key ? 'active' : ''}`}
                    onClick={() => setRange(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="info-note">
                統計區間: <b>{RANGE_LABELS[range]}</b> 起算 <b>{stats.cutoffDate}</b> (共 {stats.recordCount} 場比賽記錄)。
                之前的歷史不納入。
              </div>

              {sortedPlayers.length === 0 && (
                <p>還沒有可統計的資料。打完一局並按「確認結束比賽」就會累積。</p>
              )}

              {sortedPlayers.length > 0 && (
                <>
                  <section className="sect">
                    <h4>玩家總覽</h4>
                    <div className="stats-scroll">
                      <table className="stats-table">
                        <thead>
                          <tr>
                            <th>玩家</th>
                            <th>場數</th>
                            <th>勝</th>
                            <th>勝率</th>
                            <th>平均名次<br/><small>(完整 round)</small></th>
                            <th>名次分布<br/><small>#1/#2/#3/#4</small></th>
                            <th>平均讓</th>
                            <th>平均被讓</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedPlayers.map(p => (
                            <tr key={p.name} className={selectedPlayer === p.name ? 'selected' : ''}>
                              <td><b>{p.name}</b></td>
                              <td>{p.totalGames}</td>
                              <td>{p.wins}</td>
                              <td>{fmtRate(p.winRate)}</td>
                              <td>
                                {p.avgRank != null
                                  ? <>{p.avgRank.toFixed(2)} <small>({p.rankCount}次)</small></>
                                  : <small>—</small>}
                              </td>
                              <td>
                                {p.rankCounts[1] || 0} / {p.rankCounts[2] || 0} / {p.rankCounts[3] || 0} / {p.rankCounts[4] || 0}
                              </td>
                              <td>{fmtNum(p.avgHandicapGiven)}</td>
                              <td>{fmtNum(p.avgHandicapReceived)}</td>
                              <td>
                                <button className="rps-btn" onClick={() => setSelectedPlayer(p.name)}>
                                  看對戰
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {selectedPlayer && (
                    <section className="sect">
                      <h4>🥊 {selectedPlayer} 對戰統計</h4>
                      {opponentStats.length === 0 ? (
                        <p>沒有對戰資料</p>
                      ) : (
                        <div className="stats-scroll">
                          <table className="stats-table">
                            <thead>
                              <tr>
                                <th>對手</th>
                                <th>場數</th>
                                <th>勝 / 負</th>
                                <th>勝率</th>
                                <th>{selectedPlayer} 平均讓</th>
                                <th>對手平均讓</th>
                              </tr>
                            </thead>
                            <tbody>
                              {opponentStats.map(o => (
                                <tr key={o.opponent}>
                                  <td><b>{o.opponent}</b></td>
                                  <td>{o.games}</td>
                                  <td>{o.wins} / {o.losses}</td>
                                  <td>{fmtRate(o.winRate)}</td>
                                  <td>{fmtNum(o.myAvgHandicapGiven)}</td>
                                  <td>{fmtNum(o.oppAvgHandicapGiven)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="primary-btn" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
