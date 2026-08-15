// Leaderboard component for real-time scores
import React from 'react';

const Leaderboard = ({ leaderboard, isFinished, finalRoundResults = [] }) => {
  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h3>積分榜</h3>
        {isFinished && <div className="final-results">最終結果</div>}
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.player}
            className={`leaderboard-item ${index === 0 && isFinished ? 'winner' : ''}`}
          >
            <div className="rank">
              {index + 1}
              {index === 0 && isFinished && <span className="crown">👑</span>}
            </div>
            <div className="player-info">
              {entry.name && entry.name !== entry.player ? (
                <div className="player-name main-display">{entry.name}</div>
              ) : (
                <div className="player-label main-display">{entry.player}</div>
              )}
            </div>
            <div className="score">
              {entry.score}
            </div>
          </div>
        ))}
      </div>

      {/* 決勝輪 (Round 2 第 3 輪) 對戰結果 — 同分名次的唯一依據,總分不影響 */}
      {finalRoundResults.length > 0 && (
        <div className="final-h2h">
          <div className="final-h2h-title">🎯 決勝輪對戰(同分名次依據)</div>
          {finalRoundResults.map((r, i) => (
            <div key={i} className="final-h2h-row">
              <b>{r.winner}</b> 勝 {r.loser}{r.score ? `(${r.score})` : ''}
            </div>
          ))}
        </div>
      )}

      <div className="leaderboard-footer">
        <small>
          {finalRoundResults.length > 0
            ? '同分名次:先比決勝輪直接對戰勝負,H2H 全平才比上列比分 — 總分不影響名次'
            : '積分 = 勝利場次'}
        </small>
      </div>
    </div>
  );
};

export default Leaderboard;
