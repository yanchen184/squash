// Main App component - routing setup
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import GameRoom from './components/GameRoom';
import './App.css';

// Wrapper: adapts router params/navigation into GameRoom's existing props,
// so GameRoom's internals stay untouched.
function GameRoomRoute() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  return (
    <GameRoom
      roomCode={roomCode}
      onLeaveRoom={() => navigate('/')}
    />
  );
}

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomCode" element={<GameRoomRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
