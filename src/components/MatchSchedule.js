// Match schedule component showing dynamic match order
import React from 'react';
import { getCurrentMatchOrder, getRoundNumber, getMatchInRound } from '../utils/gameLogic';

const MatchSchedule = ({ currentMatchIndex, playerNames, matchResults = [] }) => {
  const currentMatchOrder = getCurrentMatchOrder(matchResults, currentMatchIndex);
  const currentRound = getRoundNumber(currentMatchIndex);
  const matchInRound = getMatchInRound(currentMatchIndex) - 1; // Convert to 0-based index
  
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
          
          // 優先顯示玩家名稱，若為空值才顯示 A B C D
          const player1Name = isMatchConfirmed ? (playerNames?.[player1] || player1) : 'TBC';
          const player2Name = isMatchConfirmed ? (playerNames?.[player2] || player2) : 'TBC';
          
          // 檢查是否有自定義名稱，沒有才顯示標籤
          const hasPlayer1Name = playerNames?.[player1] && playerNames[player1] !== player1;
          const hasPlayer2Name = playerNames?.[player2] && playerNames[player2] !== player2;
          
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
              <div className="match-players">
                {isMatchConfirmed ? (
                  hasPlayer1Name ? (
                    <span className="player-name">{player1Name}</span>
                  ) : (
                    <span className="player-label">{player1}</span>
                  )
                ) : (
                  <span className="tbc-label">TBC</span>
                )}
                <span className="vs">vs</span>
                {isMatchConfirmed ? (
                  hasPlayer2Name ? (
                    <span className="player-name">{player2Name}</span>
                  ) : (
                    <span className="player-label">{player2}</span>
                  )
                ) : (
                  <span className="tbc-label">TBC</span>
                )}
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
        <div className="rotation-explanation">
          <small>💡 對戰順序: 前兩場固定 → 第3-4場由前兩場結果決定 → 第5-6場補齊剩餘組合</small>
        </div>
      </div>
    </div>
  );
};

export default MatchSchedule;