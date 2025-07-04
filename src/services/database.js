// Database service for Firebase operations
import { database } from './firebase';
import { ref, set, get, onValue, push, serverTimestamp, off } from 'firebase/database';

// Room operations
export const createRoom = async (roomCode, hostName) => {
  // Get system settings first
  const settings = await getSystemSettings();
  const roomRef = ref(database, `rooms/${roomCode}`);
  const roomData = {
    code: roomCode,
    host: hostName,
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
  const roomRef = ref(database, `rooms/${roomCode}`);
  
  // Create match result object
  const matchResult = {
    index: matchIndex,
    winner: winner,
    timestamp: Date.now() // Use client timestamp for better sync
  };
  
  // Get current room data
  const roomSnapshot = await get(roomRef);
  if (!roomSnapshot.exists()) return;
  
  const roomData = roomSnapshot.val();
  const updatedMatches = [...(roomData.matches || [])];
  const updatedScores = { ...(roomData.scores || { A: 0, B: 0, C: 0, D: 0 }) };
  
  // Add match result
  updatedMatches[matchIndex] = matchResult;
  
  // Recalculate scores from all matches
  const recalculatedScores = { A: 0, B: 0, C: 0, D: 0 };
  updatedMatches.forEach(match => {
    if (match && match.winner) {
      recalculatedScores[match.winner] += 1;
    }
  });
  
  // Update room data
  const updates = {
    [`rooms/${roomCode}/matches`]: updatedMatches,
    [`rooms/${roomCode}/scores`]: recalculatedScores,
    [`rooms/${roomCode}/currentMatch`]: matchIndex + 1,
    [`rooms/${roomCode}/lastUpdated`]: Date.now()
  };
  
  await set(ref(database), updates);
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
    [`rooms/${roomCode}/matches`]: updatedMatches,
    [`rooms/${roomCode}/scores`]: recalculatedScores,
    [`rooms/${roomCode}/currentMatch`]: newCurrentMatch,
    [`rooms/${roomCode}/lastUpdated`]: Date.now()
  };
  
  await set(ref(database), updates);
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
  const statusRef = ref(database, `rooms/${roomCode}/status`);
  await set(statusRef, 'finished');
};

// Get/Set system settings
export const getSystemSettings = async () => {
  const settingsRef = ref(database, 'settings');
  const snapshot = await get(settingsRef);
  return snapshot.exists() ? snapshot.val() : {
    defaultPlayerNames: {
      A: '玩家 A',
      B: '玩家 B',
      C: '玩家 C', 
      D: '玩家 D'
    }
  };
};

export const updateSystemSettings = async (settings) => {
  const settingsRef = ref(database, 'settings');
  await set(settingsRef, settings);
};