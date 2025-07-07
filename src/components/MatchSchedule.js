// Match schedule component showing dynamic match order
import React from 'react';
import { getCurrentMatchOrder, getRoundNumber, getMatchInRound, getPlayerRotationInfo } from '../utils/gameLogic';

const MatchSchedule = ({ currentMatchIndex, playerNames, matchResults = [] }) => {
  const currentMatchOrder = getCurrentMatchOrder(matchResults, currentMatchIndex);
  const currentRound = getRoundNumber(currentMatchIndex);
  const matchInRound = getMatchInRound(currentMatchIndex) - 1; // Convert to 0-based index
  const rotationInfo = getPlayerRotationInfo(currentRound);
  
  // Get results for current round to check confirmation status
  const roundStartIndex = (currentRound - 1) * 6;
  const roundResults = matchResults.slice(roundStartIndex, roundStartIndex + 6);

  return (
    <div className="match-schedule">
      <div className="schedule-header">
        <h3>動態對戰順序</h3>
        <div className="current-round">第 {currentRound} 輪</div>
      </div>

      <div className="schedule-list">
        {currentMatchOrder.map((match, index) => {
          const isCurrentMatch = index === matchInRound;
          const isPastMatch = index < matchInRound;
          const player1 = match[0];
          const player2 = match[1];
          
          // Check if this match is confirmed or needs TBC
          const isMatchConfirmed = index < 2 || (roundResults && roundResults.length >= 2);
          
          const player1Name = isMatchConfirmed ? (playerNames?.[player1] || player1) : 'TBC';
          const player2Name = isMatchConfirmed ? (playerNames?.[player2] || player2) : 'TBC';
          const displayPlayer1 = isMatchConfirmed ? player1 : 'TBC';
          const displayPlayer2 = isMatchConfirmed ? player2 : 'TBC';
          
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
              className={`schedule-item ${isCurrentMatch ? 'current' : ''} ${isPastMatch ? 'completed' : ''} ${!isMatchConfirmed ? 'tbc' : ''}`}
            >
              <div className="match-number">{index + 1}</div>
              <div className="match-players">
                <span className={`player-label ${!isMatchConfirmed ? 'tbc-label' : ''}`}>{displayPlayer1}</span>
                <span className={`player-name ${!isMatchConfirmed ? 'tbc-name' : ''}`}>{player1Name}</span>
                <span className="vs">vs</span>
                <span className={`player-label ${!isMatchConfirmed ? 'tbc-label' : ''}`}>{displayPlayer2}</span>
                <span className={`player-name ${!isMatchConfirmed ? 'tbc-name' : ''}`}>{player2Name}</span>
                {matchLabel && <span className={`match-label ${labelClass}`}>({matchLabel})</span>}
              </div>
              <div className="match-status">
                {isCurrentMatch && <span className="current-indicator">進行中</span>}
                {isPastMatch && <span className="completed-indicator">✓</span>}
                {!isMatchConfirmed && !isCurrentMatch && !isPastMatch && <span className="tbc-indicator">待確認</span>}
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
        <div className="rotation-explanation">
          <small>💡 對戰順序: 前兩場固定 → 第3-4場由前兩場結果決定 → 第5-6場補齊剩餘組合</small>
        </div>
      </div>
    </div>
  );
};

export default MatchSchedule;