// Match schedule component showing fixed match order
import React from 'react';
import { MATCH_ORDER } from '../utils/gameLogic';

const MatchSchedule = ({ currentMatchIndex, playerNames }) => {
  const currentRound = Math.floor(currentMatchIndex / MATCH_ORDER.length) + 1;
  const matchInRound = currentMatchIndex % MATCH_ORDER.length;

  return (
    <div className="match-schedule">
      <div className="schedule-header">
        <h3>固定對戰順序</h3>
        <div className="current-round">第 {currentRound} 輪</div>
      </div>

      <div className="schedule-list">
        {MATCH_ORDER.map((match, index) => {
          const isCurrentMatch = index === matchInRound;
          const isPastMatch = index < matchInRound;
          const player1 = match[0];
          const player2 = match[1];
          const player1Name = playerNames?.[player1] || player1;
          const player2Name = playerNames?.[player2] || player2;

          return (
            <div 
              key={index} 
              className={`schedule-item ${isCurrentMatch ? 'current' : ''} ${isPastMatch ? 'completed' : ''}`}
            >
              <div className="match-number">{index + 1}</div>
              <div className="match-players">
                <span className="player-label">{player1}</span>
                <span className="player-name">{player1Name}</span>
                <span className="vs">vs</span>
                <span className="player-label">{player2}</span>
                <span className="player-name">{player2Name}</span>
              </div>
              <div className="match-status">
                {isCurrentMatch && <span className="current-indicator">進行中</span>}
                {isPastMatch && <span className="completed-indicator">✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="schedule-footer">
        <div className="progress-info">
          進度: {matchInRound + 1} / {MATCH_ORDER.length}
        </div>
        <div className="cycle-info">
          一輪結束後自動開始下一輪
        </div>
      </div>
    </div>
  );
};

export default MatchSchedule;