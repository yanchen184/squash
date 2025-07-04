// Home page component - room creation and joining
import React, { useState, useEffect } from 'react';
import { subscribeToActiveRooms } from '../services/database';
import RoomCreator from './RoomCreator';
import Settings from './Settings';

const Home = ({ onJoinRoom }) => {
  const [activeRooms, setActiveRooms] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoomCreator, setShowRoomCreator] = useState(false);

  useEffect(() => {
    // Subscribe to active rooms
    const unsubscribe = subscribeToActiveRooms((rooms) => {
      setActiveRooms(rooms.filter(room => room.status === 'waiting' || room.status === 'playing'));
    });

    return unsubscribe;
  }, []);

  const handleRoomCreated = (roomCode) => {
    setShowRoomCreator(false);
    onJoinRoom(roomCode);
  };

  return (
    <div className="home-container">
      <header className="app-header">
        <h1>計分賽程競技系統</h1>
        <div className="version-info">v1.0.2</div>
        <button 
          className="settings-btn"
          onClick={() => setShowSettings(true)}
          title="系統設定"
        >
          ⚙️
        </button>
      </header>

      <main className="home-content">
        <div className="action-buttons">
          <button 
            className="primary-btn"
            onClick={() => setShowRoomCreator(true)}
          >
            創建房間
          </button>
        </div>

        <div className="rooms-section">
          <h2>可加入的房間</h2>
          <div className="rooms-list">
            {activeRooms.length === 0 ? (
              <p className="no-rooms">目前沒有可加入的房間</p>
            ) : (
              activeRooms.map(room => (
                <div key={room.code} className="room-card">
                  <div className="room-info">
                    <div className="room-code">{room.code}</div>
                    <div className="room-status">
                      狀態: {room.status === 'waiting' ? '等待中' : '進行中'}
                    </div>
                    <div className="room-details">
                      4人競技房間 - 固定順序賽制
                    </div>
                  </div>
                  <button 
                    className="join-btn"
                    onClick={() => onJoinRoom(room.code)}
                  >
                    加入
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {showRoomCreator && (
        <RoomCreator 
          onClose={() => setShowRoomCreator(false)}
          onRoomCreated={handleRoomCreated}
        />
      )}

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default Home;