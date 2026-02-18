import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from django.utils import timezone
from .models import MultiplayerRoom, GameAction
from .game_state_manager import GameStateManager
import logging

logger = logging.getLogger(__name__)


class GameConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for multiplayer game communication"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_code = None
        self.room_group_name = None
        self.player_role = None  # 'host' or 'guest'
        self.session_id = None
        self.heartbeat_task = None
        self.disconnect_timer = None
        self.game_state_manager = None

    async def connect(self):
        """Handle WebSocket connection"""
        try:
            logger.info(f"[WS CONNECT] Starting connection - Path: {self.scope.get('path')}")

            self.room_code = self.scope['url_route']['kwargs']['room_code']
            self.room_group_name = f'game_{self.room_code}'
            logger.info(f"[WS CONNECT] Room code: {self.room_code}")

            # Get session ID
            try:
                session = self.scope.get('session')
                if session:
                    if not session.session_key:
                        logger.info(f"[WS CONNECT] Creating session...")
                        await database_sync_to_async(session.create)()
                    self.session_id = session.session_key
                    logger.info(f"[WS CONNECT] Session ID: {self.session_id}")
                else:
                    logger.warning(f"[WS CONNECT] No session, using anonymous")
                    self.session_id = f"anonymous_{id(self)}"
            except Exception as e:
                logger.error(f"[WS CONNECT] Session error: {e}")
                self.session_id = f"anonymous_{id(self)}"

            # Verify room exists
            logger.info(f"[WS CONNECT] Fetching room...")
            room = await self.get_room()
            if not room:
                logger.error(f"[WS CONNECT] Room not found: {self.room_code}")
                await self.close(code=4004)
                return

            logger.info(f"[WS CONNECT] Room found: {room.id}")

            # Determine player role
            logger.info(f"[WS CONNECT] Determining role...")
            self.player_role = await self.determine_player_role(room)
            if not self.player_role:
                logger.error(f"[WS CONNECT] Could not determine role")
                await self.close(code=4003)  # Room full
                return

            logger.info(f"[WS CONNECT] Role: {self.player_role}")

            # Join room group
            logger.info(f"[WS CONNECT] Joining group...")
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            logger.info(f"[WS CONNECT] Accepting connection...")
            await self.accept()

            logger.info(f"[WS CONNECT] Connection accepted!")

            # Initialize game state manager
            self.game_state_manager = GameStateManager(self.room_code)

            # Check if this is a new connection or reconnection BEFORE updating status
            room = await self.get_room()
            is_first_connection = (
                (self.player_role == 'guest' and not room.guest_connected) or
                (self.player_role == 'host' and not room.host_connected)
            )

            # Update connection status
            await self.update_connection_status(True)

            # Cancel any pending disconnect timer
            await self.cancel_disconnect_timer()

            # Send connection confirmation with current state
            current_state = await self.game_state_manager.get_state()
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'player_role': self.player_role,
                'room_code': self.room_code,
                'current_state': current_state,
            }))

            # Notify other player appropriately
            if is_first_connection:
                # First time connecting - send player_joined
                logger.info(f"[WS CONNECT] First connection for {self.player_role}, sending player_joined")
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'player_joined',
                        'player_role': self.player_role,
                    }
                )
            else:
                # Reconnecting - send player_reconnected
                logger.info(f"[WS CONNECT] Reconnection for {self.player_role}, sending player_reconnected")
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'player_reconnected',
                        'player_role': self.player_role,
                    }
                )

            # Start heartbeat
            self.heartbeat_task = asyncio.create_task(self.send_heartbeat())

            logger.info(f"[WS CONNECT] Player {self.player_role} connected to room {self.room_code}")

        except Exception as e:
            logger.error(f"[WS CONNECT] ERROR: {type(e).__name__}: {str(e)}")
            logger.exception(e)
            await self.close(code=4011)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        logger.info(f"Player {self.player_role} disconnected from room {self.room_code} (code: {close_code})")

        # Cancel heartbeat
        if self.heartbeat_task:
            self.heartbeat_task.cancel()

        # Update connection status
        await self.update_connection_status(False)

        # Start disconnect timer (10 seconds grace period)
        self.disconnect_timer = asyncio.create_task(self.handle_disconnect_timeout())

        # Notify other player
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_disconnected',
                'player_role': self.player_role,
            }
        )

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            # Reset disconnect timer on any message
            await self.cancel_disconnect_timer()
            await self.update_last_seen()

            # Route message to appropriate handler
            if message_type == 'pong':
                # Heartbeat response
                pass
            elif message_type == 'start_game':
                await self.handle_start_game(data)
            elif message_type == 'draw_character':
                await self.handle_draw_character(data)
            elif message_type == 'place_character':
                await self.handle_place_character(data)
            elif message_type == 'reset_game':
                await self.handle_reset_game(data)
            elif message_type == 'request_sync':
                await self.handle_request_sync(data)
            else:
                logger.warning(f"Unknown message type: {message_type}")

        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received: {text_data}")
            await self.send_error("Invalid message format")
        except Exception as e:
            logger.exception(f"Error handling message: {e}")
            await self.send_error(str(e))

    # Message Handlers

    async def handle_start_game(self, data):
        """Handle game start"""
        # Only host can start
        if self.player_role != 'host':
            await self.send_error("Only host can start the game")
            return

        # Update room status
        await self.update_room_status('in_progress')

        # Initialize game state
        template_id = data.get('template_id')
        anime_pool_ids = data.get('anime_pool_ids')
        await self.game_state_manager.initialize_game(template_id, anime_pool_ids)

        # Broadcast to both players
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_started',
                'template_id': template_id,
                'anime_pool_ids': anime_pool_ids,
            }
        )

    async def handle_draw_character(self, data):
        """Handle character draw action"""
        character_data = data.get('character')

        # Update game state
        await self.game_state_manager.add_action(
            'DRAW_CHARACTER',
            self.player_role,
            {'character': character_data}
        )

        # Broadcast to both players
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'character_drawn',
                'character': character_data,
                'player_role': self.player_role,
            }
        )

    async def handle_place_character(self, data):
        """Handle character placement"""
        character_id = data.get('character_id')
        role_name = data.get('role_name')

        # Update game state
        await self.game_state_manager.add_action(
            'PLACE_CHARACTER',
            self.player_role,
            {
                'character_id': character_id,
                'role_name': role_name,
            }
        )

        # Check if game is complete
        is_complete = await self.game_state_manager.is_game_complete()

        # Broadcast to both players
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'character_placed',
                'character_id': character_id,
                'role_name': role_name,
                'player_role': self.player_role,
                'is_complete': is_complete,
            }
        )

        # If complete, calculate and send results
        if is_complete:
            await self.calculate_and_send_results()

    async def handle_reset_game(self, data):
        """Handle game reset"""
        await self.game_state_manager.reset()
        await self.update_room_status('ready')

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_reset',
            }
        )

    async def handle_request_sync(self, data):
        """Handle state synchronization request (for reconnection)"""
        current_state = await self.game_state_manager.get_state()
        await self.send(text_data=json.dumps({
            'type': 'state_sync',
            'state': current_state,
        }))

    # Group message handlers (broadcast receivers)

    async def player_joined(self, event):
        """Broadcast when player joins for the first time"""
        if event['player_role'] != self.player_role:
            await self.send(text_data=json.dumps({
                'type': 'player_joined',
                'player_role': event['player_role'],
            }))

    async def player_reconnected(self, event):
        """Broadcast when player reconnects"""
        if event['player_role'] != self.player_role:
            await self.send(text_data=json.dumps({
                'type': 'player_reconnected',
                'player_role': event['player_role'],
            }))

    async def player_disconnected(self, event):
        """Broadcast when player disconnects"""
        if event['player_role'] != self.player_role:
            await self.send(text_data=json.dumps({
                'type': 'player_disconnected',
                'player_role': event['player_role'],
            }))

    async def game_started(self, event):
        """Broadcast game start"""
        await self.send(text_data=json.dumps({
            'type': 'game_started',
            'template_id': event['template_id'],
            'anime_pool_ids': event['anime_pool_ids'],
        }))

    async def character_drawn(self, event):
        """Broadcast character draw"""
        await self.send(text_data=json.dumps({
            'type': 'character_drawn',
            'character': event['character'],
            'player_role': event['player_role'],
        }))

    async def character_placed(self, event):
        """Broadcast character placement"""
        await self.send(text_data=json.dumps({
            'type': 'character_placed',
            'character_id': event['character_id'],
            'role_name': event['role_name'],
            'player_role': event['player_role'],
            'is_complete': event.get('is_complete', False),
        }))

    async def game_reset(self, event):
        """Broadcast game reset"""
        await self.send(text_data=json.dumps({
            'type': 'game_reset',
        }))

    async def game_ended(self, event):
        """Broadcast game end"""
        await self.send(text_data=json.dumps({
            'type': 'game_ended',
            'reason': event['reason'],
            'results': event.get('results'),
        }))

    # Utility methods

    async def send_heartbeat(self):
        """Send periodic heartbeat to detect connection loss"""
        try:
            while True:
                await asyncio.sleep(5)
                await self.send(text_data=json.dumps({
                    'type': 'ping',
                    'timestamp': timezone.now().isoformat(),
                }))
        except asyncio.CancelledError:
            pass

    async def send_error(self, message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
        }))

    async def cancel_disconnect_timer(self):
        """Cancel pending disconnect timer"""
        if self.disconnect_timer and not self.disconnect_timer.done():
            self.disconnect_timer.cancel()
            self.disconnect_timer = None

    async def handle_disconnect_timeout(self):
        """Handle player disconnect after grace period"""
        try:
            await asyncio.sleep(10)  # 10 second grace period

            # Check if both players disconnected
            room = await self.get_room()
            if not room.host_connected and not room.guest_connected:
                # Both disconnected, end game
                await self.update_room_status('abandoned')
                logger.info(f"Room {self.room_code} abandoned - both players disconnected")
            elif self.player_role == 'host' and not room.host_connected:
                # Host disconnected, end game and show results
                await self.force_end_game('Host disconnected')
            elif self.player_role == 'guest' and not room.guest_connected:
                # Guest disconnected, end game and show results
                await self.force_end_game('Guest disconnected')

        except asyncio.CancelledError:
            pass

    async def force_end_game(self, reason):
        """Force end game due to disconnect"""
        await self.update_room_status('completed')

        # Calculate results with current state
        results = await self.calculate_results()

        # Broadcast to remaining player
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_ended',
                'reason': reason,
                'results': results,
            }
        )

    async def calculate_and_send_results(self):
        """Calculate final results and broadcast"""
        results = await self.calculate_results()
        await self.update_room_status('completed')

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_ended',
                'reason': 'Game completed',
                'results': results,
            }
        )

    # Database operations

    @database_sync_to_async
    def get_room(self):
        """Get room from database"""
        try:
            return MultiplayerRoom.objects.get(room_code=self.room_code)
        except MultiplayerRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def determine_player_role(self, room):
        """Determine if player is host or guest"""
        logger.info(f"[DETERMINE ROLE] Room host_session: {room.host_session_id}, Current session: {self.session_id}")
        logger.info(f"[DETERMINE ROLE] Room host user: {room.host}, Current user: {self.scope['user']}, Authenticated: {self.scope['user'].is_authenticated}")
        logger.info(f"[DETERMINE ROLE] Room status: {room.status}, Guest session: {room.guest_session_id}")

        # Check if session matches host
        if room.host_session_id == self.session_id:
            logger.info(f"[DETERMINE ROLE] ✓ Session matches host")
            return 'host'

        if self.scope['user'].is_authenticated and room.host == self.scope['user']:
            logger.info(f"[DETERMINE ROLE] ✓ Authenticated user matches host")
            return 'host'

        # Check if session matches guest
        if room.guest_session_id:
            if room.guest_session_id == self.session_id or \
               (self.scope['user'].is_authenticated and room.guest == self.scope['user']):
                logger.info(f"[DETERMINE ROLE] ✓ Matches guest")
                return 'guest'
            else:
                logger.info(f"[DETERMINE ROLE] ✗ Room full")
                return None

        # Special case: Room is waiting with no guest - allow host reconnection
        if room.status == 'waiting' and not room.guest_session_id:
            logger.info(f"[DETERMINE ROLE] Checking session update...")

            # Authenticated user - update session AND set as host if not already set
            if self.scope['user'].is_authenticated:
                if room.host == self.scope['user'] or room.host is None:
                    logger.info(f"[DETERMINE ROLE] ✓ Auth user - updating session and host")
                    room.host_session_id = self.session_id
                    if room.host is None:
                        logger.info(f"[DETERMINE ROLE] Setting host to current user")
                        room.host = self.scope['user']
                    room.save()
                    return 'host'

            # Unauthenticated user - update session if host not set
            if not self.scope['user'].is_authenticated and room.host is None:
                logger.info(f"[DETERMINE ROLE] ✓ Unauth user updating session")
                room.host_session_id = self.session_id
                room.save()
                return 'host'

            logger.info(f"[DETERMINE ROLE] ✗ No update conditions met")

        logger.info(f"[DETERMINE ROLE] ✗ All checks failed")
        return None

    @database_sync_to_async
    def update_connection_status(self, connected):
        """Update player connection status"""
        room = MultiplayerRoom.objects.get(room_code=self.room_code)
        if self.player_role == 'host':
            room.host_connected = connected
            room.host_last_seen = timezone.now()
        else:
            room.guest_connected = connected
            room.guest_last_seen = timezone.now()
        room.save()

    @database_sync_to_async
    def update_last_seen(self):
        """Update last seen timestamp"""
        room = MultiplayerRoom.objects.get(room_code=self.room_code)
        if self.player_role == 'host':
            room.host_last_seen = timezone.now()
        else:
            room.guest_last_seen = timezone.now()
        room.save()

    @database_sync_to_async
    def update_room_status(self, status):
        """Update room status"""
        room = MultiplayerRoom.objects.get(room_code=self.room_code)
        room.status = status
        if status == 'in_progress' and not room.started_at:
            room.started_at = timezone.now()
        elif status == 'completed' and not room.completed_at:
            room.completed_at = timezone.now()
        room.save()

    @database_sync_to_async
    def calculate_results(self):
        """Calculate game results - placeholder for now"""
        state = cache.get(f'game_state:{self.room_code}')
        if not state:
            return None

        # For now, return basic results
        # This should integrate with your existing scoring logic
        return {
            'host_placements': state.get('host_placements', {}),
            'guest_placements': state.get('guest_placements', {}),
            'winner': None,  # To be implemented with actual scoring
        }
