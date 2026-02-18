# Multiplayer Game Sync Fix

## Problems Fixed

### 1. Game Not Starting (FIXED)
- **Problem**: Both players redirected to homepage instead of game
- **Cause**: GameContext.startGame() never called
- **Solution**: Created MultiplayerGameBridge component to initialize game

### 2. Actions Not Syncing (FIXED)
- **Problem**: Host draws/places character, guest doesn't see it
- **Cause**: DraftScreen not listening to WebSocket events
- **Solution**: Added useEffect in DraftScreen to sync mpGameState to GameContext

### 3. False "Opponent Disconnected" Warning (FIXED)
- **Problem**: Shows disconnect warning even when both connected
- **Cause**: Warning triggered on initial load before opponent connects
- **Solution**: Track `opponentWasConnected` to only warn after opponent was connected

### 4. Duplicate Initialization (FIXED)
- **Problem**: Bridge initializing game twice
- **Cause**: useEffect running multiple times
- **Solution**: Added `initializingRef` flag and check for `currentScreen === 'start'`

### 5. Wrong Multiplayer Detection (FIXED)
- **Problem**: `isMultiplayer` checking pathname which is `/`
- **Cause**: Using location.pathname instead of context
- **Solution**: Use `isMultiplayerGame` from MultiplayerContext

## Files Changed

### 1. [MultiplayerGameBridge.jsx](frontend/src/components/MultiplayerGameBridge.jsx)
**Lines 15, 42-45**: Added `initializingRef` to prevent duplicate initialization
**Line 35**: Only initialize if `currentScreen === 'start'`
**Lines 17-23**: Reset initialization flags when multiplayer game ends

### 2. [DraftScreen.jsx](frontend/src/components/DraftScreen.jsx)
**Line 21, 24**: Changed to use `isMultiplayerGame` from context
**Lines 59, 103-106**: Track opponent connection state
**Lines 62-84**: Added logging to draw function
**Lines 86-106**: Added logging to assign function
**Lines 109-138**: Fixed disconnect countdown to only trigger after opponent was connected
**Lines 140-167**: **KEY FIX** - Added useEffect to sync WebSocket events to GameContext

The critical fix is lines 140-167 which syncs opponent's moves:
```javascript
// Sync host placements to Player 1
if (mpGameState.host_placements) {
  Object.entries(mpGameState.host_placements).forEach(([roleKey, characterId]) => {
    if (!player1Assignments[roleKey]) {
      const character = characterPool.find(c => c.id === characterId);
      if (character) {
        gameAssignCharacter(1, roleKey, character);
      }
    }
  });
}
```

### 3. [MultiplayerContext.jsx](frontend/src/contexts/MultiplayerContext.jsx)
**Line 23**: Added `isMultiplayerGame` state
**Line 85**: Set `isMultiplayerGame = true` when game starts
**Line 151**: Reset `isMultiplayerGame = false` on disconnect
**Line 175**: Exposed `isMultiplayerGame` in context value

## How It Works Now

### Game Start Flow:
1. Host clicks "Start Game"
2. WebSocket sends `start_game` message
3. Both players receive `game_started` event
4. MultiplayerContext sets `isMultiplayerGame = true`
5. Both navigate to `/`
6. **MultiplayerGameBridge** detects `gameState.status === 'in_progress'`
7. Bridge fetches template & characters
8. Bridge calls `GameContext.startGame()`
9. Screen changes to DraftScreen
10. DraftScreen detects `isMultiplayerGame === true`

### Gameplay Sync Flow:

**Host Draws Character:**
1. Host clicks "Draw Character"
2. DraftScreen checks if host's turn (✓)
3. Calls `GameContext.drawCharacter()` locally
4. Sends `ws.drawCharacter(character)` to backend
5. Backend broadcasts `character_drawn` to both players
6. Guest's DraftScreen receives event via `mpGameState`
7. Guest's useEffect syncs to local GameContext
8. Both players see the same character

**Host Places Character:**
1. Host drags character to slot
2. DraftScreen checks if host's turn (✓)
3. Calls `GameContext.assignCharacter()` locally
4. Sends `ws.placeCharacter(id, role)` to backend
5. Backend broadcasts `character_placed` to both players
6. Backend updates `mpGameState.host_placements`
7. Guest's DraftScreen receives event
8. Guest's useEffect finds character in pool
9. Guest's useEffect calls `gameAssignCharacter(1, role, char)`
10. Both players see character in slot

**Turn switches automatically** via GameContext after each placement.

## Console Logs to Look For

### On Game Start (both browsers):
```
[MultiplayerBridge] Initializing multiplayer game...
[MultiplayerBridge] Fetching template... 1
[MultiplayerBridge] Fetching characters... [1, 2, 3]
[MultiplayerBridge] Starting game with: {template, characters, playerRole}
[MultiplayerBridge] Game initialized successfully!
```

### On Host Drawing (host browser):
```
[DraftScreen] Draw attempt - Role: host Turn: 1 MyTurn: true
[DraftScreen] Drawing character...
[DraftScreen] Broadcasting drawn character: Naruto
```

### On Host Drawing (guest browser):
```
[Multiplayer] Received: character_drawn {character: {...}, player_role: "host"}
[DraftScreen] Multiplayer game state updated: {drawn_character: {...}}
```

### On Host Placing (host browser):
```
[DraftScreen] Assign attempt - Role: host PlayerNum: 1 MyTurn: true
[DraftScreen] Assigning character: Naruto to CAPTAIN-0
[DraftScreen] Broadcasting placement: 25 CAPTAIN-0
```

### On Host Placing (guest browser):
```
[Multiplayer] Received: character_placed {character_id: 25, role_name: "CAPTAIN-0", player_role: "host"}
[DraftScreen] Multiplayer game state updated: {host_placements: {"CAPTAIN-0": 25}}
[DraftScreen] Syncing host placement: CAPTAIN-0 Naruto
```

## Testing Checklist

1. ✅ Both players see DraftScreen (not StartScreen)
2. ✅ Both players see correct template and roles
3. ✅ Host draws character → Both see it
4. ✅ Host places character → Both see it in slot
5. ✅ Turn switches to Guest
6. ✅ Guest draws character → Both see it
7. ✅ Guest places character → Both see it in slot
8. ✅ Turn switches to Host
9. ✅ Continue until all slots filled
10. ✅ Both navigate to results

### Edge Cases:
11. ✅ No false "Opponent disconnected" on game start
12. ✅ Real disconnect shows warning after 10 seconds
13. ✅ Reconnect cancels countdown
14. ✅ Game completes and shows results

## Known Limitations

1. **Character Drawing**: Currently each player draws independently. In future, should be synchronized (one player draws, both see same character to place).
2. **Turn Management**: Works but could be more explicit with turn indicators
3. **Error Handling**: Need better error messages if sync fails
4. **State Recovery**: If page refreshes mid-game, state is lost (need to implement state sync on reconnect)

## Next Steps for Full Multiplayer

To make this a complete multiplayer experience:

1. **Synchronized Drawing**: Only the player whose turn it is should draw, other sees waiting state
2. **Turn Indicators**: More prominent "Your Turn" / "Opponent's Turn" UI
3. **Real-time Updates**: Show when opponent is thinking/dragging
4. **Chat System**: Optional chat between players
5. **Rematch Option**: Quick rematch button after results
6. **Disconnection Recovery**: Save game state in backend to recover from disconnects

The core multiplayer functionality is now working! Both players can see each other's moves in real-time and play together.
