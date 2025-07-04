// Settings component for system configuration
import React, { useState, useEffect } from 'react';
import { getSystemSettings, updateSystemSettings } from '../services/database';

const Settings = ({ onClose }) => {
  const [settings, setSettings] = useState({
    defaultPlayerNames: {
      A: '玩家 A',
      B: '玩家 B',
      C: '玩家 C',
      D: '玩家 D'
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const systemSettings = await getSystemSettings();
      setSettings(systemSettings);
    } catch (err) {
      setError('載入設定失敗');
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerNameChange = (player, name) => {
    setSettings(prev => ({
      ...prev,
      defaultPlayerNames: {
        ...prev.defaultPlayerNames,
        [player]: name
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      await updateSystemSettings(settings);
      setSuccessMessage('設定已保存');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError('保存設定失敗');
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading">載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>系統設定</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="settings-section">
            <h3>預設玩家名稱</h3>
            <div className="settings-description">
              <p>設定的預設名稱會應用於新創建的房間</p>
            </div>
            <div className="player-names-grid">
              {Object.entries(settings.defaultPlayerNames).map(([player, name]) => (
                <div key={player} className="input-group">
                  <label htmlFor={`player-${player}`}>玩家 {player}:</label>
                  <input
                    id={`player-${player}`}
                    type="text"
                    value={name}
                    onChange={(e) => handlePlayerNameChange(player, e.target.value)}
                    placeholder={`玩家 ${player}`}
                    maxLength={20}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={isSaving}
          >
            取消
          </button>
          <button 
            className="primary-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存設定'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;