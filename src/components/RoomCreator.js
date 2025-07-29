// Room creator component
import React, { useState } from 'react';
import { createRoom, updatePlayerNames } from '../services/database';
import { generateRoomCode } from '../utils/gameLogic';

const RoomCreator = ({ onClose, onRoomCreated }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [playerNames, setPlayerNames] = useState({
    A: '',
    B: '',
    C: '',
    D: ''
  });

  const handlePlayerNameChange = (position, name) => {
    if (name.length <= 8) {
      setPlayerNames(prev => ({
        ...prev,
        [position]: name
      }));
    }
  };


  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');

    try {
      const roomCode = generateRoomCode();
      await createRoom(roomCode, 'Host');
      
      // Update player names if any were provided
      const finalPlayerNames = {
        A: playerNames.A || 'white', 
        B: playerNames.B || 'bob',
        C: playerNames.C || 'jimmy',
        D: playerNames.D || 'dada'
      };
      
      await updatePlayerNames(roomCode, finalPlayerNames);
      onRoomCreated(roomCode);
    } catch (err) {
      setError('創建房間失敗，請重試');
      console.error('Error creating room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>創建房間</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="create-room-info">
            <p>將創建一個新的 4 人壁球競賽房間</p>
            <p>特殊規則：第1-2場固定，第3場贏家組對戰，第4場輸家組對戰</p>
          </div>

          <div className="player-names-section">
            <h3>設定玩家名字 (選填)</h3>
            <div className="player-inputs">
              <div className="player-input-group">
                <label>位置 A:</label>
                <input
                  type="text"
                  value={playerNames.A}
                  onChange={(e) => handlePlayerNameChange('A', e.target.value)}
                  placeholder="white"
                  maxLength="8"
                  disabled={isCreating}
                />
              </div>
              <div className="player-input-group">
                <label>位置 B:</label>
                <input
                  type="text"
                  value={playerNames.B}
                  onChange={(e) => handlePlayerNameChange('B', e.target.value)}
                  placeholder="bob"
                  maxLength="8"
                  disabled={isCreating}
                />
              </div>
              <div className="player-input-group">
                <label>位置 C:</label>
                <input
                  type="text"
                  value={playerNames.C}
                  onChange={(e) => handlePlayerNameChange('C', e.target.value)}
                  placeholder="jimmy"
                  maxLength="8"
                  disabled={isCreating}
                />
              </div>
              <div className="player-input-group">
                <label>位置 D:</label>
                <input
                  type="text"
                  value={playerNames.D}
                  onChange={(e) => handlePlayerNameChange('D', e.target.value)}
                  placeholder="dada"
                  maxLength="8"
                  disabled={isCreating}
                />
              </div>
            </div>
            <div className="input-hint">
              * 留空將使用預設名字，最多 8 個字符
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={isCreating}
          >
            取消
          </button>
          <button 
            className="primary-btn"
            onClick={handleCreateRoom}
            disabled={isCreating}
          >
            {isCreating ? '創建中...' : '創建房間'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomCreator;