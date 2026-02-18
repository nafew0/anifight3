# Multiplayer Game Start Fix

## Problem

When the host started a multiplayer game, both players were redirected to the homepage (StartScreen) instead of the actual game (DraftScreen) with the configured template and anime pool.

## Root Cause

The navigation was happening (`navigate('/')`) but the **GameContext wasn't being initialized** with the game data. The flow was:

1. Host clicks "Start Game"
2. WebSocket sends `game_started` event with `template_id` and `anime_pool_ids`
3. Both players navigate to `/`
4. They land on StartScreen (default screen in GameContext)
5. **Game never actually starts because `GameContext.startGame()` was never called**

## Solution

Created a **bridge component** ([MultiplayerGameBridge.jsx](frontend/src/components/MultiplayerGameBridge.jsx)) that:

1. Watches `MultiplayerContext.gameState` for changes
2. When `gameState.status === 'in_progress'`:
   - Fetches the template data from API
   - Fetches the character pool from API
   - Calls `GameContext.startGame()` with all the data
   - This transitions to the DraftScreen

### Files Changed

#### 1. [MultiplayerGameBridge.jsx](frontend/src/components/MultiplayerGameBridge.jsx) (NEW)
- Bridge component that connects MultiplayerContext with GameContext
- Initializes the game when multiplayer game starts
- Fetches template and character data
- Sets proper player names based on role

#### 2. [App.jsx](frontend/src/App.jsx#L30)
- Added `MultiplayerGameBridge` component to `GameFlow`
- Runs on every page load to check if multiplayer game needs initialization

#### 3. [MultiplayerContext.jsx](frontend/src/contexts/MultiplayerContext.jsx)
- Added `isMultiplayerGame` flag to track if current game is multiplayer
- Set to `true` when `game_started` event received
- Reset to `false` on disconnect
- Exposed in context value for other components to use

## Flow After Fix

### Host Side:
1. Create room with template & anime pool
2. Wait for guest
3. Click "Start Game"
4. WebSocket sends `start_game` message
5. Receive `game_started` event
6. Navigate to `/`
7. **MultiplayerGameBridge** detects game starting
8. Fetches template & characters
9. Calls `GameContext.startGame()`
10. **Transitions to DraftScreen** with proper game state

### Guest Side:
1. Join room, see waiting room
2. Receive `game_started` event
3. Navigate to `/`
4. **MultiplayerGameBridge** detects game starting
5. Fetches template & characters
6. Calls `GameContext.startGame()`
7. **Transitions to DraftScreen** with proper game state

## Player Roles

The bridge component sets player names based on role:
- **Host (Player 1)**: "You (Host)" vs "Guest"
- **Guest (Player 2)**: "Host" vs "You (Guest)"

This makes it clear which side each player controls.

## Testing

To test the complete flow:

1. **Terminal 1**: Start Django + Daphne + Redis
2. **Terminal 2**: Start frontend dev server
3. **Browser 1** (normal): Create room
4. **Browser 2** (incognito): Join with room code
5. **Browser 1**: Click "Start Game"
6. **Expected**: Both browsers show DraftScreen with the selected template and anime

Both players should see:
- The correct template (e.g., "Draft a Team")
- The correct roles/slots
- Character pool from selected anime
- Proper player names showing their role

## Next Steps

The game initialization now works! Next steps for full multiplayer gameplay:

1. **Turn Management**: Sync whose turn it is
2. **Character Drawing**: When one player draws, other sees it
3. **Character Placement**: Sync placements between players
4. **Game Completion**: Navigate both to results when done

These are already partially implemented in the WebSocket handlers, they just need to be integrated with the DraftScreen.

## Key Architectural Pattern

This fix demonstrates the **Bridge Pattern** for connecting two independent contexts:

```
MultiplayerContext (WebSocket events)
         ↓
MultiplayerGameBridge (translator)
         ↓
GameContext (game state & logic)
```

The bridge watches one context and triggers actions in another, keeping them decoupled while enabling communication.
