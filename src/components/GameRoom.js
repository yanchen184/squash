// Main game room component
import React, { useState, useEffect } from 'react';
import { subscribeToRoom, recordMatchResult, finishTournament, updateRoomStatus, undoLastMatch } from '../services/database';
import { getCurrentMatch, getRoundNumber, getMatchInRound, getLeaderboard } from '../utils/gameLogic';
import {
  calculateHandicap,
  cumulativeWinsUpToMatch,
  cumulativeWinsInRound,
  groupByScore,
  shouldCollectScore,
  roundPointsPerPlayer,
} from '../utils/rankingLogic';
import GameBoard from './GameBoard';
import Leaderboard from './Leaderboard';
import MatchSchedule from './MatchSchedule';
import ResultsModal from './ResultsModal';
import SettlementModal from './SettlementModal';
import RulesPanel from './RulesPanel';

const GameRoom = ({ roomCode, onLeaveRoom }) => {
  const [roomData, setRoomData] = useState(null);
  const [currentMatch, setCurrentMatch] = useState(['A', 'B']);
  const [roundNumber, setRoundNumber] = useState(1);
  const [matchInRound, setMatchInRound] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showPoints, setShowPoints] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  // settlement 採 queue:第 36 場時可能要連續顯示「Round 1 final」+「Round 2 final」
  const [settlementQueue, setSettlementQueue] = useState([]);  // [{round, hasBreaker, isFinal}, ...]
  const [settlementShownFor, setSettlementShownFor] = useState({});

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
    const perms = data.permutations || null;
    const match = getCurrentMatch(currentMatchIndex, matches, perms);
    const round = getRoundNumber(currentMatchIndex);  // 這是「輪」number (1-6)
    const matchInCurrentRound = getMatchInRound(currentMatchIndex);
    const playerNames = data.playerNames || {};

    // 用當前 round (1 或 2) 算 leaderboard,clamp 在 2 避免溢出
    const userRound = Math.min(Math.max(Math.floor(currentMatchIndex / 18) + 1, 1), 2);
    const roundOnlyScores = cumulativeWinsInRound(matches, userRound);

    setCurrentMatch(match);
    setRoundNumber(round);
    setMatchInRound(matchInCurrentRound);
    const roundPoints = roundPointsPerPlayer(matches, userRound);
    setLeaderboard(getLeaderboard(roundOnlyScores, playerNames).map(e => ({ ...e, points: roundPoints[e.player] || 0 })));
    // Round 2 最後一輪 (sub-round 3):顯示累積比分,方便看 tie-break 勝利條件
    setShowPoints(userRound === 2 && Math.floor((currentMatchIndex % 18) / 6) === 2);
    setIsFinished(data.status === 'finished');

    const hasMatches = matches.some(m => m && m.winner);
    setCanUndo(hasMatches && data.status !== 'finished');

  };

  // Settlement triggers — 獨立 useEffect 避免 stale closure
  useEffect(() => {
    if (!roomData || roomData.status === 'finished') return;
    const matches = roomData.matches || [];
    const completedMatches = matches.filter(m => m && m.winner).length;
    const r1 = cumulativeWinsInRound(matches, 1);
    const r1Groups = groupByScore(r1);
    const r1HasAnyTie = r1Groups.some(g => g.length >= 2);
    const r1HasThreeWay = r1Groups.some(g => g.length >= 3);

    if (completedMatches >= 36 && !settlementShownFor.final) {
      const queue = [];
      if (r1HasAnyTie) queue.push({ round: 1, hasBreaker: true, isFinal: true });
      queue.push({ round: 2, hasBreaker: true, isFinal: true });
      setSettlementQueue(queue);
      setSettlementShownFor(prev => ({ ...prev, final: true }));
    } else if (completedMatches >= 24 && !settlementShownFor.round1Mid && r1HasThreeWay) {
      setSettlementQueue([{ round: 1, hasBreaker: true, isFinal: false }]);
      setSettlementShownFor(prev => ({ ...prev, round1Mid: true }));
    } else if (completedMatches >= 18 && !settlementShownFor.round1Initial) {
      setSettlementQueue([{ round: 1, hasBreaker: false, isFinal: false }]);
      setSettlementShownFor(prev => ({ ...prev, round1Initial: true }));
    }
  }, [roomData, settlementShownFor]);

  const handlePlayerWin = async (winner, extras = {}) => {
    if (!roomData || isFinished) return;

    const currentMatchIndex = roomData.currentMatch || 0;
    if (currentMatchIndex >= 36) {
      alert('已經打完 36 場 (2 round),請按「結束比賽」');
      return;
    }

    try {
      // 一律帶上 pair 方便 tie-break 反查
      const allExtras = { ...extras, pair: [currentMatch[0], currentMatch[1]] };
      await recordMatchResult(roomCode, currentMatchIndex, winner, allExtras);

      // Update room status to playing if it's still waiting
      if (roomData.status === 'waiting') {
        await updateRoomStatus(roomCode, 'playing');
      }
    } catch (error) {
      console.error('Error recording match result:', error);
    }
  };

  // 手機版點玩家:若需要比分則彈內嵌輸入面板,否則直接記
  const [mobileScoreState, setMobileScoreState] = useState(null);

  const handleMobileCardClick = (picked) => {
    if (!roomData || isFinished) return;
    const currentMatchIndex = roomData.currentMatch || 0;
    const needsScore = shouldCollectScore(currentMatchIndex, roomData.matches || []);
    if (needsScore) {
      setMobileScoreState({ winner: picked, loserScore: '' });
    } else {
      const roundScores = cumulativeWinsUpToMatch(roomData.matches || [], currentMatchIndex);
      const hc = calculateHandicap(roundScores, currentMatch[0], currentMatch[1]);
      handlePlayerWin(picked, { handicap: hc });
    }
  };

  const handleMobileScoreConfirm = (forceDeuce = false) => {
    if (!mobileScoreState) return;
    const { winner, loserScore } = mobileScoreState;
    const ls = forceDeuce ? 6 : parseInt(loserScore, 10);
    const ws = forceDeuce ? 8 : 7;
    if (!forceDeuce && (isNaN(ls) || ls < 0 || ls > 5)) {
      alert('輸家比分 0-5 (打到 6 = deuce 8:6)');
      return;
    }
    const currentMatchIndex = roomData.currentMatch || 0;
    const roundScores = cumulativeWinsUpToMatch(roomData.matches || [], currentMatchIndex);
    const hc = calculateHandicap(roundScores, currentMatch[0], currentMatch[1]);
    handlePlayerWin(winner, { handicap: hc, scores: { winner: ws, loser: ls } });
    setMobileScoreState(null);
  };

  const handleFinishTournament = async (skipResultsModal = false) => {
    try {
      await finishTournament(roomCode);
      if (!skipResultsModal) setShowResults(true);
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

  // 統一在 render 前算 round-scoped scores (給 handicap / leaderboard / GameBoard)
  const _matchIdx = roomData.currentMatch || 0;
  const _userRound = Math.min(Math.max(Math.floor(_matchIdx / 18) + 1, 1), 2);
  const _displayIdx = Math.min(_matchIdx, 35);  // 顯示用 clamp 在最後 1 場
  const currentRoundScores = cumulativeWinsUpToMatch(roomData.matches || [], _displayIdx);

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
                  onClick={() => handleMobileCardClick(currentMatch[0])}
                >
                  <div className="player-name main-name">{roomData.playerNames?.[currentMatch[0]] || currentMatch[0]}</div>
                  <div className="player-score">{currentRoundScores[currentMatch[0]] || 0} 勝</div>
                  {!isFinished && <div className="win-hint">點擊選擇勝利者</div>}
                </div>

                <div className="vs-divider-mobile">
                  <span>VS</span>
                </div>

                <div
                  className={`player-card-mobile ${isFinished ? 'disabled' : 'clickable'}`}
                  onClick={() => handleMobileCardClick(currentMatch[1])}
                >
                  <div className="player-name main-name">{roomData.playerNames?.[currentMatch[1]] || currentMatch[1]}</div>
                  <div className="player-score">{currentRoundScores[currentMatch[1]] || 0} 勝</div>
                  {!isFinished && <div className="win-hint">點擊選擇勝利者</div>}
                </div>
              </div>

              {/* Round X 場勝 + handicap for mobile */}
              <div className="score-info-mobile">
                {(() => {
                  const hc = calculateHandicap(currentRoundScores, currentMatch[0], currentMatch[1]);
                  const s1 = currentRoundScores[currentMatch[0]] || 0;
                  const s2 = currentRoundScores[currentMatch[1]] || 0;
                  const n1 = roomData.playerNames?.[currentMatch[0]] || currentMatch[0];
                  const n2 = roomData.playerNames?.[currentMatch[1]] || currentMatch[1];

                  if (hc.amount === 0) {
                    return <div className="score-tied">Round {_userRound} 累積打平 ({s1} - {s2})</div>;
                  }
                  const gv = roomData.playerNames?.[hc.giver] || hc.giver;
                  const rv = roomData.playerNames?.[hc.receiver] || hc.receiver;
                  return (
                    <>
                      <div className="handicap-banner">⚖️ {gv} 讓 {rv} {hc.amount} 分</div>
                      <div className="score-difference">
                        Round {_userRound} 累積 {n1} {s1} : {n2} {s2}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* 手機版比分輸入面板 (僅 round 2 第 1/3 輪可能 tie-break 才彈) */}
              {mobileScoreState && (
                <div className="score-input-panel">
                  <div className="score-input-title">
                    🏆 <b>{roomData.playerNames?.[mobileScoreState.winner] || mobileScoreState.winner}</b> 贏 — 請輸入對方得分
                  </div>
                  <div className="score-input-row">
                    <input
                      type="number"
                      min={0}
                      max={5}
                      placeholder="0-5"
                      value={mobileScoreState.loserScore}
                      onChange={(e) => setMobileScoreState(s => ({ ...s, loserScore: e.target.value }))}
                      className="score-input"
                      autoFocus
                    />
                    <button className="primary-btn small" onClick={() => handleMobileScoreConfirm(false)}>
                      確認 7:{mobileScoreState.loserScore || '?'}
                    </button>
                    <button className="cancel-btn small" onClick={() => handleMobileScoreConfirm(true)}>
                      deuce 8:6
                    </button>
                    <button className="cancel-btn small" onClick={() => setMobileScoreState(null)}>
                      取消
                    </button>
                  </div>
                </div>
              )}

              {shouldCollectScore(roomData.currentMatch || 0, roomData.matches || []) && !mobileScoreState && !isFinished && (
                <div className="score-hint">
                  💡 此場可能影響 tie-break,點贏家後請輸入比分
                </div>
              )}

              {isFinished && (
                <div className="finished-message">
                  <p>比賽已結束,感謝參與!</p>
                </div>
              )}
            </div>

            {/* Middle Section - Schedule and Leaderboard */}
            <div className="game-middle">
              <div className="match-schedule-container-mobile">
                <MatchSchedule
                  currentMatchIndex={_matchIdx}
                  playerNames={roomData.playerNames}
                  matchResults={roomData.matches || []}
                  cumulativeScores={currentRoundScores}
                  perms={roomData.permutations}
                />
              </div>
              
              <div className="leaderboard-container-mobile">
                <Leaderboard
                  leaderboard={leaderboard}
                  isFinished={isFinished}
                  showPoints={showPoints}
                />
              </div>
            </div>
          </main>

          {/* 規則展開 */}
          <RulesPanel />

          {/* Bottom Section - Room Info and Controls */}
          <footer className="game-footer">
            <div className="room-info-mobile">
              <div className="room-code-mobile">房間: {roomCode}</div>
              <div className="version-info">v1.7.0</div>
              <div className="round-info-mobile">
                Round {_userRound} • 第 {((roundNumber - 1) % 3) + 1} 輪 • 比賽 {matchInRound}/6
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
                Round {_userRound} • 第 {((roundNumber - 1) % 3) + 1} 輪 • 比賽 {matchInRound}/6
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
                  playerScores={currentRoundScores}
                  matchIndex={_matchIdx}
                  allMatches={roomData.matches || []}
                  userRound={_userRound}
                />
              </div>

              <div className="match-schedule-container">
                <MatchSchedule
                  currentMatchIndex={_matchIdx}
                  playerNames={roomData.playerNames}
                  matchResults={roomData.matches || []}
                  cumulativeScores={currentRoundScores}
                  perms={roomData.permutations}
                />
              </div>
            </div>
            
            <div className="game-bottom">
              <Leaderboard
                leaderboard={leaderboard}
                isFinished={isFinished}
                showPoints={showPoints}
              />
              <RulesPanel />
            </div>
          </main>
        </>
      )}

      {showResults && (
        <ResultsModal
          matches={roomData.matches || []}
          playerNames={roomData.playerNames || {}}
          roomCode={roomCode}
          onClose={() => setShowResults(false)}
        />
      )}

      {settlementQueue.length > 0 && (() => {
        const cur = settlementQueue[0];
        const isLast = settlementQueue.length === 1;
        const advance = () => setSettlementQueue(q => q.slice(1));
        return (
          <SettlementModal
            matches={roomData.matches || []}
            playerNames={roomData.playerNames}
            round={cur.round}
            hasBreakerData={cur.hasBreaker}
            isFinal={cur.isFinal}
            isLastInQueue={isLast}
            onClose={advance}
            onNext={() => {
              advance();
              // 若這是隊伍中最後一個 final settlement → 結束 tournament,跳過舊版 ResultsModal
              if (isLast && cur.isFinal) {
                handleFinishTournament(true);
              }
            }}
          />
        );
      })()}
    </div>
  );
};

export default GameRoom;