// Room creator component
import React, { useState } from 'react';
import { createRoom } from '../services/database';
import { generateRoomCode } from '../utils/gameLogic';

const RoomCreator = ({ onClose, onRoomCreated }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');

    try {
      const roomCode = generateRoomCode();
      await createRoom(roomCode, 'Host');
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