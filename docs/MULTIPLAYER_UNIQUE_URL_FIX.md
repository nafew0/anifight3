# Multiplayer Unique URL Implementation

## Problem Statement

After a multiplayer game ended, clicking "Play Again" would redirect to a finished game state. Even when creating a new room with a new ID, the host would still see the old finished game while the guest would see a new game waiting for the host.

**Root Cause**: All multiplayer games were navigating to the same URL (`/`), causing state confusion between different games.

## Solution

Implemented **unique URLs for each multiplayer game** using the room code: `/multiplayer/game/{roomCode}`

This ensures:
1. Each game has its own isolated URL
2. Reloading the page maintains the correct game
3. New games don't conflict with old games
4. Navigating away properly cleans up state

## Changes Made

### 1. Created New Route `/multiplayer/game/:roomCode`

**File**: [App.jsx](frontend/src/App.jsx#L75)
```javascript
<Route path="/multiplayer/game/:roomCode" element={<MultiplayerGameScreen />} />
```

### 2. Created MultiplayerGameScreen Component (NEW)

**File**: [MultiplayerGameScreen.jsx](frontend/src/pages/MultiplayerGameScreen.jsx)

This component:
- Extracts `roomCode` from URL params
- Connects to WebSocket with that room code
- Handles switching between rooms (disconnect from old, connect to new)
- Properly cleans up on unmount (disconnect + resetGame)
- Shows loading state while connecting
- Renders game flow (StartScreen → DraftScreen → ResultScreen)
- Includes MultiplayerGameBridge for game initialization

**Key Features**:
```javascript
// Extract room code from URL
const { roomCode } = useParams();

// Connect to room
useEffect(() => {
  if (connectedRoomCode && connectedRoomCode !== roomCode) {
    disconnect(); // Disconnect from old room
  }
  connect(roomCode); // Connect to new room

  return () => {
    disconnect();
    resetGame();
  };
}, [roomCode]);
```

### 3. Updated Navigation in MultiplayerCreate

**File**: [MultiplayerCreate.jsx](frontend/src/pages/MultiplayerCreate.jsx#L98-100)

**Before**:
```javascript
if (gameState.status === 'in_progress') {
  navigate('/', { state: { isMultiplayer: true } });
}
```

**After**:
```javascript
if (gameState.status === 'in_progress' && roomCode) {
  navigate(`/multiplayer/game/${roomCode}`);
}
```

### 4. Updated Navigation in MultiplayerJoin

**File**: [MultiplayerJoin.jsx](frontend/src/pages/MultiplayerJoin.jsx#L60-63)

**Before**:
```javascript
if (gameState && gameState.status === 'in_progress') {
  navigate('/', { state: { isMultiplayer: true } });
}
```

**After**:
```javascript
if (gameState && gameState.status === 'in_progress' && roomCode) {
  navigate(`/multiplayer/game/${roomCode}`);
}
```

### 5. Updated GameFlow Component

**File**: [App.jsx](frontend/src/App.jsx#L24-38)

Removed `MultiplayerGameBridge` from GameFlow since it's now only in MultiplayerGameScreen. This keeps single-player and multiplayer completely separate.

### 6. Updated ResultScreen Buttons

**File**: [ResultScreen.jsx](frontend/src/components/ResultScreen.jsx)

Added multiplayer-aware button handlers:

**Play Again Button**:
- **Multiplayer (Host)**: Disconnect → Reset → Navigate to `/multiplayer/create` (create new room)
- **Multiplayer (Guest)**: Disconnect → Reset → Navigate to `/` (homepage)
- **Single Player**: Just replay with same settings

**Button Labels**:
- Multiplayer Host: "New Room"
- Multiplayer Guest: "Exit"
- Single Player: "Play Again"

```javascript
const handlePlayAgain = () => {
  if (isMultiplayerGame) {
    disconnect();
    resetGame();
    if (playerRole === 'host') {
      navigate('/multiplayer/create');
    } else {
      navigate('/');
    }
  } else {
    playAgain();
  }
};
```

## URL Structure

### Before (Broken)
```
All games: /
```
- Problem: All multiplayer games shared same URL
- State confusion between games
- Couldn't distinguish between different rooms

### After (Fixed)
```
Single Player: /
Create Room: /multiplayer/create
Join Room: /join/:roomCode
Game Room 1: /multiplayer/game/ABC123
Game Room 2: /multiplayer/game/XYZ789
```
- Each room has unique URL
- State is properly isolated
- Can reload without losing game
- Multiple tabs can have different games

## Flow Examples

### Host Creates New Game After Previous Game
1. Previous game ends at `/multiplayer/game/ABC123`
2. Host clicks "New Room" button
3. Disconnects from `ABC123`
4. Resets game state
5. Navigates to `/multiplayer/create`
6. Creates new room → Gets code `XYZ789`
7. Guest joins
8. Host starts game
9. **Navigates to `/multiplayer/game/XYZ789`** (completely new URL)
10. Game initializes fresh with no old state

### Guest Joins Mid-Way Through Another Game
1. Guest was playing in room `ABC123`
2. Gets invite link for room `XYZ789`
3. Navigates to `/join/XYZ789`
4. Clicks "Join Game"
5. **Navigates to `/multiplayer/game/XYZ789`**
6. MultiplayerGameScreen detects room change
7. Disconnects from `ABC123`
8. Connects to `XYZ789`
9. Fresh game starts

### Browser Reload Mid-Game
1. Playing game at `/multiplayer/game/ABC123`
2. User hits F5 (reload)
3. MultiplayerGameScreen extracts `ABC123` from URL
4. Reconnects to room `ABC123`
5. Game state syncs from backend
6. Game continues where it left off

## Benefits

### 1. State Isolation ✓
- Each game has its own URL and state
- No interference between different games
- Clean separation of concerns

### 2. URL Persistence ✓
- Can bookmark game URLs
- Browser back/forward works correctly
- Reload maintains game state

### 3. Clean Transitions ✓
- Proper disconnect when leaving a game
- State reset between games
- No ghost state from previous games

### 4. Debug-Friendly ✓
- URL shows which room you're in
- Easy to identify which game in logs
- Can test multiple games in different tabs

### 5. Proper Cleanup ✓
- Unmounting component disconnects WebSocket
- Game state resets when appropriate
- No memory leaks from old connections

## Testing Checklist

### Basic Flow
- [ ] Host creates room → URL is `/multiplayer/create`
- [ ] Guest joins → URL is `/join/ABC123`
- [ ] Game starts → **Both navigate to `/multiplayer/game/ABC123`**
- [ ] Game plays normally
- [ ] Game ends → Still at `/multiplayer/game/ABC123`
- [ ] Host clicks "New Room" → Navigate to `/multiplayer/create`
- [ ] Creates new room → Get new code `XYZ789`
- [ ] Game starts → **Navigate to `/multiplayer/game/XYZ789`** (different URL)
- [ ] No old game state visible

### Edge Cases
- [ ] Reload mid-game → Reconnects to correct room
- [ ] Navigate away and back → Proper cleanup and reconnect
- [ ] Multiple browser tabs with different games → Each works independently
- [ ] Guest leaves and rejoins → Connects to correct room
- [ ] Invalid room code in URL → Redirects to homepage

### State Cleanup
- [ ] Game 1 ends, Game 2 starts → No Game 1 state in Game 2
- [ ] Disconnect properly clears multiplayer state
- [ ] Reset game clears game context
- [ ] New room creation works after previous game

## Files Modified

1. **[App.jsx](frontend/src/App.jsx)** - Added route, removed bridge from GameFlow
2. **[MultiplayerGameScreen.jsx](frontend/src/pages/MultiplayerGameScreen.jsx)** - NEW component
3. **[MultiplayerCreate.jsx](frontend/src/pages/MultiplayerCreate.jsx)** - Updated navigation
4. **[MultiplayerJoin.jsx](frontend/src/pages/MultiplayerJoin.jsx)** - Updated navigation
5. **[ResultScreen.jsx](frontend/src/components/ResultScreen.jsx)** - Updated button handlers

## Architecture Pattern

This implements the **Resource-Based URL** pattern:

```
/multiplayer/game/:roomCode
         ↓
    Resource ID
         ↓
  Unique Game Instance
         ↓
  Isolated State
```

Each resource (game room) gets its own URL, making the app more RESTful and state management cleaner.

## Next Steps (Optional Enhancements)

1. **Room History**: Track recently played rooms
2. **Rejoin Button**: Quick rejoin to last room after disconnect
3. **Spectator Mode**: `/multiplayer/watch/:roomCode` for observers
4. **Room Validation**: Check if room exists before connecting
5. **State Recovery**: Persist more state in backend for full recovery on reload

## Summary

The unique URL implementation solves the state confusion problem by giving each multiplayer game its own isolated URL space. This ensures clean transitions between games, proper state cleanup, and a better overall user experience. The room code in the URL serves as both an identifier and a source of truth for which game you're in.
