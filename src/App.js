// Main App component
import React, { useState } from 'react';
import Home from './components/Home';
import GameRoom from './components/GameRoom';
import './App.css';

function App() {
  const [currentRoom, setCurrentRoom] = useState(null);

  const handleJoinRoom = (roomCode) => {
    setCurrentRoom(roomCode);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  return (
    <div className="App">
      {currentRoom ? (
        <GameRoom 
          roomCode={currentRoom} 
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <Home onJoinRoom={handleJoinRoom} />
      )}
    </div>
  );
}

export default App;