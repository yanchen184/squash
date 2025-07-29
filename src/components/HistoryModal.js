// History modal component to display game history
import React, { useState, useEffect } from 'react';
import { getGameHistory } from '../services/database';

const HistoryModal = ({ roomCode, onClose }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyData = await getGameHistory(roomCode);
        setHistory(historyData);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [roomCode]);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameDuration = () => {
    if (!history) return '';
    const duration = Math.round((history.gameEndTime - history.gameStartTime) / 1000 / 60);
    return `${duration} 分鐘`;
  };

  const getMatchResults = () => {
    if (!history || !history.matches) return [];
    
    return history.matches
      .map((match, index) => {
        if (!match || !match.winner) return null;
        
        const round = Math.floor(index / 6) + 1;
        const matchInRound = (index % 6) + 1;
        
        // 簡化的對戰組合邏輯，基於固定規則
        let currentMatch;
        if (matchInRound === 1) {
          currentMatch = ['A', 'B'];
        } else if (matchInRound === 2) {
          currentMatch = ['C', 'D'];
        } else {
          // 對於歷史記錄，使用傳統固定順序
          const traditional = [
            ['A', 'B'], ['C', 'D'], ['C', 'A'], ['B', 'D'], ['B', 'C'], ['A', 'D']
          ];
          currentMatch = traditional[(index % 6)] || ['A', 'B'];
        }
        
        return {
          index,
          round,
          matchInRound,
          player1: currentMatch[0],
          player2: currentMatch[1],
          winner: match.winner,
          timestamp: match.timestamp
        };
      })
      .filter(match => match !== null);
  };

  const getFinalRanking = () => {
    if (!history) return [];
    
    return Object.entries(history.finalScores)
      .map(([player, score]) => ({
        player,
        name: history.players[player],
        score
      }))
      .sort((a, b) => b.score - a.score);
  };

  const getPlayerStats = () => {
    if (!history) return {};
    
    const matches = getMatchResults();
    const stats = {};
    
    // Initialize stats for all players
    Object.keys(history.players).forEach(player => {
      stats[player] = {
        name: history.players[player],
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        opponents: {}
      };
    });
    
    // Calculate stats from matches
    matches.forEach(match => {
      const { player1, player2, winner } = match;
      const loser = winner === player1 ? player2 : player1;
      
      // Update match counts
      stats[player1].totalMatches++;
      stats[player2].totalMatches++;
      
      // Update wins/losses
      stats[winner].wins++;
      stats[loser].losses++;
      
      // Update head-to-head records
      if (!stats[player1].opponents[player2]) {
        stats[player1].opponents[player2] = { wins: 0, losses: 0 };
      }
      if (!stats[player2].opponents[player1]) {
        stats[player2].opponents[player1] = { wins: 0, losses: 0 };
      }
      
      if (winner === player1) {
        stats[player1].opponents[player2].wins++;
        stats[player2].opponents[player1].losses++;
      } else {
        stats[player2].opponents[player1].wins++;
        stats[player1].opponents[player2].losses++;
      }
    });
    
    // Calculate win rates
    Object.keys(stats).forEach(player => {
      const { wins, totalMatches } = stats[player];
      stats[player].winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;
    });
    
    return stats;
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

  if (!history) {
    return (
      <div className="modal-overlay">
        <div className="modal-content history-modal">
          <div className="modal-header">
            <h2>歷史記錄</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="no-history">
              <p>此房間沒有歷史記錄</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const matchResults = getMatchResults();
  const finalRanking = getFinalRanking();
  const playerStats = getPlayerStats();

  return (
    <div className="modal-overlay">
      <div className="modal-content history-modal">
        <div className="modal-header">
          <h2>歷史記錄 - {history.roomName}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="history-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            總覽
          </button>
          <button 
            className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            比賽記錄
          </button>
          <button 
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            統計數據
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'overview' && (
            <div className="history-overview">
              <div className="game-info">
                <div className="info-row">
                  <span className="label">比賽時間:</span>
                  <span className="value">{formatDate(history.gameStartTime)} - {formatDate(history.gameEndTime)}</span>
                </div>
                <div className="info-row">
                  <span className="label">比賽時長:</span>
                  <span className="value">{getGameDuration()}</span>
                </div>
                <div className="info-row">
                  <span className="label">總輪數:</span>
                  <span className="value">{history.totalRounds} 輪</span>
                </div>
                <div className="info-row">
                  <span className="label">總比賽數:</span>
                  <span className="value">{matchResults.length} 場</span>
                </div>
              </div>

              <div className="final-ranking">
                <h3>最終排名</h3>
                <div className="ranking-list">
                  {finalRanking.map((player, index) => (
                    <div key={player.player} className={`ranking-item ${index === 0 ? 'winner' : ''}`}>
                      <div className="rank">
                        {index === 0 && <span className="crown">👑</span>}
                        #{index + 1}
                      </div>
                      <div className="player-info">
                        {player.name && player.name !== player.player ? (
                          <div className="player-name-primary">{player.name}</div>
                        ) : (
                          <div className="player-label-primary">{player.player}</div>
                        )}
                      </div>
                      <div className="score">{player.score} 分</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="match-history">
              <h3>比賽詳細記錄</h3>
              <div className="matches-list">
                {matchResults.map((match) => (
                  <div key={match.index} className="match-record">
                    <div className="match-info">
                      <span className="match-number">第{match.round}輪 - 比賽{match.matchInRound}</span>
                      <span className="match-time">{formatDate(match.timestamp)}</span>
                    </div>
                    <div className="match-players">
                      <span className={`player ${match.winner === match.player1 ? 'winner' : 'loser'}`}>
                        {history.players[match.player1] && history.players[match.player1] !== match.player1 
                          ? history.players[match.player1] 
                          : match.player1}
                      </span>
                      <span className="vs">VS</span>
                      <span className={`player ${match.winner === match.player2 ? 'winner' : 'loser'}`}>
                        {history.players[match.player2] && history.players[match.player2] !== match.player2 
                          ? history.players[match.player2] 
                          : match.player2}
                      </span>
                    </div>
                    <div className="match-result">
                      勝利者: {history.players[match.winner] && history.players[match.winner] !== match.winner 
                        ? history.players[match.winner] 
                        : match.winner}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="player-statistics">
              <h3>玩家統計</h3>
              <div className="stats-grid">
                {Object.entries(playerStats).map(([player, stats]) => (
                  <div key={player} className="player-stat-card">
                    <div className="stat-header">
                      <h4>{stats.name && stats.name !== player ? stats.name : player}</h4>
                    </div>
                    <div className="stat-body">
                      <div className="stat-row">
                        <span>總比賽數:</span>
                        <span>{stats.totalMatches}</span>
                      </div>
                      <div className="stat-row">
                        <span>勝利場數:</span>
                        <span>{stats.wins}</span>
                      </div>
                      <div className="stat-row">
                        <span>失敗場數:</span>
                        <span>{stats.losses}</span>
                      </div>
                      <div className="stat-row">
                        <span>勝率:</span>
                        <span>{stats.winRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

export default HistoryModal;