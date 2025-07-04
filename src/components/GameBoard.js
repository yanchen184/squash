// Game board component for current match display
import React from 'react';

const GameBoard = ({ currentMatch, playerNames, onPlayerWin, isFinished }) => {
  const player1 = currentMatch[0];
  const player2 = currentMatch[1];
  const player1Name = playerNames?.[player1] || player1;
  const player2Name = playerNames?.[player2] || player2;

  const handlePlayerClick = (player) => {
    console.log('Player clicked:', player, 'isFinished:', isFinished);
    if (isFinished) return;
    console.log('Calling onPlayerWin with:', player);
    onPlayerWin(player);
  };

  return (
    <div className="game-board">
      <div className="match-title">
        <h2>當前對戰</h2>
        {isFinished && <div className="finished-badge">已結束</div>}
      </div>
      
      <div className="vs-container">
        <div 
          className={`player-card ${isFinished ? 'disabled' : 'clickable'}`}
          onClick={() => handlePlayerClick(player1)}
        >
          <div className="player-label">{player1}</div>
          <div className="player-name">{player1Name}</div>
          {!isFinished && <div className="win-hint">點擊選擇勝利者</div>}
        </div>

        <div className="vs-divider">
          <span>VS</span>
        </div>

        <div 
          className={`player-card ${isFinished ? 'disabled' : 'clickable'}`}
          onClick={() => handlePlayerClick(player2)}
        >
          <div className="player-label">{player2}</div>
          <div className="player-name">{player2Name}</div>
          {!isFinished && <div className="win-hint">點擊選擇勝利者</div>}
        </div>
      </div>

      {isFinished && (
        <div className="finished-message">
          <p>比賽已結束，感謝參與！</p>
        </div>
      )}
    </div>
  );
};

export default GameBoard;