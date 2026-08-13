// 歷史統計 modal — 顯示玩家勝率、平均讓分、對戰勝率
import React, { useState, useEffect, useMemo } from 'react';
import { getAllHistory } from '../services/database';
import { computeStats, getPlayerOpponentStats, getRangeStart, RANGE_LABELS, listSessions, STATS_START_TIMESTAMP } from '../utils/statsLogic';

const pad2 = (n) => String(n).padStart(2, '0');
// timestamp -> <input type="datetime-local"> 的值 (本地時區)
const toLocalInput = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const fmtTs = (ts) => {
  if (!isFinite(ts)) return '現在';
  const d = new Date(ts);
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const StatsModal = ({ onClose }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [range, setRange] = useState('today');   // 預設 key | 'custom' | 'session'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sessionId, setSessionId] = useState('');

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

  const sessions = useMemo(() => listSessions(history || []), [history]);

  const stats = useMemo(() => {
    if (!history) return null;
    if (range === 'custom') {
      const s = customFrom ? new Date(customFrom).getTime() : STATS_START_TIMESTAMP;
      const e = customTo ? new Date(customTo).getTime() : Infinity;
      return computeStats(history, s, e);
    }
    if (range === 'session') {
      if (!sessionId) return computeStats([], 0, 0);
      const rec = history.find(h => String(h.gameEndTime) === sessionId);
      return computeStats(rec ? [rec] : [], 0, Infinity);
    }
    return computeStats(history, getRangeStart(range));
  }, [history, range, customFrom, customTo, sessionId]);

  // 切到「自訂區間」時給預設值 (今天 00:00 ~ 現在)
  const enterCustom = () => {
    if (!customFrom || !customTo) {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setCustomFrom(toLocalInput(dayStart.getTime()));
      setCustomTo(toLocalInput(now.getTime()));
    }
    setRange('custom');
  };
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
                <button
                  className={`range-btn ${range === 'custom' ? 'active' : ''}`}
                  onClick={enterCustom}
                >
                  自訂區間
                </button>
                <button
                  className={`range-btn ${range === 'session' ? 'active' : ''}`}
                  onClick={() => setRange('session')}
                >
                  指定場次
                </button>
              </div>

              {range === 'custom' && (
                <div className="custom-range" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', margin: '10px 0' }}>
                  <label>從&nbsp;
                    <input type="datetime-local" value={customFrom} max={customTo || undefined}
                      onChange={e => setCustomFrom(e.target.value)} />
                  </label>
                  <label>到&nbsp;
                    <input type="datetime-local" value={customTo} min={customFrom || undefined}
                      onChange={e => setCustomTo(e.target.value)} />
                  </label>
                </div>
              )}

              {range === 'session' && (
                <div className="session-pick" style={{ margin: '10px 0' }}>
                  <select value={sessionId} onChange={e => setSessionId(e.target.value)}
                    style={{ width: '100%', maxWidth: '520px', padding: '6px 8px' }}>
                    <option value="">— 選一個場次 (共 {sessions.length} 場) —</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="info-note">
                {range === 'custom' ? (
                  <>統計區間: <b>自訂</b> {fmtTs(customFrom ? new Date(customFrom).getTime() : STATS_START_TIMESTAMP)} ~ {fmtTs(customTo ? new Date(customTo).getTime() : Infinity)} (共 {stats.recordCount} 場比賽記錄)。</>
                ) : range === 'session' ? (
                  sessionId
                    ? <>指定場次: <b>{sessions.find(s => s.id === sessionId)?.label}</b> (共 {stats.recordCount} 場比賽記錄)。</>
                    : <>請從上方下拉選單挑一個場次。</>
                ) : (
                  <>統計區間: <b>{RANGE_LABELS[range]}</b> 起算 <b>{stats.cutoffDate}</b> (共 {stats.recordCount} 場比賽記錄)。之前的歷史不納入。</>
                )}
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
