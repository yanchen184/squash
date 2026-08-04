// Leaderboard component for real-time scores
import React from 'react';

const Leaderboard = ({ leaderboard, isFinished, showPoints }) => {
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
              {showPoints && <span className="score-points"> · {entry.points ?? 0} 分</span>}
            </div>
          </div>
        ))}
      </div>
      
      <div className="leaderboard-footer">
        <small>{showPoints ? '積分 = 勝利場次　·　分 = 累積比分（同勝場時比分高者勝）' : '積分 = 勝利場次'}</small>
      </div>
    </div>
  );
};

export default Leaderboard;