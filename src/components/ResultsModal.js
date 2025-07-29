// Results modal component for final tournament results
import React, { useState } from 'react';
import HistoryModal from './HistoryModal';

const ResultsModal = ({ leaderboard, roomCode, onClose }) => {
  const [showHistory, setShowHistory] = useState(false);
  const winner = leaderboard[0];
  
  if (showHistory) {
    return (
      <HistoryModal 
        roomCode={roomCode} 
        onClose={() => setShowHistory(false)} 
      />
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content results-modal">
        <div className="modal-header">
          <h2>比賽結果</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="winner-announcement">
            <div className="winner-crown">👑</div>
            <h3>恭喜獲勝者！</h3>
            <div className="winner-info">
              <div className="winner-player">{winner.player}</div>
              <div className="winner-name">{winner.name}</div>
              <div className="winner-score">{winner.score} 分</div>
            </div>
          </div>

          <div className="final-standings">
            <h4>最終排名</h4>
            <div className="standings-list">
              {leaderboard.map((entry, index) => (
                <div key={entry.player} className="standing-item">
                  <div className="standing-rank">#{index + 1}</div>
                  <div className="standing-player">
                    <span className="player-label">{entry.player}</span>
                    <span className="player-name">{entry.name}</span>
                  </div>
                  <div className="standing-score">{entry.score} 分</div>
                </div>
              ))}
            </div>
          </div>

          <div className="room-info">
            <p>房間代碼: <strong>{roomCode}</strong></p>
            <p>比賽已結束，感謝各位的參與！</p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={() => setShowHistory(true)}
          >
            查看歷史記錄
          </button>
          <button className="primary-btn" onClick={onClose}>
            確定
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsModal;