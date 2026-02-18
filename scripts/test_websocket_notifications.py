#!/usr/bin/env python3
"""
Test WebSocket notifications for multiplayer room joining
This tests that:
1. Host connects to WebSocket
2. Guest joins and connects to WebSocket
3. Host receives 'player_joined' notification
4. Host starts the game
5. Both players receive 'game_started' notification
"""

import asyncio
import websockets
import json
import requests
import sys

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/game"

# Colors for terminal output
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

def print_success(message):
    print(f"{GREEN}✓ {message}{NC}")

def print_error(message):
    print(f"{RED}✗ {message}{NC}")

def print_info(message):
    print(f"{BLUE}ℹ {message}{NC}")

def print_section(message):
    print(f"\n{YELLOW}{'='*50}{NC}")
    print(f"{YELLOW}{message}{NC}")
    print(f"{YELLOW}{'='*50}{NC}")

async def test_multiplayer_notifications():
    """Test the complete multiplayer notification flow"""

    print_section("Multiplayer WebSocket Notification Test")

    # Step 1: Create room via API
    print_info("Creating room...")
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/multiplayer/rooms/create_room/",
        json={
            "host_nickname": "WSTestHost",
            "template_id": 1,
            "anime_pool_ids": [1, 2, 3, 4, 5]
        }
    )

    if response.status_code != 201:
        print_error(f"Failed to create room: {response.text}")
        return False

    room_data = response.json()
    room_code = room_data['room_code']
    print_success(f"Room created: {room_code}")

    # Track received messages
    host_messages = []
    guest_messages = []
    test_results = []

    # Step 2: Connect host to WebSocket
    print_info("Connecting host to WebSocket...")

    try:
        async with websockets.connect(f"{WS_URL}/{room_code}/") as host_ws:
            print_success("Host WebSocket connected")

            # Wait for connection_established message
            host_conn_msg = await asyncio.wait_for(host_ws.recv(), timeout=5)
            host_conn_data = json.loads(host_conn_msg)
            host_messages.append(host_conn_data)

            if host_conn_data.get('type') == 'connection_established':
                print_success(f"Host connection established as '{host_conn_data.get('player_role')}'")
                test_results.append(("Host connection", True))
            else:
                print_error(f"Expected 'connection_established', got: {host_conn_data}")
                test_results.append(("Host connection", False))
                return False

            # Step 3: Join room as guest via API
            print_info("Joining room as guest...")
            guest_session = requests.Session()
            join_response = guest_session.post(
                f"{BASE_URL}/api/multiplayer/rooms/{room_code}/join_room/",
                json={"guest_nickname": "WSTestGuest"}
            )

            if join_response.status_code != 200:
                print_error(f"Failed to join room: {join_response.text}")
                test_results.append(("Guest join API", False))
                return False

            print_success("Guest joined via API")
            test_results.append(("Guest join API", True))

            # Step 4: Connect guest to WebSocket
            print_info("Connecting guest to WebSocket...")

            async with websockets.connect(f"{WS_URL}/{room_code}/") as guest_ws:
                print_success("Guest WebSocket connected")

                # Wait for guest connection_established
                guest_conn_msg = await asyncio.wait_for(guest_ws.recv(), timeout=5)
                guest_conn_data = json.loads(guest_conn_msg)
                guest_messages.append(guest_conn_data)

                if guest_conn_data.get('type') == 'connection_established':
                    print_success(f"Guest connection established as '{guest_conn_data.get('player_role')}'")
                    test_results.append(("Guest connection", True))
                else:
                    print_error(f"Expected 'connection_established', got: {guest_conn_data}")
                    test_results.append(("Guest connection", False))

                # Step 5: Host should receive player_joined notification
                print_info("Waiting for host to receive player_joined notification...")

                try:
                    # Host might receive ping first, so we need to check multiple messages
                    player_joined_received = False
                    for _ in range(3):  # Check up to 3 messages
                        host_msg = await asyncio.wait_for(host_ws.recv(), timeout=5)
                        host_data = json.loads(host_msg)
                        host_messages.append(host_data)

                        print_info(f"Host received: {host_data.get('type')}")

                        if host_data.get('type') == 'player_joined':
                            print_success(f"Host received 'player_joined' notification for '{host_data.get('player_role')}'")
                            test_results.append(("Host receives player_joined", True))
                            player_joined_received = True
                            break
                        elif host_data.get('type') == 'ping':
                            # Send pong and continue
                            await host_ws.send(json.dumps({"type": "pong", "timestamp": host_data.get('timestamp')}))

                    if not player_joined_received:
                        print_error("Host did not receive 'player_joined' notification")
                        test_results.append(("Host receives player_joined", False))

                except asyncio.TimeoutError:
                    print_error("Timeout waiting for player_joined notification")
                    test_results.append(("Host receives player_joined", False))

                # Step 6: Host starts the game
                print_info("Host starting game...")
                await host_ws.send(json.dumps({
                    "type": "start_game",
                    "template_id": 1,
                    "anime_pool_ids": [1, 2, 3, 4, 5]
                }))

                # Step 7: Both players should receive game_started
                print_info("Waiting for game_started notifications...")

                host_game_started = False
                guest_game_started = False

                try:
                    # Check host
                    for _ in range(3):
                        host_msg = await asyncio.wait_for(host_ws.recv(), timeout=5)
                        host_data = json.loads(host_msg)
                        host_messages.append(host_data)

                        if host_data.get('type') == 'game_started':
                            print_success("Host received 'game_started' notification")
                            host_game_started = True
                            break
                        elif host_data.get('type') == 'ping':
                            await host_ws.send(json.dumps({"type": "pong", "timestamp": host_data.get('timestamp')}))

                    # Check guest
                    for _ in range(3):
                        guest_msg = await asyncio.wait_for(guest_ws.recv(), timeout=5)
                        guest_data = json.loads(guest_msg)
                        guest_messages.append(guest_data)

                        if guest_data.get('type') == 'game_started':
                            print_success("Guest received 'game_started' notification")
                            guest_game_started = True
                            break
                        elif guest_data.get('type') == 'ping':
                            await guest_ws.send(json.dumps({"type": "pong", "timestamp": guest_data.get('timestamp')}))

                    test_results.append(("Host receives game_started", host_game_started))
                    test_results.append(("Guest receives game_started", guest_game_started))

                    if not host_game_started:
                        print_error("Host did not receive 'game_started'")
                    if not guest_game_started:
                        print_error("Guest did not receive 'game_started'")

                except asyncio.TimeoutError:
                    print_error("Timeout waiting for game_started notifications")
                    test_results.append(("Both receive game_started", False))

    except Exception as e:
        print_error(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

    # Print summary
    print_section("Test Summary")

    all_passed = True
    for test_name, result in test_results:
        if result:
            print_success(f"{test_name}")
        else:
            print_error(f"{test_name}")
            all_passed = False

    print()
    if all_passed:
        print_success("All tests passed!")
        return True
    else:
        print_error("Some tests failed!")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_multiplayer_notifications())
    sys.exit(0 if result else 1)
