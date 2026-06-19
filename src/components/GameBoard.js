// Game board component for current match display
import React, { useState } from 'react';
import { calculateHandicap, shouldCollectScore } from '../utils/rankingLogic';

const GameBoard = ({
  currentMatch,
  playerNames,
  onPlayerWin,
  isFinished,
  playerScores,
  matchIndex = 0,
  allMatches = [],
  userRound = 1,
}) => {
  const player1 = currentMatch[0];
  const player2 = currentMatch[1];
  const player1Name = playerNames?.[player1] || player1;
  const player2Name = playerNames?.[player2] || player2;

  // Get current scores for both players
  const player1Score = playerScores?.[player1] || 0;
  const player2Score = playerScores?.[player2] || 0;

  // 讓分計算
  const handicap = calculateHandicap(playerScores, player1, player2);
  const handicapText = handicap.amount > 0
    ? `${playerNames?.[handicap.giver] || handicap.giver} 讓 ${playerNames?.[handicap.receiver] || handicap.receiver} ${handicap.amount} 分`
    : null;

  // 判斷此場是否需要記比分 (Round 2 第 3 輪、或 Round 1 末是 3 人同分時)
  const needsScore = shouldCollectScore(matchIndex, allMatches, playerScores);

  const [showScoreInput, setShowScoreInput] = useState(false);
  const [pendingWinner, setPendingWinner] = useState(null);
  const [loserScore, setLoserScore] = useState('');

  const handlePlayerClick = (player) => {
    if (isFinished) return;
    if (!needsScore) {
      // 不需要比分,直接送出
      onPlayerWin(player, { handicap });
      return;
    }
    // 需要比分,先選贏家,再彈出比分輸入
    setPendingWinner(player);
    setLoserScore('');
    setShowScoreInput(true);
  };

  const handleConfirmScore = (forceDeuce = false) => {
    const winnerScoreVal = forceDeuce ? 8 : 7;
    const loserScoreVal = forceDeuce ? 6 : parseInt(loserScore, 10);
    if (!forceDeuce && (isNaN(loserScoreVal) || loserScoreVal < 0 || loserScoreVal > 5)) {
      alert('輸家得分請輸入 0-5 (打到 6 一律是 deuce,請按 deuce 8:6)');
      return;
    }
    onPlayerWin(pendingWinner, {
      handicap,
      scores: { winner: winnerScoreVal, loser: loserScoreVal },
    });
    setShowScoreInput(false);
    setPendingWinner(null);
    setLoserScore('');
  };

  const handleCancelScore = () => {
    setShowScoreInput(false);
    setPendingWinner(null);
    setLoserScore('');
  };

  return (
    <div className="game-board">
      <div className="match-title">
        <h2>當前對戰</h2>
        {isFinished && <div className="finished-badge">已結束</div>}
      </div>

      {/* 讓分顯示 */}
      {handicapText && (
        <div className="handicap-banner">⚖️ {handicapText}</div>
      )}

      <div className="vs-container">
        <div
          className={`player-card ${isFinished ? 'disabled' : 'clickable'}`}
          onClick={() => handlePlayerClick(player1)}
        >
          <div className="player-name main-name">{player1Name}</div>
          <div className="player-score">{player1Score} 勝</div>
          {!isFinished && <div className="win-hint">點擊選擇勝利者</div>}
        </div>

        <div className="vs-divider">
          <span>VS</span>
        </div>

        <div
          className={`player-card ${isFinished ? 'disabled' : 'clickable'}`}
          onClick={() => handlePlayerClick(player2)}
        >
          <div className="player-name main-name">{player2Name}</div>
          <div className="player-score">{player2Score} 勝</div>
          {!isFinished && <div className="win-hint">點擊選擇勝利者</div>}
        </div>
      </div>

      {/* Round X 場勝 */}
      <div className="score-info">
        {handicap.amount === 0 ? (
          <div className="score-tied">Round {userRound} 累積打平 ({player1Score} - {player2Score})</div>
        ) : (
          <div className="score-difference">
            Round {userRound} 累積 {player1Name} {player1Score} : {player2Name} {player2Score}
          </div>
        )}
      </div>

      {needsScore && !showScoreInput && !isFinished && (
        <div className="score-hint">
          💡 此場可能影響 tie-break,點贏家後請輸入比分
        </div>
      )}

      {/* 比分輸入面板 */}
      {showScoreInput && (
        <div className="score-input-panel">
          <div className="score-input-title">
            🏆 <b>{playerNames?.[pendingWinner] || pendingWinner}</b> 贏 — 請輸入對方得分
          </div>
          <div className="score-input-row">
            <input
              type="number"
              min={0}
              max={5}
              placeholder="0-5"
              value={loserScore}
              onChange={(e) => setLoserScore(e.target.value)}
              className="score-input"
              autoFocus
            />
            <button className="primary-btn small" onClick={() => handleConfirmScore(false)}>
              確認 7:{loserScore || '?'}
            </button>
            <button className="cancel-btn small" onClick={() => handleConfirmScore(true)}>
              deuce 8:6
            </button>
            <button className="cancel-btn small" onClick={handleCancelScore}>
              取消
            </button>
          </div>
        </div>
      )}

      {isFinished && (
        <div className="finished-message">
          <p>比賽已結束,感謝參與!</p>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
