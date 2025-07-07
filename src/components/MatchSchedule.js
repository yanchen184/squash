// Match schedule component showing dynamic match order
import React from 'react';
import { getCurrentMatchOrder, getRoundNumber, getMatchInRound, getPlayerRotationInfo } from '../utils/gameLogic';

const MatchSchedule = ({ currentMatchIndex, playerNames, matchResults = [] }) => {
  const currentMatchOrder = getCurrentMatchOrder(matchResults, currentMatchIndex);
  const currentRound = getRoundNumber(currentMatchIndex);
  const matchInRound = getMatchInRound(currentMatchIndex) - 1; // Convert to 0-based index
  const rotationInfo = getPlayerRotationInfo(currentRound);

  return (
    <div className="match-schedule">
      <div className="schedule-header">
        <h3>動態對戰順序</h3>
        <div className="current-round">第 {currentRound} 輪</div>
        {currentRound > 1 && (
          <div className="rotation-info">
            <small>位置輪動: {Object.entries(rotationInfo.mapping).map(([orig, curr]) => `${orig}→${curr}`).join(', ')}</small>
          </div>
        )}
      </div>

      <div className="schedule-list">
        {currentMatchOrder.map((match, index) => {
          const isCurrentMatch = index === matchInRound;
          const isPastMatch = index < matchInRound;
          const player1 = match[0];
          const player2 = match[1];
          const player1Name = playerNames?.[player1] || player1;
          const player2Name = playerNames?.[player2] || player2;
          
          // Add special labels for matches 3 and 4
          let matchLabel = '';
          let labelClass = '';
          if (index === 2) {
            matchLabel = '贏家組';
            labelClass = 'winners';
          } else if (index === 3) {
            matchLabel = '輸家組';
            labelClass = 'losers';
          }

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
                {matchLabel && <span className={`match-label ${labelClass}`}>({matchLabel})</span>}
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
          進度: {matchInRound + 1} / {currentMatchOrder.length}
        </div>
        <div className="cycle-info">
          特殊規則: 第3場贏家組對戰，第4場輸家組對戰
        </div>
        {currentRound > 1 && (
          <div className="rotation-note">
            <small>第{currentRound}輪開始，參賽者位置輪動 (A→B, B→C, C→D, D→A)</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchSchedule;