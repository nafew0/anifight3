#!/bin/bash

# Test script for multiplayer room join and game start flow
# This tests the complete flow: create room → join room → start game

BASE_URL="http://localhost:8000"
API_URL="${BASE_URL}/api/multiplayer/rooms"

echo "================================"
echo "Multiplayer Flow Test"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Step 1: Create a room (as host)
echo -e "${YELLOW}Step 1: Creating room as host...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/create_room/" \
    -H "Content-Type: application/json" \
    -c /tmp/host_cookies.txt \
    -d '{
        "host_nickname": "TestHost",
        "template_id": 1,
        "anime_pool_ids": [1, 2, 3, 4, 5]
    }')

ROOM_CODE=$(echo $CREATE_RESPONSE | grep -o '"room_code":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ROOM_CODE" ]; then
    echo -e "${RED}Failed to create room${NC}"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

print_result 0 "Room created with code: $ROOM_CODE"
echo ""

# Step 2: Check room status
echo -e "${YELLOW}Step 2: Checking room status...${NC}"
ROOM_STATUS=$(curl -s "${API_URL}/${ROOM_CODE}/room_status/")
STATUS=$(echo $ROOM_STATUS | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$STATUS" != "waiting" ]; then
    echo -e "${RED}Expected status 'waiting', got '$STATUS'${NC}"
    exit 1
fi

print_result 0 "Room status is 'waiting'"
echo ""

# Step 3: Join room as guest
echo -e "${YELLOW}Step 3: Joining room as guest...${NC}"
JOIN_RESPONSE=$(curl -s -X POST "${API_URL}/${ROOM_CODE}/join_room/" \
    -H "Content-Type: application/json" \
    -c /tmp/guest_cookies.txt \
    -d '{
        "guest_nickname": "TestGuest"
    }')

JOIN_STATUS=$(echo $JOIN_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$JOIN_STATUS" != "ready" ]; then
    echo -e "${RED}Expected status 'ready' after join, got '$JOIN_STATUS'${NC}"
    echo "Response: $JOIN_RESPONSE"
    exit 1
fi

print_result 0 "Guest joined successfully, room status is 'ready'"
echo ""

# Step 4: Verify room has both players
echo -e "${YELLOW}Step 4: Verifying room has both players...${NC}"
ROOM_STATUS=$(curl -s "${API_URL}/${ROOM_CODE}/room_status/")

HOST_NICK=$(echo $ROOM_STATUS | grep -o '"host_nickname":"[^"]*"' | cut -d'"' -f4)
GUEST_NICK=$(echo $ROOM_STATUS | grep -o '"guest_nickname":"[^"]*"' | cut -d'"' -f4)

if [ "$HOST_NICK" != "TestHost" ]; then
    echo -e "${RED}Host nickname mismatch${NC}"
    exit 1
fi

if [ "$GUEST_NICK" != "TestGuest" ]; then
    echo -e "${RED}Guest nickname mismatch${NC}"
    exit 1
fi

print_result 0 "Room has both players: $HOST_NICK (host) and $GUEST_NICK (guest)"
echo ""

# Step 5: Summary
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All API tests passed!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps to test manually:"
echo "1. Open browser 1: http://localhost:5173/multiplayer/create"
echo "2. Open browser 2 (incognito): http://localhost:5173/join/${ROOM_CODE}"
echo "3. In browser 2, enter a nickname and click 'Join Game'"
echo "4. Verify browser 2 shows 'Waiting for host to start the game...'"
echo "5. In browser 1, verify it shows 'TestGuest has joined!'"
echo "6. In browser 1, click 'Start Game'"
echo "7. Verify both browsers navigate to the game page"
echo ""
echo "Room Code for manual testing: ${ROOM_CODE}"

# Cleanup
rm -f /tmp/host_cookies.txt /tmp/guest_cookies.txt
