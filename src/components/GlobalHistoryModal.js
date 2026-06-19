// Global history modal component to display all game history
import React, { useState, useEffect } from 'react';
import { getAllHistory } from '../services/database';
import { computeRoundRanking } from '../utils/rankingLogic';

const GlobalHistoryModal = ({ onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyData = await getAllHistory();
        setHistory(historyData);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameDuration = (startTime, endTime) => {
    const duration = Math.round((endTime - startTime) / 1000 / 60);
    return `${duration} 分鐘`;
  };

  const getWinner = (finalScores) => {
    const scores = Object.entries(finalScores).sort((a, b) => b[1] - a[1]);
    return scores[0];
  };

  const getMatchResults = (historyItem) => {
    if (!historyItem || !historyItem.matches) return [];
    
    return historyItem.matches
      .map((match, index) => {
        if (!match || !match.winner) return null;
        
        return {
          index,
          round: Math.floor(index / 6) + 1,
          matchInRound: (index % 6) + 1,
          winner: match.winner,
          timestamp: match.timestamp
        };
      })
      .filter(match => match !== null);
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content history-modal">
          <div className="loading">載入歷史記錄中...</div>
        </div>
      </div>
    );
  }

  if (selectedHistory) {
    const matches = getMatchResults(selectedHistory);
    const [winnerPlayer, winnerScore] = getWinner(selectedHistory.finalScores);
    const winnerName = selectedHistory.players[winnerPlayer];

    return (
      <div className="modal-overlay">
        <div className="modal-content history-modal">
          <div className="modal-header">
            <h2>比賽詳情 - {selectedHistory.roomName}</h2>
            <button className="close-btn" onClick={() => setSelectedHistory(null)}>←</button>
          </div>
          
          <div className="modal-body">
            <div className="history-overview">
              <div className="game-info">
                <div className="info-row">
                  <span className="label">比賽時間:</span>
                  <span className="value">{formatDate(selectedHistory.gameStartTime)} - {formatDate(selectedHistory.gameEndTime)}</span>
                </div>
                <div className="info-row">
                  <span className="label">比賽時長:</span>
                  <span className="value">{getGameDuration(selectedHistory.gameStartTime, selectedHistory.gameEndTime)}</span>
                </div>
                <div className="info-row">
                  <span className="label">獲勝者:</span>
                  <span className="value">{winnerName} ({winnerPlayer}) - {winnerScore} 分</span>
                </div>
                <div className="info-row">
                  <span className="label">總比賽數:</span>
                  <span className="value">{matches.length} 場</span>
                </div>
              </div>

              {(() => {
                const mm = selectedHistory.matches || [];
                const r1 = computeRoundRanking(mm, 1, {}, true);
                const r2 = computeRoundRanking(mm, 2, {}, true);
                const r1Has = mm.slice(0, 18).some(m => m && m.winner);
                const r2Has = mm.slice(18, 36).some(m => m && m.winner);
                const renderRR = (label, data) => (
                  <div className="final-ranking" style={{ marginTop: 12 }}>
                    <h3>{label}</h3>
                    <div className="ranking-list">
                      {data.ranking.map((r) => (
                        <div key={r.player} className={`ranking-item ${r.rank === 1 ? 'winner' : ''}`}>
                          <div className="rank">
                            {r.rank === 1 && <span className="crown">👑</span>}
                            #{r.rank}{r.tied ? '(並列)' : ''}
                          </div>
                          <div className="player-info">
                            <div className="player-name">{selectedHistory.players[r.player] || r.player}</div>
                          </div>
                          <div className="score">{r.score} 勝</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
                return (
                  <>
                    {r1Has && renderRR('🥇 Round 1 排名', r1)}
                    {r2Has && renderRR('🥇 Round 2 排名', r2)}
                    <div className="final-ranking" style={{ marginTop: 12 }}>
                      <h3>📊 當天總計</h3>
                      <div className="ranking-list">
                        {Object.entries(selectedHistory.finalScores)
                          .sort(([,a], [,b]) => b - a)
                          .map(([player, score], index) => (
                          <div key={player} className="ranking-item">
                            <div className="rank">#{index + 1}</div>
                            <div className="player-info">
                              <div className="player-name">{selectedHistory.players[player]}</div>
                            </div>
                            <div className="score">{score} 勝</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="match-history">
                <h3>比賽記錄</h3>
                <div className="matches-list">
                  {matches.map((match) => (
                    <div key={match.index} className="match-record">
                      <div className="match-info">
                        <span className="match-number">第{match.round}輪 - 比賽{match.matchInRound}</span>
                        <span className="match-time">{formatDate(match.timestamp)}</span>
                      </div>
                      <div className="match-result">
                        勝利者: {selectedHistory.players[match.winner]} ({match.winner})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setSelectedHistory(null)}>
              返回列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content history-modal">
        <div className="modal-header">
          <h2>歷史記錄</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {history.length === 0 ? (
            <div className="no-history">
              <p>還沒有歷史記錄</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => {
                const [winnerPlayer, winnerScore] = getWinner(item.finalScores);
                const winnerName = item.players[winnerPlayer];
                const matchCount = getMatchResults(item).length;
                
                return (
                  <div 
                    key={item.id} 
                    className="history-item"
                    onClick={() => setSelectedHistory(item)}
                  >
                    <div className="history-header">
                      <h4>{item.roomName}</h4>
                      <span className="history-date">{formatDate(item.gameEndTime)}</span>
                    </div>
                    <div className="history-details">
                      <div className="winner-info">
                        🏆 {winnerName} ({winnerPlayer}) - {winnerScore} 分
                      </div>
                      <div className="match-count">
                        📊 共 {matchCount} 場比賽 • {getGameDuration(item.gameStartTime, item.gameEndTime)}
                      </div>
                      <div className="players-list">
                        👥 {Object.values(item.players).join(', ')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalHistoryModal;