# Multiplayer Flow Manual Test Checklist

## Pre-requisites
- ✓ Django server running on port 8000
- ✓ Frontend dev server running on port 5173
- ✓ Redis running

## Test Flow

### 1. Host Creates Room

**Browser 1 (Normal Window)**
1. Navigate to http://localhost:5173/
2. Click on "Multiplayer" or navigate to multiplayer create page
3. Configure game settings (template, anime pool)
4. Click "Create Room"

**Expected Results:**
- ✓ Room code is displayed (6 characters)
- ✓ QR code is shown
- ✓ Join URL is displayed
- ✓ Status shows "Waiting for other player to join..."
- ✓ Connection indicator shows green "● Connected"

### 2. Guest Joins Room

**Browser 2 (Incognito/Private Window)**
1. Navigate to the join URL from step 1, OR
2. Navigate to http://localhost:5173/join/ and enter the room code
3. Enter a nickname (e.g., "Player 2")
4. Click "Join Game"

**Expected Results:**
- ✓ Success: Guest sees "Waiting Room" screen
- ✓ Room code and host nickname are displayed
- ✓ Message shows: "Waiting for host to start the game..."
- ✓ Shows "You are Player 2"
- ✓ Connection indicator shows green "● Connected"
- ✓ NO REDIRECT to homepage

### 3. Host Receives Notification

**Browser 1 (Check immediately after guest joins)**

**Expected Results:**
- ✓ Green success banner appears: "[Guest Nickname] has joined!"
- ✓ Status changes from "Waiting..." to "Ready to start the game"
- ✓ "Start Game" button becomes enabled (green)

### 4. Host Starts Game

**Browser 1**
1. Click "Start Game" button

**Expected Results:**
- ✓ Both Browser 1 and Browser 2 navigate to game page (`/`)
- ✓ Both players see the **DraftScreen** (NOT StartScreen)
- ✓ Template is loaded (correct roles/slots visible)
- ✓ Character pool is loaded from selected anime
- ✓ Host sees: "You (Host)" vs "Guest"
- ✓ Guest sees: "Host" vs "You (Guest)"
- ✓ Turn indicator shows whose turn it is

**Console Check (Browser DevTools F12):**
- ✓ Look for: `[MultiplayerBridge] Initializing multiplayer game...`
- ✓ Look for: `[MultiplayerBridge] Game initialized successfully!`
- ✓ NO errors about missing template or characters

### 5. Edge Cases to Test

#### 5.1 Guest Closes Before Game Starts
1. Complete steps 1-3
2. Browser 2: Close the tab before host starts
3. Browser 1: Wait 10 seconds

**Expected:** Host sees disconnection notification

#### 5.2 Try to Join Full Room
1. Complete steps 1-2
2. Browser 3: Try to join the same room

**Expected:** Error message "Room is full"

#### 5.3 Try to Join Invalid Room
1. Navigate to http://localhost:5173/join/INVALID
2. Try to join

**Expected:** Error message "Room not found"

## Issues Fixed

- ✓ Backend sends `player_joined` notification when guest first connects
- ✓ Guest stays in waiting room instead of redirecting to homepage
- ✓ Waiting room shows proper "waiting for host" message
- ✓ Both players redirect to game page when host starts
- ✓ Player roles are properly assigned (host = Player 1, guest = Player 2)

## Test Results

Date: _____________
Tester: _____________

- [ ] 1. Host Creates Room
- [ ] 2. Guest Joins Room
- [ ] 3. Host Receives Notification
- [ ] 4. Host Starts Game
- [ ] 5.1 Guest Disconnects
- [ ] 5.2 Full Room Rejection
- [ ] 5.3 Invalid Room Error

Notes:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
