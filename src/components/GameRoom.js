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
    const match = getCurrentMatch(currentMatchIndex);
    const round = getRoundNumber(currentMatchIndex);
    const matchInCurrentRound = getMatchInRound(currentMatchIndex);
    const currentScores = data.scores || { A: 0, B: 0, C: 0, D: 0 };
    const playerNames = data.playerNames || {};
    const matches = data.matches || [];

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
    <div className="game-room">
      <header className="game-header">
        <div className="room-info">
          <h1>房間: {roomCode}</h1>
          <div className="version-info">v1.0.5</div>
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
            />
          </div>
          
          <div className="match-schedule-container">
            <MatchSchedule 
              currentMatchIndex={roomData.currentMatch || 0}
              playerNames={roomData.playerNames}
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