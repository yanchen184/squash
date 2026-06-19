// 早期結束 / 早期查看用 — 顯示兩 round 獨立排名
import React, { useState, useMemo } from 'react';
import HistoryModal from './HistoryModal';
import { computeRoundRanking } from '../utils/rankingLogic';

const ResultsModal = ({ matches = [], playerNames = {}, roomCode, onClose }) => {
  const [showHistory, setShowHistory] = useState(false);

  const r1 = useMemo(
    () => computeRoundRanking(matches, 1, {}, true),
    [matches]
  );
  const r2 = useMemo(
    () => computeRoundRanking(matches, 2, {}, true),
    [matches]
  );

  const r1HasData = matches.slice(0, 18).some(m => m && m.winner);
  const r2HasData = matches.slice(18, 36).some(m => m && m.winner);

  if (showHistory) {
    return (
      <HistoryModal
        roomCode={roomCode}
        onClose={() => setShowHistory(false)}
      />
    );
  }

  const renderRanking = (label, data) => (
    <div className="final-standings">
      <h4>{label}</h4>
      <div className="standings-list">
        {data.ranking.map((r) => (
          <div key={r.player} className="standing-item">
            <div className="standing-rank">#{r.rank}{r.tied ? ' (並列)' : ''}</div>
            <div className="standing-player">
              <span className="player-name-primary">{playerNames[r.player] || r.player}</span>
            </div>
            <div className="standing-score">{r.score} 勝</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content results-modal">
        <div className="modal-header">
          <h2>比賽結果</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {r1HasData && renderRanking('🥇 Round 1 排名', r1)}
          {r2HasData && renderRanking('🥇 Round 2 排名', r2)}
          {!r1HasData && !r2HasData && (
            <p>尚無比賽資料。</p>
          )}

          <div className="room-info">
            <p>房間代碼: <strong>{roomCode}</strong></p>
            <p>比賽已結束,感謝各位的參與!</p>
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
