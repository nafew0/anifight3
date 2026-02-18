# Multiplayer Navigation Debug Guide

## Issue
Game is not navigating to `/multiplayer/game/:roomCode` after host clicks "Start Game". Instead going to homepage `/`.

## Changes Made

### 1. Added Comprehensive Logging

**MultiplayerCreate.jsx**:
- Added roomCode to useEffect dependencies
- Added detailed console logs showing:
  - Game state updates
  - Current roomCode value
  - Navigation attempts
  - Success/failure indicators

**MultiplayerJoin.jsx**:
- Added detailed console logs
- Shows game state and roomCode on every change
- Logs navigation success/failure

**MultiplayerGameScreen.jsx**:
- Logs on every component render
- Shows all relevant state values
- Tracks useEffect execution
- Monitors component mount/unmount

### 2. Testing Steps

#### Test 1: Direct Route Access
1. Open http://localhost:5173/multiplayer/game/TEST123 directly in browser
2. Open DevTools Console (F12)
3. **Expected Logs**:
   ```
   [MultiplayerGameScreen] 🎮 COMPONENT RENDER { roomCodeFromURL: "TEST123", ... }
   [MultiplayerGameScreen] 🔄 useEffect triggered
   [MultiplayerGameScreen] ✅ Room code from URL: TEST123
   [MultiplayerGameScreen] 📡 Connecting to room: TEST123
   ```
4. **If you see**: `❌ No room code in URL` → Route parameter extraction is broken
5. **If you see**: ` Room code from URL: TEST123` → Route works, issue is with navigation

#### Test 2: Full Multiplayer Flow
1. **Host Browser (Normal)**:
   - Navigate to http://localhost:5173/multiplayer/create
   - Open Console (F12)
   - Note the room code displayed

2. **Guest Browser (Incognito)**:
   - Navigate to http://localhost:5173/join/ROOMCODE
   - Open Console (F12)
   - Enter nickname and click "Join Game"

3. **Host clicks "Start Game"**:
   - Watch console logs carefully
   - **Expected Sequence**:
     ```
     [MultiplayerCreate] Game state updated: {status: "in_progress", ...}
     [MultiplayerCreate] Current roomCode: ABC123
     [MultiplayerCreate] ✓ Game started, navigating to: /multiplayer/game/ABC123
     [MultiplayerGameScreen] 🎮 COMPONENT RENDER { roomCodeFromURL: "ABC123", ...}
     ```

4. **Check URL in address bar**:
   - Should change to: `http://localhost:5173/multiplayer/game/ABC123`
   - If it shows `/` instead → Navigation is being intercepted

#### Test 3: Check for Errors
Look for these in console:
- React Router errors
- "No routes matched"
- Component errors
- 404 errors
- JavaScript exceptions

### 3. Possible Issues & Solutions

#### Issue A: Route Not Registered
**Symptom**: Direct access to `/multiplayer/game/TEST123` shows 404 or redirects to home

**Check**:
```bash
grep "multiplayer/game" frontend/src/App.jsx
```

**Should show**:
```javascript
<Route path="/multiplayer/game/:roomCode" element={<MultiplayerGameScreen />} />
```

**Fix**: Route is already added at line 75 in App.jsx

#### Issue B: Navigate Called but URL Doesn't Change
**Symptom**: See log `✓ Game started, navigating to:` but URL stays at `/multiplayer/create`

**Possible Causes**:
1. React Router navigation is being blocked
2. Another component is intercepting navigation
3. Browser history is corrupted

**Fix**: Try adding `replace` option:
```javascript
navigate(`/multiplayer/game/${roomCode}`, { replace: true });
```

#### Issue C: RoomCode is Undefined
**Symptom**: See log `✗ Game started but roomCode is missing!`

**Cause**: `roomCode` state is null when game starts

**Fix**: Already added `roomCode` to dependency array - should be fixed

#### Issue D: Component Renders but Immediately Redirects
**Symptom**: See `[MultiplayerGameScreen]` logs but then immediately see homepage

**Possible Causes**:
1. `roomCode` from useParams() is undefined
2. Component unmounts immediately
3. Another redirect is triggered

**Check**: Look for `❌ No room code in URL` log

### 4. Debug Checklist

Run through these in order:

- [ ] 1. Frontend dev server is running (`npm run dev`)
- [ ] 2. Backend Django server is running
- [ ] 3. Redis is running
- [ ] 4. No JavaScript console errors
- [ ] 5. Route is registered in App.jsx (line 75)
- [ ] 6. MultiplayerGameScreen.jsx exists
- [ ] 7. Direct route access works (Test 1)
- [ ] 8. Navigate function is being called (see logs)
- [ ] 9. URL actually changes in address bar
- [ ] 10. MultiplayerGameScreen component renders

### 5. Expected Console Output (Full Flow)

#### When Host Starts Game:

```
// From MultiplayerCreate.jsx
[MultiplayerCreate] Game state updated: {
  status: "in_progress",
  template_id: 1,
  anime_pool_ids: [1,2,3]
}
[MultiplayerCreate] Current roomCode: ABC123
[MultiplayerCreate] ✓ Game started, navigating to: /multiplayer/game/ABC123

// From MultiplayerGameScreen.jsx
[MultiplayerGameScreen] 🎮 COMPONENT RENDER {
  roomCodeFromURL: "ABC123",
  connectedRoomCode: "ABC123",
  isConnected: true,
  currentScreen: "start",
  isInitializing: true
}
[MultiplayerGameScreen] 🔄 useEffect triggered - Setting up room connection
[MultiplayerGameScreen] ✅ Room code from URL: ABC123
[MultiplayerGameScreen] ✅ Already connected to this room
[MultiplayerGameScreen] ✅ Initialization complete

// From MultiplayerGameBridge.jsx
[MultiplayerBridge] Initializing multiplayer game...
[MultiplayerBridge] Fetching template... 1
[MultiplayerBridge] Fetching characters... [1,2,3,4,5]
[MultiplayerBridge] Starting game with: {...}
[MultiplayerBridge] Game initialized successfully!

// From DraftScreen.jsx
[DraftScreen] Draw attempt - Role: host Turn: 1 MyTurn: true
```

### 6. Quick Fixes to Try

If navigation still doesn't work, try these in order:

#### Fix 1: Hard Refresh
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

#### Fix 2: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click refresh button
3. Click "Empty Cache and Hard Reload"

#### Fix 3: Check React Router Version
```bash
cd frontend
npm list react-router-dom
```
Should be v6.x

#### Fix 4: Test with window.location
Temporarily replace navigate with direct assignment:
```javascript
// In MultiplayerCreate.jsx, line 101
window.location.href = `/multiplayer/game/${roomCode}`;
```

This will force navigation (page reload). If this works, it's a React Router issue.

### 7. Report Back

When testing, please share:

1. **Console logs**: Copy all logs starting from "Game started, navigating to:"
2. **URL in address bar**: What does it show after clicking "Start Game"?
3. **Test 1 result**: Does direct access to `/multiplayer/game/TEST123` work?
4. **Any errors**: JavaScript errors, React errors, network errors

This will help identify the exact issue!
