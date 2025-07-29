// Database service for Firebase operations
import { database } from './firebase';
import { ref, set, get, onValue, serverTimestamp, off, update } from 'firebase/database';

// Room operations
export const createRoom = async (roomCode, hostName, roomName = '') => {
  // Get system settings first
  const settings = await getSystemSettings();
  const roomRef = ref(database, `rooms/${roomCode}`);
  
  // Generate room name if not provided
  const finalRoomName = roomName.trim() || new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' 的比賽';
  
  const roomData = {
    code: roomCode,
    host: hostName,
    roomName: finalRoomName,
    status: 'waiting', // waiting, playing, finished
    createdAt: serverTimestamp(),
    currentMatch: 0,
    playerNames: {
      A: settings.defaultPlayerNames.A,
      B: settings.defaultPlayerNames.B, 
      C: settings.defaultPlayerNames.C,
      D: settings.defaultPlayerNames.D
    },
    matches: [],
    scores: {
      A: 0,
      B: 0,
      C: 0,
      D: 0
    }
  };
  
  await set(roomRef, roomData);
  return roomData;
};

// Get room data
export const getRoom = async (roomCode) => {
  const roomRef = ref(database, `rooms/${roomCode}`);
  const snapshot = await get(roomRef);
  return snapshot.exists() ? snapshot.val() : null;
};

// Listen to room changes
export const subscribeToRoom = (roomCode, callback) => {
  const roomRef = ref(database, `rooms/${roomCode}`);
  onValue(roomRef, (snapshot) => {
    const data = snapshot.exists() ? snapshot.val() : null;
    callback(data);
  });
  
  return () => off(roomRef);
};

// Update room status
export const updateRoomStatus = async (roomCode, status) => {
  const statusRef = ref(database, `rooms/${roomCode}/status`);
  await set(statusRef, status);
};

// Record match result
export const recordMatchResult = async (roomCode, matchIndex, winner) => {
  console.log('recordMatchResult called:', { roomCode, matchIndex, winner });
  const roomRef = ref(database, `rooms/${roomCode}`);
  
  // Create match result object
  const matchResult = {
    index: matchIndex,
    winner: winner,
    timestamp: Date.now() // Use client timestamp for better sync
  };
  
  // Get current room data
  const roomSnapshot = await get(roomRef);
  if (!roomSnapshot.exists()) {
    console.error('Room does not exist:', roomCode);
    return;
  }
  
  const roomData = roomSnapshot.val();
  console.log('Current room data:', roomData);
  const updatedMatches = [...(roomData.matches || [])];
  
  // Add match result
  updatedMatches[matchIndex] = matchResult;
  console.log('Updated matches:', updatedMatches);
  
  // Recalculate scores from all matches
  const recalculatedScores = { A: 0, B: 0, C: 0, D: 0 };
  updatedMatches.forEach(match => {
    if (match && match.winner) {
      recalculatedScores[match.winner] += 1;
    }
  });
  console.log('Recalculated scores:', recalculatedScores);
  
  // Update room data
  const updates = {
    [`matches`]: updatedMatches,
    [`scores`]: recalculatedScores,
    [`currentMatch`]: matchIndex + 1,
    [`lastUpdated`]: Date.now()
  };
  
  console.log('Updating room with:', updates);
  await update(roomRef, updates);
  console.log('Room update completed');
};

// Undo last match result
export const undoLastMatch = async (roomCode) => {
  const roomRef = ref(database, `rooms/${roomCode}`);
  
  // Get current room data
  const roomSnapshot = await get(roomRef);
  if (!roomSnapshot.exists()) return false;
  
  const roomData = roomSnapshot.val();
  const matches = roomData.matches || [];
  
  // Find the last non-empty match
  let lastMatchIndex = -1;
  for (let i = matches.length - 1; i >= 0; i--) {
    if (matches[i] && matches[i].winner) {
      lastMatchIndex = i;
      break;
    }
  }
  
  // If no matches to undo
  if (lastMatchIndex === -1) {
    return false;
  }
  
  // Remove the last match
  const updatedMatches = [...matches];
  updatedMatches[lastMatchIndex] = null;
  
  // Recalculate scores from remaining matches
  const recalculatedScores = { A: 0, B: 0, C: 0, D: 0 };
  updatedMatches.forEach(match => {
    if (match && match.winner) {
      recalculatedScores[match.winner] += 1;
    }
  });
  
  // Calculate new current match index
  const newCurrentMatch = lastMatchIndex;
  
  // Update room data
  const updates = {
    [`matches`]: updatedMatches,
    [`scores`]: recalculatedScores,
    [`currentMatch`]: newCurrentMatch,
    [`lastUpdated`]: Date.now()
  };
  
  await update(roomRef, updates);
  return true;
};

// Update player names
export const updatePlayerNames = async (roomCode, playerNames) => {
  const playerNamesRef = ref(database, `rooms/${roomCode}/playerNames`);
  await set(playerNamesRef, playerNames);
};

// Get all active rooms
export const subscribeToActiveRooms = (callback) => {
  const roomsRef = ref(database, 'rooms');
  onValue(roomsRef, (snapshot) => {
    const rooms = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(roomCode => {
        const room = data[roomCode];
        // Only include rooms that are less than 24 hours old
        if (room.createdAt && Date.now() - room.createdAt < 24 * 60 * 60 * 1000) {
          rooms.push({
            code: roomCode,
            ...room
          });
        }
      });
    }
    callback(rooms);
  });
  
  return () => off(roomsRef);
};

// Finish tournament
export const finishTournament = async (roomCode) => {
  const roomRef = ref(database, `rooms/${roomCode}`);
  
  // Get current room data to save history
  const roomSnapshot = await get(roomRef);
  if (!roomSnapshot.exists()) return;
  
  const roomData = roomSnapshot.val();
  
  // Create history record
  const historyRecord = {
    roomId: roomCode,
    roomName: roomData.roomName || (roomData.host ? `${roomData.host}的房間` : '競賽房間'),
    players: roomData.playerNames || {
      A: '玩家 A', B: '玩家 B', C: '玩家 C', D: '玩家 D'
    },
    finalScores: roomData.scores || { A: 0, B: 0, C: 0, D: 0 },
    matches: roomData.matches || [],
    gameStartTime: roomData.createdAt,
    gameEndTime: Date.now(),
    totalRounds: Math.ceil((roomData.currentMatch || 0) / 6),
    version: 'v1.7.0'
  };
  
  // Save to history collection
  const historyRef = ref(database, `history/${roomCode}_${Date.now()}`);
  await set(historyRef, historyRecord);
  
  // Update room status
  const statusRef = ref(database, `rooms/${roomCode}/status`);
  await set(statusRef, 'finished');
};

// Get/Set system settings
export const getSystemSettings = async () => {
  const settingsRef = ref(database, 'settings');
  const snapshot = await get(settingsRef);
  return snapshot.exists() ? snapshot.val() : {
    defaultPlayerNames: {
      A: 'white',
      B: 'bob',
      C: 'jimmy', 
      D: 'dada'
    }
  };
};

export const updateSystemSettings = async (settings) => {
  const settingsRef = ref(database, 'settings');
  await set(settingsRef, settings);
};

// History operations
export const getGameHistory = async (roomCode) => {
  const historyRef = ref(database, 'history');
  const snapshot = await get(historyRef);
  
  if (!snapshot.exists()) return null;
  
  const allHistory = snapshot.val();
  const roomHistory = Object.entries(allHistory)
    .filter(([key, value]) => key.startsWith(roomCode))
    .map(([key, value]) => ({ id: key, ...value }))
    .sort((a, b) => b.gameEndTime - a.gameEndTime);
  
  return roomHistory.length > 0 ? roomHistory[0] : null;
};

export const getAllHistory = async () => {
  const historyRef = ref(database, 'history');
  const snapshot = await get(historyRef);
  
  if (!snapshot.exists()) return [];
  
  const allHistory = snapshot.val();
  return Object.entries(allHistory)
    .map(([key, value]) => ({ id: key, ...value }))
    .sort((a, b) => b.gameEndTime - a.gameEndTime);
};

export const deleteOldHistory = async (daysOld = 30) => {
  const historyRef = ref(database, 'history');
  const snapshot = await get(historyRef);
  
  if (!snapshot.exists()) return;
  
  const allHistory = snapshot.val();
  const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  
  const updates = {};
  Object.entries(allHistory).forEach(([key, value]) => {
    if (value.gameEndTime < cutoffTime) {
      updates[key] = null; // Delete old records
    }
  });
  
  if (Object.keys(updates).length > 0) {
    await update(historyRef, updates);
  }
};