// Main game room component
import React, { useState, useEffect } from 'react';
import { subscribeToRoom, recordMatchResult, finishTournament, updateRoomStatus, undoLastMatch } from '../services/database';
import { getCurrentMatch, getRoundNumber, getMatchInRound, getLeaderboard } from '../utils/gameLogic';
import GameBoard from './GameBoard';
import Leaderboard from './Leaderboard';
import MatchSchedule from './MatchSchedule';
import ResultsModal from './ResultsModal';

const GameRoom = ({ roomCode, onLeaveRoom }) => {
  const [roomData, setRoomData] = useState(null);
  const [currentMatch, setCurrentMatch] = useState(['A', 'B']);
  const [roundNumber, setRoundNumber] = useState(1);
  const [matchInRound, setMatchInRound] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    // Handle window resize for responsive design
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Subscribe to room data changes
    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setRoomData(data);
        updateGameState(data);
      }
    });

    return unsubscribe;
  }, [roomCode]);

  const updateGameState = (data) => {
    const currentMatchIndex = data.currentMatch || 0;
    const matches = data.matches || [];
    const match = getCurrentMatch(currentMatchIndex, matches);
    const round = getRoundNumber(currentMatchIndex);
    const matchInCurrentRound = getMatchInRound(currentMatchIndex);
    const currentScores = data.scores || { A: 0, B: 0, C: 0, D: 0 };
    const playerNames = data.playerNames || {};

    setCurrentMatch(match);
    setRoundNumber(round);
    setMatchInRound(matchInCurrentRound);
    setLeaderboard(getLeaderboard(currentScores, playerNames));
    setIsFinished(data.status === 'finished');
    
    // Check if there are any matches to undo
    const hasMatches = matches.some(match => match && match.winner);
    setCanUndo(hasMatches && data.status !== 'finished');
  };

  const handlePlayerWin = async (winner) => {
    console.log('handlePlayerWin called with:', winner, 'roomData:', roomData, 'isFinished:', isFinished);
    if (!roomData || isFinished) return;

    try {
      const currentMatchIndex = roomData.currentMatch || 0;
      console.log('Recording match result:', roomCode, currentMatchIndex, winner);
      await recordMatchResult(roomCode, currentMatchIndex, winner);
      
      // Update room status to playing if it's still waiting
      if (roomData.status === 'waiting') {
        console.log('Updating room status to playing');
        await updateRoomStatus(roomCode, 'playing');
      }
    } catch (error) {
      console.error('Error recording match result:', error);
    }
  };

  const handleFinishTournament = async () => {
    try {
      await finishTournament(roomCode);
      setShowResults(true);
    } catch (error) {
      console.error('Error finishing tournament:', error);
    }
  };

  const handleUndoLastMatch = async () => {
    if (!canUndo) return;
    
    try {
      const success = await undoLastMatch(roomCode);
      if (!success) {
        alert('沒有可以撤回的比賽結果');
      }
    } catch (error) {
      console.error('Error undoing match:', error);
      alert('撤回失敗，請重試');
    }
  };

  if (!roomData) {
    return (
      <div className="game-room">
        <div className="loading">載入房間中...</div>
      </div>
    );
  }

  return (
    <div className={`game-room ${isMobile ? 'mobile-layout' : ''}`}>
      {isMobile ? (
        // Mobile Layout
        <>
          <main className="game-content">
            {/* Current Match - Top Section */}
            <div className="current-match-section">
              <div className="match-title">
                <h2>當前對戰</h2>
                {isFinished && <div className="finished-badge">已結束</div>}
              </div>
              
              <div className="vs-container-mobile">
                <div 
                  className={`player-card-mobile ${isFinished ? 'disabled' : 'clickable'}`}
                  onClick={() => handlePlayerWin(currentMatch[0])}
                >
                  <div className="player-name main-name">{roomData.playerNames?.[currentMatch[0]] || currentMatch[0]}</div>
                  <div className="player-score">{roomData.scores?.[currentMatch[0]] || 0} 分</div>
                  {!isFinished && <div className="win-hint">點擊選擇勝利者</div>}
                </div>

                <div className="vs-divider-mobile">
                  <span>VS</span>
                </div>

                <div 
                  className={`player-card-mobile ${isFinished ? 'disabled' : 'clickable'}`}
                  onClick={() => handlePlayerWin(currentMatch[1])}
                >
                  <div className="player-name main-name">{roomData.playerNames?.[currentMatch[1]] || currentMatch[1]}</div>
                  <div className="player-score">{roomData.scores?.[currentMatch[1]] || 0} 分</div>
                  {!isFinished && <div className="win-hint">點擊選擇勝利者</div>}
                </div>
              </div>

              {/* Score difference display for mobile */}
              <div className="score-info-mobile">
                {(() => {
                  const player1Score = roomData.scores?.[currentMatch[0]] || 0;
                  const player2Score = roomData.scores?.[currentMatch[1]] || 0;
                  const scoreDifference = Math.abs(player1Score - player2Score);
                  const player1Name = roomData.playerNames?.[currentMatch[0]] || currentMatch[0];
                  const player2Name = roomData.playerNames?.[currentMatch[1]] || currentMatch[1];
                  const leadingPlayer = player1Score > player2Score ? player1Name : 
                                       player2Score > player1Score ? player2Name : null;
                  
                  return scoreDifference === 0 ? (
                    <div className="score-tied">目前積分打平 ({player1Score} - {player2Score})</div>
                  ) : (
                    <div className="score-difference">
                      {leadingPlayer} 領先 {scoreDifference} 分 ({player1Score} - {player2Score})
                    </div>
                  );
                })()}
              </div>

              {isFinished && (
                <div className="finished-message">
                  <p>比賽已結束，感謝參與！</p>
                </div>
              )}
            </div>
            
            {/* Middle Section - Schedule and Leaderboard */}
            <div className="game-middle">
              <div className="match-schedule-container-mobile">
                <MatchSchedule 
                  currentMatchIndex={roomData.currentMatch || 0}
                  playerNames={roomData.playerNames}
                  matchResults={roomData.matches || []}
                />
              </div>
              
              <div className="leaderboard-container-mobile">
                <Leaderboard 
                  leaderboard={leaderboard}
                  isFinished={isFinished}
                />
              </div>
            </div>
          </main>

          {/* Bottom Section - Room Info and Controls */}
          <footer className="game-footer">
            <div className="room-info-mobile">
              <div className="room-code-mobile">房間: {roomCode}</div>
              <div className="version-info">v1.7.0</div>
              <div className="round-info-mobile">
                第 {roundNumber} 輪 - 比賽 {matchInRound}/6
              </div>
            </div>
            
            <div className="footer-actions">
              <button 
                className="undo-btn"
                onClick={handleUndoLastMatch}
                disabled={!canUndo}
                title="撤回上一場比賽結果"
              >
                撤回
              </button>
              <button 
                className="finish-btn"
                onClick={handleFinishTournament}
                disabled={isFinished}
              >
                {isFinished ? '已結束' : '結束比賽'}
              </button>
              <button 
                className="leave-btn"
                onClick={onLeaveRoom}
              >
                離開房間
              </button>
            </div>
          </footer>
        </>
      ) : (
        // Desktop Layout (Original)
        <>
          <header className="game-header">
            <div className="room-info">
              <h1>房間: {roomCode}</h1>
              <div className="version-info">v1.7.0</div>
            </div>
            <div className="game-progress">
              <div className="round-info">
                第 {roundNumber} 輪 - 比賽 {matchInRound}/6
              </div>
              <div className="match-info">
                當前對戰: {roomData.playerNames?.[currentMatch[0]] || currentMatch[0]} vs {roomData.playerNames?.[currentMatch[1]] || currentMatch[1]}
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="undo-btn"
                onClick={handleUndoLastMatch}
                disabled={!canUndo}
                title="撤回上一場比賽結果"
              >
                撤回
              </button>
              <button 
                className="finish-btn"
                onClick={handleFinishTournament}
                disabled={isFinished}
              >
                {isFinished ? '已結束' : '結束比賽'}
              </button>
              <button 
                className="leave-btn"
                onClick={onLeaveRoom}
              >
                離開房間
              </button>
            </div>
          </header>

          <main className="game-content">
            <div className="game-top">
              <div className="game-board-container">
                <GameBoard 
                  currentMatch={currentMatch}
                  playerNames={roomData.playerNames}
                  onPlayerWin={handlePlayerWin}
                  isFinished={isFinished}
                  playerScores={roomData.scores}
                />
              </div>
              
              <div className="match-schedule-container">
                <MatchSchedule 
                  currentMatchIndex={roomData.currentMatch || 0}
                  playerNames={roomData.playerNames}
                  matchResults={roomData.matches || []}
                />
              </div>
            </div>
            
            <div className="game-bottom">
              <Leaderboard 
                leaderboard={leaderboard}
                isFinished={isFinished}
              />
            </div>
          </main>
        </>
      )}

      {showResults && (
        <ResultsModal 
          leaderboard={leaderboard}
          roomCode={roomCode}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
};

export default GameRoom;