#!/bin/bash

# Test multiplayer navigation flow
echo "=========================================="
echo "Multiplayer Navigation Debug Test"
echo "=========================================="
echo ""

# Check if frontend is running
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "❌ Frontend not running on port 5173"
    exit 1
fi

echo "✓ Frontend is running"
echo ""

# Check if the route exists in the build
echo "Checking if MultiplayerGameScreen route exists..."
if grep -q "multiplayer/game" "/Users/nafew/Documents/Web Projects/AniFight/frontend/src/App.jsx"; then
    echo "✓ Route '/multiplayer/game/:roomCode' found in App.jsx"
else
    echo "❌ Route not found in App.jsx"
    exit 1
fi

# Check if component exists
if [ -f "/Users/nafew/Documents/Web Projects/AniFight/frontend/src/pages/MultiplayerGameScreen.jsx" ]; then
    echo "✓ MultiplayerGameScreen.jsx component exists"
else
    echo "❌ MultiplayerGameScreen.jsx component not found"
    exit 1
fi

echo ""
echo "=========================================="
echo "Manual Testing Steps:"
echo "=========================================="
echo ""
echo "1. Open browser DevTools (F12) and go to Console tab"
echo ""
echo "2. Create a room as host:"
echo "   - Navigate to http://localhost:5173/multiplayer/create"
echo "   - Wait for room to be created"
echo "   - Note the room code"
echo ""
echo "3. Join as guest (incognito window):"
echo "   - Navigate to http://localhost:5173/join/ROOMCODE"
echo "   - Enter nickname and click 'Join Game'"
echo ""
echo "4. Start game as host:"
echo "   - Click 'Start Game' button"
echo ""
echo "5. Check console logs for navigation:"
echo "   Look for these logs:"
echo "   - '[MultiplayerCreate] ✓ Game started, navigating to: /multiplayer/game/ROOMCODE'"
echo "   - '[MultiplayerJoin] ✓ Game started, navigating to: /multiplayer/game/ROOMCODE'"
echo ""
echo "6. Check URL in browser:"
echo "   - Should change to: http://localhost:5173/multiplayer/game/ROOMCODE"
echo "   - If it goes to http://localhost:5173/ instead, navigation failed"
echo ""
echo "7. If navigation fails, check for errors:"
echo "   - React Router errors"
echo "   - 404 errors"
echo "   - Component mount errors"
echo ""
echo "=========================================="
