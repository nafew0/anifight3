#!/bin/bash

# Phase 5: Manual Multiplayer Testing Script
# This script tests the multiplayer endpoints manually

BASE_URL="http://localhost:8000/api/multiplayer"

echo "========================================="
echo "Multiplayer Manual Testing Script"
echo "========================================="
echo ""

# Test 1: Create a room
echo "Test 1: Creating a multiplayer room..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/rooms/create_room/" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "anime_pool_ids": [1, 2, 3],
    "host_nickname": "TestHost"
  }')

echo "Response: $RESPONSE"
ROOM_CODE=$(echo $RESPONSE | grep -o '"room_code":"[^"]*"' | cut -d'"' -f4)
echo "Room Code: $ROOM_CODE"
echo ""

if [ -z "$ROOM_CODE" ]; then
  echo "❌ Failed to create room"
  exit 1
fi

echo "✅ Room created successfully: $ROOM_CODE"
echo ""

# Test 2: Get room details
echo "Test 2: Getting room details..."
curl -s -X GET "${BASE_URL}/rooms/${ROOM_CODE}/" | jq .
echo ""

# Test 3: Get room status
echo "Test 3: Getting room status..."
curl -s -X GET "${BASE_URL}/rooms/${ROOM_CODE}/room_status/" | jq .
echo ""

# Test 4: Join the room
echo "Test 4: Joining the room..."
JOIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/rooms/${ROOM_CODE}/join_room/" \
  -H "Content-Type: application/json" \
  -d '{
    "guest_nickname": "TestGuest"
  }')

echo "Response: $JOIN_RESPONSE"
echo ""

# Test 5: Verify room status changed to 'ready'
echo "Test 5: Verifying room status is 'ready'..."
STATUS_RESPONSE=$(curl -s -X GET "${BASE_URL}/rooms/${ROOM_CODE}/room_status/")
STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo "Current status: $STATUS"

if [ "$STATUS" == "ready" ]; then
  echo "✅ Room status correctly updated to 'ready'"
else
  echo "❌ Room status is not 'ready': $STATUS"
fi
echo ""

# Test 6: Try to join a non-existent room
echo "Test 6: Trying to join non-existent room..."
curl -s -X POST "${BASE_URL}/rooms/INVALID/join_room/" \
  -H "Content-Type: application/json" \
  -d '{
    "guest_nickname": "TestGuest"
  }' | jq .
echo ""

# Test 7: List all rooms
echo "Test 7: Listing all rooms..."
curl -s -X GET "${BASE_URL}/rooms/" | jq '.results | length' || echo "No results field"
echo ""

echo "========================================="
echo "Manual testing complete!"
echo "========================================="
