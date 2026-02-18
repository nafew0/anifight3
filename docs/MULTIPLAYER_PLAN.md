# AniFight - Multiplayer Development Plan

## Project Overview

This plan extends AniFight to support **real-time online multiplayer** using WebSocket technology, enabling two players on different devices to play together with resilient, persistent connections.

### Core Requirements
- Real-time synchronization between two players
- Resilient connection handling (network changes, screen locks, brief disconnections)
- 10-second grace period for reconnections
- Auto-end game if both players disconnect
- Show results if one player stays disconnected >10 seconds
- Room system with join links, QR codes, and join codes
- Seamless integration with existing single-device mode

### Technology Stack
- **Backend WebSocket**: Django Channels + Redis (for channel layers)
- **Frontend WebSocket**: Native WebSocket API with auto-reconnect
- **Session Management**: Redis-backed in-memory session store
- **QR Code Generation**: qrcode.js (frontend), qrcode (backend)
- **Connection Resilience**: Heartbeat/ping-pong mechanism, exponential backoff reconnection
- **State Synchronization**: Event-sourcing pattern with action replay on reconnect

---

## Architecture Overview

### WebSocket Communication Flow
```
Player 1 (Host)                    Server (Django Channels)              Player 2 (Guest)
     |                                      |                                    |
     |----CREATE_ROOM------------------->   |                                    |
     |<---ROOM_CREATED (code, link)-------|  |                                    |
     |                                      |<-----JOIN_ROOM (code)---------------|
     |<---PLAYER_JOINED--------------------|                                    |
     |-------------------------------------->|----PLAYER_JOINED------------------>|
     |                                      |                                    |
     |----START_GAME--------------------->  |                                    |
     |<---GAME_STARTED--------------------|                                    |
     |-------------------------------------->|----GAME_STARTED------------------->|
     |                                      |                                    |
     |----DRAW_CHARACTER----------------->  |                                    |
     |<---CHARACTER_DRAWN------------------|                                    |
     |-------------------------------------->|----CHARACTER_DRAWN---------------->|
     |                                      |                                    |
     |----PLACE_CHARACTER---------------->  |                                    |
     |<---CHARACTER_PLACED-----------------|                                    |
     |-------------------------------------->|----CHARACTER_PLACED--------------->|
     |                                      |                                    |
     |  (Heartbeat every 5s)                |  (Heartbeat every 5s)              |
     |<---PONG-----------------------------|                                    |
     |-------------------------------------->|<---PONG----------------------------|
```

### Connection Resilience Strategy
1. **Heartbeat Mechanism**: Server sends PING every 5 seconds, expects PONG within 3 seconds
2. **Client Reconnection**: Exponential backoff (1s → 2s → 4s → 8s, max 10s)
3. **Session Persistence**: Store game state in Redis with 15-minute TTL
4. **Reconnection Flow**: Client sends reconnect token → Server restores state → Replay missed events
5. **Grace Period**: 10-second disconnect tolerance before considering player offline
6. **Network Change Detection**: Browser online/offline events + connection state monitoring

---

## Development Phases

## Phase 1: Backend WebSocket Infrastructure

**Objective**: Set up Django Channels with Redis for real-time WebSocket communication

### 1.1 Install Dependencies

**Tasks:**
1. Install required packages:
   ```bash
   cd backend
   pip install channels channels-redis redis qrcode pillow shortuuid
   ```

2. Update `requirements.txt`:
   ```
   channels==4.0.0
   channels-redis==4.1.0
   redis==5.0.1
   qrcode==7.4.2
   pillow==10.2.0
   shortuuid==1.0.11
   ```

3. Install and configure Redis:
   - macOS: `brew install redis` → `brew services start redis`
   - Linux: `sudo apt install redis-server` → `sudo systemctl start redis`
   - Docker: `docker run -d -p 6379:6379 redis:7-alpine`

### 1.2 Configure Django Channels

**Tasks:**
1. Update `backend/anifight/settings.py`:
   ```python
   INSTALLED_APPS = [
       'daphne',  # Add at the TOP
       'django.contrib.admin',
       # ... existing apps
       'channels',
   ]

   # ASGI Application
   ASGI_APPLICATION = 'anifight.asgi.application'

   # Channels Layer (Redis)
   CHANNEL_LAYERS = {
       'default': {
           'BACKEND': 'channels_redis.core.RedisChannelLayer',
           'CONFIG': {
               "hosts": [('127.0.0.1', 6379)],
               "capacity": 1500,
               "expiry": 10,
           },
       },
   }

   # Redis for session storage
   CACHES = {
       'default': {
           'BACKEND': 'django.core.cache.backends.redis.RedisCache',
           'LOCATION': 'redis://127.0.0.1:6379/1',
           'OPTIONS': {
               'CLIENT_CLASS': 'django_redis.client.DefaultClient',
           },
           'KEY_PREFIX': 'anifight',
           'TIMEOUT': 900,  # 15 minutes
       }
   }
   ```

2. Create `backend/anifight/asgi.py` (update existing file):
   ```python
   import os
   from django.core.asgi import get_asgi_application
   from channels.routing import ProtocolTypeRouter, URLRouter
   from channels.auth import AuthMiddlewareStack
   from channels.security.websocket import AllowedHostsOriginValidator

   os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'anifight.settings')

   django_asgi_app = get_asgi_application()

   from multiplayer.routing import websocket_urlpatterns

   application = ProtocolTypeRouter({
       "http": django_asgi_app,
       "websocket": AllowedHostsOriginValidator(
           AuthMiddlewareStack(
               URLRouter(websocket_urlpatterns)
           )
       ),
   })
   ```

3. Create new Django app for multiplayer:
   ```bash
   python manage.py startapp multiplayer
   ```

4. Add to `INSTALLED_APPS`:
   ```python
   INSTALLED_APPS = [
       # ... existing apps
       'multiplayer',
   ]
   ```

### 1.3 Create Database Models for Multiplayer Sessions

**Tasks:**
1. Create `backend/multiplayer/models.py`:
   ```python
   from django.db import models
   from django.contrib.auth.models import User
   from django.utils import timezone
   import shortuuid

   class MultiplayerRoom(models.Model):
       """Stores multiplayer room metadata"""

       STATUS_CHOICES = [
           ('waiting', 'Waiting for Player'),
           ('ready', 'Ready to Start'),
           ('in_progress', 'Game In Progress'),
           ('completed', 'Completed'),
           ('abandoned', 'Abandoned'),
       ]

       room_code = models.CharField(max_length=8, unique=True, db_index=True)
       host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_rooms', null=True, blank=True)
       guest = models.ForeignKey(User, on_delete=models.CASCADE, related_name='joined_rooms', null=True, blank=True)

       # Anonymous player identifiers
       host_session_id = models.CharField(max_length=64, null=True, blank=True)
       guest_session_id = models.CharField(max_length=64, null=True, blank=True)

       # Player nicknames
       host_nickname = models.CharField(max_length=50, default='Player 1')
       guest_nickname = models.CharField(max_length=50, default='Player 2')

       # Game configuration
       template_id = models.IntegerField(null=True, blank=True)
       anime_pool_ids = models.JSONField(default=list)  # List of anime IDs

       # Room status
       status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')

       # Connection tracking
       host_connected = models.BooleanField(default=True)
       guest_connected = models.BooleanField(default=False)
       host_last_seen = models.DateTimeField(auto_now_add=True)
       guest_last_seen = models.DateTimeField(null=True, blank=True)

       # Timestamps
       created_at = models.DateTimeField(auto_now_add=True)
       started_at = models.DateTimeField(null=True, blank=True)
       completed_at = models.DateTimeField(null=True, blank=True)

       # Game state stored in Redis (reference key)
       redis_state_key = models.CharField(max_length=100, null=True, blank=True)

       class Meta:
           ordering = ['-created_at']
           indexes = [
               models.Index(fields=['room_code']),
               models.Index(fields=['status']),
               models.Index(fields=['created_at']),
           ]

       def save(self, *args, **kwargs):
           if not self.room_code:
               self.room_code = self.generate_room_code()
           if not self.redis_state_key:
               self.redis_state_key = f'game_state:{self.room_code}'
           super().save(*args, **kwargs)

       @staticmethod
       def generate_room_code():
           """Generate unique 6-character room code"""
           while True:
               code = shortuuid.ShortUUID().random(length=6).upper()
               if not MultiplayerRoom.objects.filter(room_code=code).exists():
                   return code

       def get_join_url(self, base_url='http://localhost:5174'):
           """Generate join URL for sharing"""
           return f"{base_url}/join/{self.room_code}"

       def is_expired(self):
           """Check if room is expired (>30 minutes old and not in progress)"""
           if self.status == 'in_progress':
               return False
           age = timezone.now() - self.created_at
           return age.total_seconds() > 1800  # 30 minutes

   class GameAction(models.Model):
       """Event sourcing: stores all game actions for replay on reconnect"""

       room = models.ForeignKey(MultiplayerRoom, on_delete=models.CASCADE, related_name='actions')
       action_type = models.CharField(max_length=50)  # DRAW_CHARACTER, PLACE_CHARACTER, etc.
       player_role = models.CharField(max_length=10)  # 'host' or 'guest'
       action_data = models.JSONField()  # Action payload
       sequence_number = models.IntegerField()  # For ordering
       timestamp = models.DateTimeField(auto_now_add=True)

       class Meta:
           ordering = ['sequence_number']
           indexes = [
               models.Index(fields=['room', 'sequence_number']),
           ]
   ```

2. Run migrations:
   ```bash
   python manage.py makemigrations multiplayer
   python manage.py migrate
   ```

### 1.4 Create WebSocket Consumer

**Tasks:**
1. Create `backend/multiplayer/consumers.py`:
   ```python
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
           self.room_code = self.scope['url_route']['kwargs']['room_code']
           self.room_group_name = f'game_{self.room_code}'
           self.session_id = self.scope['session'].session_key

           # Verify room exists
           room = await self.get_room()
           if not room:
               await self.close(code=4004)
               return

           # Determine player role
           self.player_role = await self.determine_player_role(room)
           if not self.player_role:
               await self.close(code=4003)  # Room full
               return

           # Join room group
           await self.channel_layer.group_add(
               self.room_group_name,
               self.channel_name
           )

           await self.accept()

           # Initialize game state manager
           self.game_state_manager = GameStateManager(self.room_code)

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

           # Notify other player
           await self.channel_layer.group_send(
               self.room_group_name,
               {
                   'type': 'player_reconnected',
                   'player_role': self.player_role,
               }
           )

           # Start heartbeat
           self.heartbeat_task = asyncio.create_task(self.send_heartbeat())

           logger.info(f"Player {self.player_role} connected to room {self.room_code}")

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
               elif message_type == 'create_room':
                   await self.handle_create_room(data)
               elif message_type == 'join_room':
                   await self.handle_join_room(data)
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

       async def handle_create_room(self, data):
           """Handle room creation"""
           # Room already created in REST API, just confirm
           room = await self.get_room()
           await self.send(text_data=json.dumps({
               'type': 'room_created',
               'room_code': room.room_code,
               'join_url': room.get_join_url(),
           }))

       async def handle_join_room(self, data):
           """Handle player joining room"""
           nickname = data.get('nickname', 'Player 2')
           await self.set_guest_info(nickname)

           # Notify host
           await self.channel_layer.group_send(
               self.room_group_name,
               {
                   'type': 'player_joined',
                   'nickname': nickname,
               }
           )

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
           remaining_ids = data.get('remaining_character_ids', [])

           # Process draw using existing API logic
           from api.views import draw_character
           character = await database_sync_to_async(draw_character)(remaining_ids)

           # Update game state
           await self.game_state_manager.add_action(
               'DRAW_CHARACTER',
               self.player_role,
               {'character': character}
           )

           # Broadcast to both players
           await self.channel_layer.group_send(
               self.room_group_name,
               {
                   'type': 'character_drawn',
                   'character': character,
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
           """Broadcast when player joins"""
           await self.send(text_data=json.dumps({
               'type': 'player_joined',
               'nickname': event['nickname'],
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
           # Check if host
           if room.host_session_id == self.session_id or \
              (self.scope['user'].is_authenticated and room.host == self.scope['user']):
               return 'host'

           # Check if guest already joined
           if room.guest_session_id:
               if room.guest_session_id == self.session_id or \
                  (self.scope['user'].is_authenticated and room.guest == self.scope['user']):
                   return 'guest'
               else:
                   return None  # Room full

           # Assign as guest
           room.guest_session_id = self.session_id
           if self.scope['user'].is_authenticated:
               room.guest = self.scope['user']
           room.guest_connected = True
           room.guest_last_seen = timezone.now()
           room.save()
           return 'guest'

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
       def set_guest_info(self, nickname):
           """Set guest nickname"""
           room = MultiplayerRoom.objects.get(room_code=self.room_code)
           room.guest_nickname = nickname
           room.status = 'ready'
           room.save()

       @database_sync_to_async
       def calculate_results(self):
           """Calculate game results using existing scoring logic"""
           from api.scoring import calculate_match_results

           state = cache.get(f'game_state:{self.room_code}')
           if not state:
               return None

           # Use existing scoring logic
           results = calculate_match_results(
               state['host_placements'],
               state['guest_placements'],
               state['template_id']
           )

           return results
   ```

2. Create `backend/multiplayer/game_state_manager.py`:
   ```python
   from django.core.cache import cache
   from .models import GameAction, MultiplayerRoom
   import json

   class GameStateManager:
       """Manages game state in Redis with event sourcing"""

       def __init__(self, room_code):
           self.room_code = room_code
           self.state_key = f'game_state:{room_code}'

       async def initialize_game(self, template_id, anime_pool_ids):
           """Initialize new game state"""
           state = {
               'template_id': template_id,
               'anime_pool_ids': anime_pool_ids,
               'current_turn': 'host',
               'host_placements': {},
               'guest_placements': {},
               'drawn_characters': [],
               'remaining_character_ids': [],  # Will be populated from API
               'sequence_number': 0,
           }
           cache.set(self.state_key, state, timeout=900)  # 15 minutes
           return state

       async def get_state(self):
           """Get current game state"""
           return cache.get(self.state_key, {})

       async def add_action(self, action_type, player_role, action_data):
           """Add action to state and event log"""
           state = await self.get_state()
           state['sequence_number'] += 1

           # Update state based on action type
           if action_type == 'DRAW_CHARACTER':
               state['drawn_characters'].append(action_data['character'])
               # Remove from remaining
               char_id = action_data['character']['id']
               if char_id in state.get('remaining_character_ids', []):
                   state['remaining_character_ids'].remove(char_id)

           elif action_type == 'PLACE_CHARACTER':
               placements_key = f'{player_role}_placements'
               state[placements_key][action_data['role_name']] = action_data['character_id']

               # Switch turn
               state['current_turn'] = 'guest' if player_role == 'host' else 'host'

           # Save to cache
           cache.set(self.state_key, state, timeout=900)

           # Save to database for persistence
           await self.save_action_to_db(action_type, player_role, action_data, state['sequence_number'])

           return state

       async def is_game_complete(self):
           """Check if all placements are filled"""
           state = await self.get_state()
           # Get template to know how many roles
           from game.models import GameTemplate
           template = await GameTemplate.objects.aget(id=state['template_id'])
           roles = json.loads(template.roles_json)

           return (
               len(state.get('host_placements', {})) == len(roles) and
               len(state.get('guest_placements', {})) == len(roles)
           )

       async def reset(self):
           """Reset game state"""
           cache.delete(self.state_key)

       async def save_action_to_db(self, action_type, player_role, action_data, sequence_number):
           """Save action to database for replay"""
           from channels.db import database_sync_to_async

           @database_sync_to_async
           def _save():
               room = MultiplayerRoom.objects.get(room_code=self.room_code)
               GameAction.objects.create(
                   room=room,
                   action_type=action_type,
                   player_role=player_role,
                   action_data=action_data,
                   sequence_number=sequence_number,
               )

           await _save()

       async def replay_actions(self, from_sequence=0):
           """Replay actions from database for reconnection"""
           from channels.db import database_sync_to_async

           @database_sync_to_async
           def _get_actions():
               room = MultiplayerRoom.objects.get(room_code=self.room_code)
               return list(room.actions.filter(sequence_number__gt=from_sequence).values(
                   'action_type', 'player_role', 'action_data', 'sequence_number'
               ))

           actions = await _get_actions()

           # Replay each action
           state = await self.get_state()
           for action in actions:
               # Re-apply action logic
               await self.add_action(
                   action['action_type'],
                   action['player_role'],
                   action['action_data']
               )

           return state
   ```

3. Create `backend/multiplayer/routing.py`:
   ```python
   from django.urls import re_path
   from . import consumers

   websocket_urlpatterns = [
       re_path(r'ws/game/(?P<room_code>\w+)/$', consumers.GameConsumer.as_asgi()),
   ]
   ```

### 1.5 Create REST API Endpoints for Room Management

**Tasks:**
1. Create `backend/multiplayer/serializers.py`:
   ```python
   from rest_framework import serializers
   from .models import MultiplayerRoom

   class MultiplayerRoomSerializer(serializers.ModelSerializer):
       join_url = serializers.SerializerMethodField()

       class Meta:
           model = MultiplayerRoom
           fields = [
               'id', 'room_code', 'host_nickname', 'guest_nickname',
               'status', 'join_url', 'created_at'
           ]
           read_only_fields = ['room_code', 'join_url', 'created_at']

       def get_join_url(self, obj):
           request = self.context.get('request')
           if request:
               base_url = f"{request.scheme}://{request.get_host()}"
               return obj.get_join_url(base_url)
           return obj.get_join_url()

   class CreateRoomSerializer(serializers.Serializer):
       host_nickname = serializers.CharField(max_length=50, default='Player 1')
       template_id = serializers.IntegerField()
       anime_pool_ids = serializers.ListField(
           child=serializers.IntegerField(),
           min_length=1
       )

   class JoinRoomSerializer(serializers.Serializer):
       room_code = serializers.CharField(max_length=8)
       guest_nickname = serializers.CharField(max_length=50, default='Player 2')
   ```

2. Create `backend/multiplayer/views.py`:
   ```python
   from rest_framework import viewsets, status
   from rest_framework.decorators import action
   from rest_framework.response import Response
   from rest_framework.permissions import AllowAny
   from .models import MultiplayerRoom
   from .serializers import (
       MultiplayerRoomSerializer,
       CreateRoomSerializer,
       JoinRoomSerializer
   )
   import qrcode
   from io import BytesIO
   import base64

   class MultiplayerRoomViewSet(viewsets.ModelViewSet):
       """API endpoints for multiplayer room management"""

       queryset = MultiplayerRoom.objects.all()
       serializer_class = MultiplayerRoomSerializer
       permission_classes = [AllowAny]
       lookup_field = 'room_code'

       @action(detail=False, methods=['post'])
       def create_room(self, request):
           """Create a new multiplayer room"""
           serializer = CreateRoomSerializer(data=request.data)
           serializer.is_valid(raise_exception=True)

           # Create room
           room = MultiplayerRoom.objects.create(
               host_nickname=serializer.validated_data.get('host_nickname', 'Player 1'),
               template_id=serializer.validated_data['template_id'],
               anime_pool_ids=serializer.validated_data['anime_pool_ids'],
               status='waiting',
           )

           # Set host
           if request.user.is_authenticated:
               room.host = request.user
           room.host_session_id = request.session.session_key or request.session.create()
           room.save()

           # Generate QR code
           join_url = room.get_join_url(
               base_url=f"{request.scheme}://{request.get_host()}"
           )
           qr_code_data = self.generate_qr_code(join_url)

           return Response({
               'room_code': room.room_code,
               'join_url': join_url,
               'qr_code': qr_code_data,
               'status': room.status,
           }, status=status.HTTP_201_CREATED)

       @action(detail=True, methods=['post'])
       def join_room(self, request, room_code=None):
           """Join an existing room"""
           try:
               room = MultiplayerRoom.objects.get(room_code=room_code)
           except MultiplayerRoom.DoesNotExist:
               return Response(
                   {'error': 'Room not found'},
                   status=status.HTTP_404_NOT_FOUND
               )

           # Check if room is available
           if room.status not in ['waiting', 'ready']:
               return Response(
                   {'error': 'Room is not available'},
                   status=status.HTTP_400_BAD_REQUEST
               )

           if room.guest_session_id:
               return Response(
                   {'error': 'Room is full'},
                   status=status.HTTP_400_BAD_REQUEST
               )

           serializer = JoinRoomSerializer(data=request.data)
           serializer.is_valid(raise_exception=True)

           # Set guest
           room.guest_nickname = serializer.validated_data.get('guest_nickname', 'Player 2')
           if request.user.is_authenticated:
               room.guest = request.user
           room.guest_session_id = request.session.session_key or request.session.create()
           room.status = 'ready'
           room.save()

           return Response({
               'room_code': room.room_code,
               'host_nickname': room.host_nickname,
               'guest_nickname': room.guest_nickname,
               'status': room.status,
           })

       @action(detail=True, methods=['get'])
       def status(self, request, room_code=None):
           """Get room status"""
           try:
               room = MultiplayerRoom.objects.get(room_code=room_code)
           except MultiplayerRoom.DoesNotExist:
               return Response(
                   {'error': 'Room not found'},
                   status=status.HTTP_404_NOT_FOUND
               )

           serializer = self.get_serializer(room)
           return Response(serializer.data)

       def generate_qr_code(self, data):
           """Generate QR code as base64 image"""
           qr = qrcode.QRCode(
               version=1,
               error_correction=qrcode.constants.ERROR_CORRECT_L,
               box_size=10,
               border=4,
           )
           qr.add_data(data)
           qr.make(fit=True)

           img = qr.make_image(fill_color="black", back_color="white")
           buffer = BytesIO()
           img.save(buffer, format='PNG')
           img_str = base64.b64encode(buffer.getvalue()).decode()

           return f"data:image/png;base64,{img_str}"
   ```

3. Create `backend/multiplayer/urls.py`:
   ```python
   from django.urls import path, include
   from rest_framework.routers import DefaultRouter
   from .views import MultiplayerRoomViewSet

   router = DefaultRouter()
   router.register(r'rooms', MultiplayerRoomViewSet, basename='multiplayer-room')

   urlpatterns = [
       path('', include(router.urls)),
   ]
   ```

4. Update `backend/api/urls.py`:
   ```python
   from django.urls import path, include

   urlpatterns = [
       # ... existing patterns
       path('multiplayer/', include('multiplayer.urls')),
   ]
   ```

### 1.6 Admin Interface

**Tasks:**
1. Create `backend/multiplayer/admin.py`:
   ```python
   from django.contrib import admin
   from .models import MultiplayerRoom, GameAction

   @admin.register(MultiplayerRoom)
   class MultiplayerRoomAdmin(admin.ModelAdmin):
       list_display = [
           'room_code', 'host_nickname', 'guest_nickname',
           'status', 'host_connected', 'guest_connected',
           'created_at', 'started_at'
       ]
       list_filter = ['status', 'created_at']
       search_fields = ['room_code', 'host_nickname', 'guest_nickname']
       readonly_fields = [
           'room_code', 'redis_state_key', 'created_at',
           'started_at', 'completed_at'
       ]

   @admin.register(GameAction)
   class GameActionAdmin(admin.ModelAdmin):
       list_display = [
           'room', 'action_type', 'player_role',
           'sequence_number', 'timestamp'
       ]
       list_filter = ['action_type', 'player_role', 'timestamp']
       search_fields = ['room__room_code']
       readonly_fields = ['timestamp']
   ```

**Files Created/Modified:**
- `backend/requirements.txt`
- `backend/anifight/settings.py`
- `backend/anifight/asgi.py`
- `backend/multiplayer/` (new app)
  - `models.py`
  - `consumers.py`
  - `game_state_manager.py`
  - `routing.py`
  - `serializers.py`
  - `views.py`
  - `urls.py`
  - `admin.py`
- `backend/api/urls.py`

**Testing:**
- Start Redis: `redis-server`
- Run migrations: `python manage.py makemigrations && python manage.py migrate`
- Start server: `python manage.py runserver`
- Test WebSocket connection with a WebSocket client
- Create room via API: `POST /api/multiplayer/rooms/create_room/`
- Join room via API: `POST /api/multiplayer/rooms/{code}/join_room/`

---

## Phase 2: Frontend WebSocket Integration

**Objective**: Build React components for multiplayer mode with resilient WebSocket connection

### 2.1 WebSocket Service Layer

**Tasks:**
1. Install dependencies:
   ```bash
   cd frontend
   npm install qrcode.react
   ```

2. Create `frontend/src/services/websocket.js`:
   ```javascript
   /**
    * WebSocket service with auto-reconnect and resilience features
    */

   class GameWebSocket {
     constructor(roomCode) {
       this.roomCode = roomCode;
       this.ws = null;
       this.reconnectAttempts = 0;
       this.maxReconnectAttempts = 10;
       this.reconnectDelay = 1000; // Start with 1 second
       this.maxReconnectDelay = 10000; // Max 10 seconds
       this.heartbeatInterval = null;
       this.missedHeartbeats = 0;
       this.maxMissedHeartbeats = 3;
       this.isIntentionalClose = false;
       this.messageQueue = [];
       this.isConnected = false;

       // Event handlers
       this.onOpen = null;
       this.onClose = null;
       this.onMessage = null;
       this.onError = null;
       this.onReconnecting = null;
       this.onReconnected = null;

       // Network change detection
       this.setupNetworkListeners();
     }

     connect() {
       const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
       const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/game/${this.roomCode}/`;

       console.log(`[WebSocket] Connecting to ${wsUrl}`);

       this.ws = new WebSocket(wsUrl);

       this.ws.onopen = this.handleOpen.bind(this);
       this.ws.onclose = this.handleClose.bind(this);
       this.ws.onmessage = this.handleMessage.bind(this);
       this.ws.onerror = this.handleError.bind(this);
     }

     handleOpen(event) {
       console.log('[WebSocket] Connected');
       this.isConnected = true;
       this.reconnectAttempts = 0;
       this.reconnectDelay = 1000;
       this.missedHeartbeats = 0;

       // Start heartbeat monitoring
       this.startHeartbeat();

       // Flush message queue
       this.flushMessageQueue();

       // Notify application
       if (this.onOpen) this.onOpen(event);
       if (this.reconnectAttempts > 0 && this.onReconnected) {
         this.onReconnected();
       }

       // Request state sync after reconnection
       if (this.reconnectAttempts > 0) {
         this.send({ type: 'request_sync' });
       }
     }

     handleClose(event) {
       console.log(`[WebSocket] Disconnected (code: ${event.code}, reason: ${event.reason})`);
       this.isConnected = false;
       this.stopHeartbeat();

       // Notify application
       if (this.onClose) this.onClose(event);

       // Attempt reconnection if not intentional
       if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
         this.attemptReconnect();
       }
     }

     handleMessage(event) {
       try {
         const data = JSON.parse(event.data);

         // Handle ping/pong
         if (data.type === 'ping') {
           this.missedHeartbeats = 0;
           this.send({ type: 'pong', timestamp: data.timestamp });
           return;
         }

         // Forward to application
         if (this.onMessage) this.onMessage(data);
       } catch (error) {
         console.error('[WebSocket] Error parsing message:', error);
       }
     }

     handleError(event) {
       console.error('[WebSocket] Error:', event);
       if (this.onError) this.onError(event);
     }

     attemptReconnect() {
       this.reconnectAttempts++;
       const delay = Math.min(
         this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
         this.maxReconnectDelay
       );

       console.log(
         `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
       );

       if (this.onReconnecting) {
         this.onReconnecting(this.reconnectAttempts, delay);
       }

       setTimeout(() => {
         if (!this.isIntentionalClose) {
           this.connect();
         }
       }, delay);
     }

     send(data) {
       if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
         this.ws.send(JSON.stringify(data));
       } else {
         // Queue message for later
         console.log('[WebSocket] Message queued (not connected)');
         this.messageQueue.push(data);
       }
     }

     flushMessageQueue() {
       while (this.messageQueue.length > 0) {
         const message = this.messageQueue.shift();
         this.send(message);
       }
     }

     startHeartbeat() {
       this.stopHeartbeat();
       this.heartbeatInterval = setInterval(() => {
         this.missedHeartbeats++;
         if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
           console.warn('[WebSocket] Heartbeat timeout, closing connection');
           this.ws.close();
         }
       }, 15000); // Check every 15 seconds (server sends every 5s)
     }

     stopHeartbeat() {
       if (this.heartbeatInterval) {
         clearInterval(this.heartbeatInterval);
         this.heartbeatInterval = null;
       }
     }

     setupNetworkListeners() {
       // Detect online/offline events
       window.addEventListener('online', () => {
         console.log('[WebSocket] Network online, attempting reconnect');
         if (!this.isConnected) {
           this.reconnectAttempts = 0; // Reset attempts on network recovery
           this.connect();
         }
       });

       window.addEventListener('offline', () => {
         console.log('[WebSocket] Network offline');
       });

       // Detect visibility change (tab hidden/shown)
       document.addEventListener('visibilitychange', () => {
         if (!document.hidden && !this.isConnected) {
           console.log('[WebSocket] Tab visible, checking connection');
           this.connect();
         }
       });
     }

     close() {
       console.log('[WebSocket] Closing connection (intentional)');
       this.isIntentionalClose = true;
       this.stopHeartbeat();
       if (this.ws) {
         this.ws.close();
       }
     }

     // Convenience methods for game actions

     createRoom(hostNickname, templateId, animePoolIds) {
       this.send({
         type: 'create_room',
         host_nickname: hostNickname,
         template_id: templateId,
         anime_pool_ids: animePoolIds,
       });
     }

     joinRoom(nickname) {
       this.send({
         type: 'join_room',
         nickname,
       });
     }

     startGame(templateId, animePoolIds) {
       this.send({
         type: 'start_game',
         template_id: templateId,
         anime_pool_ids: animePoolIds,
       });
     }

     drawCharacter(remainingCharacterIds) {
       this.send({
         type: 'draw_character',
         remaining_character_ids: remainingCharacterIds,
       });
     }

     placeCharacter(characterId, roleName) {
       this.send({
         type: 'place_character',
         character_id: characterId,
         role_name: roleName,
       });
     }

     resetGame() {
       this.send({
         type: 'reset_game',
       });
     }
   }

   export default GameWebSocket;
   ```

3. Create `frontend/src/contexts/MultiplayerContext.jsx`:
   ```javascript
   import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
   import GameWebSocket from '../services/websocket';

   const MultiplayerContext = createContext();

   export const useMultiplayer = () => {
     const context = useContext(MultiplayerContext);
     if (!context) {
       throw new Error('useMultiplayer must be used within MultiplayerProvider');
     }
     return context;
   };

   export const MultiplayerProvider = ({ children }) => {
     const [ws, setWs] = useState(null);
     const [roomCode, setRoomCode] = useState(null);
     const [playerRole, setPlayerRole] = useState(null); // 'host' or 'guest'
     const [isConnected, setIsConnected] = useState(false);
     const [isReconnecting, setIsReconnecting] = useState(false);
     const [opponentConnected, setOpponentConnected] = useState(false);
     const [gameState, setGameState] = useState(null);

     // Initialize WebSocket connection
     const connect = useCallback((code) => {
       if (ws) {
         ws.close();
       }

       const socket = new GameWebSocket(code);

       socket.onOpen = () => {
         setIsConnected(true);
         setIsReconnecting(false);
       };

       socket.onClose = () => {
         setIsConnected(false);
       };

       socket.onReconnecting = (attempt, delay) => {
         setIsReconnecting(true);
       };

       socket.onReconnected = () => {
         setIsReconnecting(false);
       };

       socket.onMessage = (data) => {
         handleWebSocketMessage(data);
       };

       socket.connect();
       setWs(socket);
       setRoomCode(code);
     }, [ws]);

     // Handle WebSocket messages
     const handleWebSocketMessage = useCallback((data) => {
       switch (data.type) {
         case 'connection_established':
           setPlayerRole(data.player_role);
           setGameState(data.current_state);
           break;

         case 'player_joined':
           setOpponentConnected(true);
           break;

         case 'player_disconnected':
           setOpponentConnected(false);
           break;

         case 'player_reconnected':
           setOpponentConnected(true);
           break;

         case 'game_started':
           setGameState((prev) => ({
             ...prev,
             status: 'in_progress',
             template_id: data.template_id,
             anime_pool_ids: data.anime_pool_ids,
           }));
           break;

         case 'character_drawn':
           setGameState((prev) => ({
             ...prev,
             drawn_character: data.character,
             current_turn: data.player_role === 'host' ? 'guest' : 'host',
           }));
           break;

         case 'character_placed':
           setGameState((prev) => {
             const placementsKey = `${data.player_role}_placements`;
             return {
               ...prev,
               [placementsKey]: {
                 ...prev[placementsKey],
                 [data.role_name]: data.character_id,
               },
               drawn_character: null,
               current_turn: data.player_role === 'host' ? 'guest' : 'host',
               is_complete: data.is_complete,
             };
           });
           break;

         case 'game_ended':
           setGameState((prev) => ({
             ...prev,
             status: 'completed',
             results: data.results,
             end_reason: data.reason,
           }));
           break;

         case 'state_sync':
           setGameState(data.state);
           break;

         case 'error':
           console.error('[Multiplayer] Error:', data.message);
           break;

         default:
           console.log('[Multiplayer] Unknown message type:', data.type);
       }
     }, []);

     // Disconnect
     const disconnect = useCallback(() => {
       if (ws) {
         ws.close();
         setWs(null);
       }
       setRoomCode(null);
       setPlayerRole(null);
       setIsConnected(false);
       setOpponentConnected(false);
       setGameState(null);
     }, [ws]);

     // Clean up on unmount
     useEffect(() => {
       return () => {
         if (ws) {
           ws.close();
         }
       };
     }, [ws]);

     const value = {
       ws,
       connect,
       disconnect,
       roomCode,
       playerRole,
       isConnected,
       isReconnecting,
       opponentConnected,
       gameState,
       setGameState,
     };

     return (
       <MultiplayerContext.Provider value={value}>
         {children}
       </MultiplayerContext.Provider>
     );
   };
   ```

**Files Created:**
- `frontend/src/services/websocket.js`
- `frontend/src/contexts/MultiplayerContext.jsx`

---

### 2.2 Multiplayer UI Components

**Tasks:**
1. Update `frontend/src/pages/StartScreen.jsx` to add multiplayer button:
   ```javascript
   import { useState } from 'react';
   import { useNavigate } from 'react-router-dom';
   // ... existing imports

   const StartScreen = () => {
     // ... existing state
     const navigate = useNavigate();

     const handleMultiplayerClick = () => {
       // Navigate to multiplayer setup
       navigate('/multiplayer/create');
     };

     return (
       <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 p-4">
         {/* Existing content */}

         <div className="flex gap-4 justify-center mt-6">
           {/* Existing Start Game button */}
           <button
             onClick={handleStartGame}
             disabled={!isValid}
             className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
           >
             Start Game
           </button>

           {/* New Multiplayer button */}
           <button
             onClick={handleMultiplayerClick}
             disabled={!isValid}
             className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
             </svg>
             Online Multiplayer
           </button>
         </div>
       </div>
     );
   };

   export default StartScreen;
   ```

2. Create `frontend/src/pages/MultiplayerCreate.jsx`:
   ```javascript
   import { useState, useEffect } from 'react';
   import { useNavigate } from 'react-router-dom';
   import { QRCodeSVG } from 'qrcode.react';
   import { motion, AnimatePresence } from 'framer-motion';
   import { useMultiplayer } from '../contexts/MultiplayerContext';
   import axios from 'axios';

   const MultiplayerCreate = () => {
     const navigate = useNavigate();
     const { connect, isConnected, opponentConnected, playerRole, gameState } = useMultiplayer();

     const [roomCode, setRoomCode] = useState(null);
     const [joinUrl, setJoinUrl] = useState(null);
     const [qrCode, setQrCode] = useState(null);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState(null);
     const [hostNickname, setHostNickname] = useState('Player 1');
     const [guestNickname, setGuestNickname] = useState(null);

     // Get game config from localStorage (set by StartScreen)
     const [gameConfig, setGameConfig] = useState(null);

     useEffect(() => {
       const config = localStorage.getItem('multiplayer_game_config');
       if (config) {
         setGameConfig(JSON.parse(config));
       } else {
         // No config, redirect back
         navigate('/');
       }
     }, [navigate]);

     useEffect(() => {
       if (gameConfig && !roomCode) {
         createRoom();
       }
     }, [gameConfig]);

     const createRoom = async () => {
       setLoading(true);
       setError(null);

       try {
         const response = await axios.post('/api/multiplayer/rooms/create_room/', {
           host_nickname: hostNickname,
           template_id: gameConfig.templateId,
           anime_pool_ids: gameConfig.animePoolIds,
         });

         setRoomCode(response.data.room_code);
         setJoinUrl(response.data.join_url);
         setQrCode(response.data.qr_code);

         // Connect to WebSocket
         connect(response.data.room_code);
       } catch (err) {
         setError(err.response?.data?.error || 'Failed to create room');
       } finally {
         setLoading(false);
       }
     };

     const copyJoinLink = () => {
       navigator.clipboard.writeText(joinUrl);
       // Show toast notification
     };

     const copyRoomCode = () => {
       navigator.clipboard.writeText(roomCode);
       // Show toast notification
     };

     const handleStartGame = () => {
       if (opponentConnected) {
         // Navigate to multiplayer draft screen
         navigate('/multiplayer/draft');
       }
     };

     const handleCancel = () => {
       navigate('/');
     };

     // Listen for guest joining
     useEffect(() => {
       if (gameState && gameState.status === 'ready') {
         // Guest has joined
         setGuestNickname(gameState.guest_nickname || 'Player 2');
       }
     }, [gameState]);

     if (loading) {
       return (
         <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 flex items-center justify-center">
           <div className="text-white text-xl">Creating room...</div>
         </div>
       );
     }

     return (
       <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 p-4 flex items-center justify-center">
         <div className="max-w-2xl w-full bg-gray-800 rounded-xl shadow-2xl p-8">
           <h1 className="text-3xl font-bold text-white mb-6 text-center">
             Online Multiplayer
           </h1>

           {error && (
             <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
               {error}
             </div>
           )}

           {roomCode && (
             <>
               {/* Room Code Section */}
               <div className="mb-8">
                 <h2 className="text-xl font-semibold text-white mb-4">Room Code</h2>
                 <div className="bg-gray-700 rounded-lg p-6 flex items-center justify-between">
                   <div className="text-5xl font-mono font-bold text-indigo-400 tracking-widest">
                     {roomCode}
                   </div>
                   <button
                     onClick={copyRoomCode}
                     className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                   >
                     Copy Code
                   </button>
                 </div>
               </div>

               {/* Join Link Section */}
               <div className="mb-8">
                 <h2 className="text-xl font-semibold text-white mb-4">Join Link</h2>
                 <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                   <div className="text-sm text-gray-300 truncate flex-1 mr-4">
                     {joinUrl}
                   </div>
                   <button
                     onClick={copyJoinLink}
                     className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap"
                   >
                     Copy Link
                   </button>
                 </div>
               </div>

               {/* QR Code Section */}
               <div className="mb-8">
                 <h2 className="text-xl font-semibold text-white mb-4 text-center">
                   Scan QR Code
                 </h2>
                 <div className="flex justify-center bg-white rounded-lg p-6">
                   {qrCode ? (
                     <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                   ) : (
                     <QRCodeSVG value={joinUrl} size={256} />
                   )}
                 </div>
               </div>

               {/* Waiting/Player Status */}
               <div className="mb-8">
                 <AnimatePresence mode="wait">
                   {!opponentConnected ? (
                     <motion.div
                       key="waiting"
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       className="text-center"
                     >
                       <div className="text-xl text-gray-300 mb-4">
                         Waiting for other player to join
                         <span className="animate-pulse">...</span>
                       </div>
                       <div className="flex justify-center">
                         <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                       </div>
                     </motion.div>
                   ) : (
                     <motion.div
                       key="ready"
                       initial={{ scale: 0.8, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       className="bg-green-600 rounded-lg p-6"
                     >
                       <div className="flex items-center justify-center gap-4">
                         <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <div className="text-white">
                           <div className="font-semibold text-lg">{guestNickname} has joined!</div>
                           <div className="text-sm text-green-100">Ready to start the game</div>
                         </div>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>

               {/* Action Buttons */}
               <div className="flex gap-4 justify-center">
                 <button
                   onClick={handleCancel}
                   className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleStartGame}
                   disabled={!opponentConnected}
                   className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   Start Game
                 </button>
               </div>

               {/* Connection Status */}
               <div className="mt-6 text-center text-sm text-gray-400">
                 {isConnected ? (
                   <span className="text-green-400">● Connected</span>
                 ) : (
                   <span className="text-red-400">● Disconnected</span>
                 )}
               </div>
             </>
           )}
         </div>
       </div>
     );
   };

   export default MultiplayerCreate;
   ```

3. Create `frontend/src/pages/MultiplayerJoin.jsx`:
   ```javascript
   import { useState, useEffect } from 'react';
   import { useNavigate, useParams } from 'react-router-dom';
   import { motion } from 'framer-motion';
   import { useMultiplayer } from '../contexts/MultiplayerContext';
   import axios from 'axios';

   const MultiplayerJoin = () => {
     const { roomCode: urlRoomCode } = useParams();
     const navigate = useNavigate();
     const { connect, isConnected, gameState } = useMultiplayer();

     const [roomCode, setRoomCode] = useState(urlRoomCode || '');
     const [nickname, setNickname] = useState('Player 2');
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState(null);
     const [roomInfo, setRoomInfo] = useState(null);

     useEffect(() => {
       if (urlRoomCode) {
         // Auto-fetch room info if code in URL
         fetchRoomInfo(urlRoomCode);
       }
     }, [urlRoomCode]);

     const fetchRoomInfo = async (code) => {
       try {
         const response = await axios.get(`/api/multiplayer/rooms/${code}/status/`);
         setRoomInfo(response.data);
       } catch (err) {
         setError(err.response?.data?.error || 'Room not found');
       }
     };

     const handleJoin = async () => {
       setLoading(true);
       setError(null);

       try {
         await axios.post(`/api/multiplayer/rooms/${roomCode}/join_room/`, {
           guest_nickname: nickname,
         });

         // Connect to WebSocket
         connect(roomCode);

         // Wait for connection then navigate
         setTimeout(() => {
           navigate('/multiplayer/draft');
         }, 1000);
       } catch (err) {
         setError(err.response?.data?.error || 'Failed to join room');
       } finally {
         setLoading(false);
       }
     };

     return (
       <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 p-4 flex items-center justify-center">
         <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8"
         >
           <h1 className="text-3xl font-bold text-white mb-6 text-center">
             Join Game
           </h1>

           {error && (
             <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
               {error}
             </div>
           )}

           {roomInfo && (
             <div className="bg-gray-700 rounded-lg p-4 mb-6">
               <div className="text-gray-300 text-sm">Host:</div>
               <div className="text-white font-semibold">{roomInfo.host_nickname}</div>
             </div>
           )}

           <div className="space-y-4 mb-6">
             <div>
               <label className="block text-gray-300 mb-2">Room Code</label>
               <input
                 type="text"
                 value={roomCode}
                 onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                 placeholder="Enter 6-digit code"
                 maxLength={6}
                 className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl font-mono tracking-widest"
                 disabled={!!urlRoomCode}
               />
             </div>

             <div>
               <label className="block text-gray-300 mb-2">Your Nickname</label>
               <input
                 type="text"
                 value={nickname}
                 onChange={(e) => setNickname(e.target.value)}
                 placeholder="Enter your nickname"
                 maxLength={50}
                 className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
               />
             </div>
           </div>

           <div className="flex gap-4">
             <button
               onClick={() => navigate('/')}
               className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
             >
               Cancel
             </button>
             <button
               onClick={handleJoin}
               disabled={!roomCode || !nickname || loading}
               className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {loading ? 'Joining...' : 'Join Game'}
             </button>
           </div>

           {isConnected && (
             <div className="mt-4 text-center text-green-400 text-sm">
               ● Connected - Redirecting...
             </div>
           )}
         </motion.div>
       </div>
     );
   };

   export default MultiplayerJoin;
   ```

4. Update `frontend/src/App.jsx` to add routes:
   ```javascript
   import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
   import { MultiplayerProvider } from './contexts/MultiplayerContext';
   // ... existing imports
   import MultiplayerCreate from './pages/MultiplayerCreate';
   import MultiplayerJoin from './pages/MultiplayerJoin';

   function App() {
     return (
       <Router>
         <GameProvider>
           <MultiplayerProvider>
             <Routes>
               {/* Existing routes */}
               <Route path="/" element={<StartScreen />} />
               <Route path="/draft" element={<DraftScreen />} />
               <Route path="/results" element={<ResultScreen />} />

               {/* New multiplayer routes */}
               <Route path="/multiplayer/create" element={<MultiplayerCreate />} />
               <Route path="/multiplayer/draft" element={<DraftScreen />} />
               <Route path="/join/:roomCode?" element={<MultiplayerJoin />} />
             </Routes>
           </MultiplayerProvider>
         </GameProvider>
       </Router>
     );
   }

   export default App;
   ```

**Files Created/Modified:**
- `frontend/src/pages/StartScreen.jsx` (modified)
- `frontend/src/pages/MultiplayerCreate.jsx` (new)
- `frontend/src/pages/MultiplayerJoin.jsx` (new)
- `frontend/src/App.jsx` (modified)

---

## Phase 3: Multiplayer Draft Screen Integration

**Objective**: Adapt existing DraftScreen to work with both single-device and multiplayer modes

### 3.1 Update DraftScreen for Multiplayer

**Tasks:**
1. Modify `frontend/src/pages/DraftScreen.jsx`:
   ```javascript
   import { useEffect, useState } from 'react';
   import { useLocation } from 'react-router-dom';
   import { useGame } from '../contexts/GameContext';
   import { useMultiplayer } from '../contexts/MultiplayerContext';
   // ... existing imports

   const DraftScreen = () => {
     const location = useLocation();
     const isMultiplayer = location.pathname.includes('/multiplayer');

     // Single-device context
     const gameContext = useGame();

     // Multiplayer context
     const multiplayerContext = useMultiplayer();
     const { ws, playerRole, gameState: mpGameState, opponentConnected, isReconnecting } = multiplayerContext;

     // Use appropriate context based on mode
     const context = isMultiplayer ? multiplayerContext : gameContext;

     const [connectionStatus, setConnectionStatus] = useState('connected');

     // Handle multiplayer-specific events
     useEffect(() => {
       if (!isMultiplayer) return;

       // Listen for opponent disconnect
       if (!opponentConnected && connectionStatus === 'connected') {
         setConnectionStatus('opponent_disconnected');
         // Start 10-second countdown
         const timer = setTimeout(() => {
           // Show results
           handleForceEnd();
         }, 10000);

         return () => clearTimeout(timer);
       } else if (opponentConnected && connectionStatus === 'opponent_disconnected') {
         setConnectionStatus('connected');
       }
     }, [isMultiplayer, opponentConnected]);

     // Handle draw action
     const handleDraw = async () => {
       if (isMultiplayer) {
         // Check if it's this player's turn
         if (mpGameState.current_turn !== playerRole) {
           alert("It's not your turn!");
           return;
         }

         // Send draw action via WebSocket
         ws.drawCharacter(mpGameState.remaining_character_ids);
       } else {
         // Existing single-device logic
         // ... existing code
       }
     };

     // Handle placement action
     const handlePlace = async (roleName) => {
       if (isMultiplayer) {
         // Send placement via WebSocket
         ws.placeCharacter(drawnCharacter.id, roleName);
       } else {
         // Existing single-device logic
         // ... existing code
       }
     };

     // Render connection status banner
     const renderConnectionStatus = () => {
       if (!isMultiplayer) return null;

       if (isReconnecting) {
         return (
           <div className="bg-yellow-600 text-white px-4 py-2 text-center">
             Reconnecting...
           </div>
         );
       }

       if (!opponentConnected) {
         return (
           <div className="bg-orange-600 text-white px-4 py-2 text-center">
             Opponent disconnected. Waiting for reconnection...
           </div>
         );
       }

       return null;
     };

     return (
       <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900">
         {renderConnectionStatus()}

         {/* Existing draft screen UI */}
         {/* ... */}

         {/* Show turn indicator in multiplayer */}
         {isMultiplayer && (
           <div className="text-center mb-4">
             <div className="text-xl text-white">
               {mpGameState?.current_turn === playerRole ? (
                 <span className="text-green-400">Your Turn</span>
               ) : (
                 <span className="text-gray-400">Opponent's Turn</span>
               )}
             </div>
           </div>
         )}

         {/* Existing content... */}
       </div>
     );
   };

   export default DraftScreen;
   ```

**Key Changes:**
- Detect if in multiplayer mode via route
- Use MultiplayerContext for WebSocket communication
- Disable draw button when not player's turn
- Show connection status banner
- Handle opponent disconnect with 10-second grace period
- Synchronize state from WebSocket messages

---

## Phase 4: Connection Resilience Features

**Objective**: Implement robust handling for network issues, screen locks, and reconnections

### 4.1 Enhanced Reconnection Logic

**Tasks:**
1. Add reconnection UI component `frontend/src/components/ReconnectionOverlay.jsx`:
   ```javascript
   import { motion } from 'framer-motion';

   const ReconnectionOverlay = ({ isReconnecting, attempts, onForceQuit }) => {
     if (!isReconnecting) return null;

     return (
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
       >
         <div className="bg-gray-800 rounded-xl p-8 max-w-md text-center">
           <div className="mb-4">
             <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
           </div>
           <h2 className="text-2xl font-bold text-white mb-2">Reconnecting...</h2>
           <p className="text-gray-300 mb-4">
             Connection lost. Attempting to reconnect (attempt {attempts}/10)
           </p>
           <p className="text-sm text-gray-400 mb-6">
             Your game progress is saved. Please wait while we restore your connection.
           </p>
           <button
             onClick={onForceQuit}
             className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
           >
             Quit Game
           </button>
         </div>
       </motion.div>
     );
   };

   export default ReconnectionOverlay;
   ```

2. Add offline detection in `frontend/src/components/OfflineIndicator.jsx`:
   ```javascript
   import { useEffect, useState } from 'react';
   import { motion, AnimatePresence } from 'framer-motion';

   const OfflineIndicator = () => {
     const [isOnline, setIsOnline] = useState(navigator.onLine);

     useEffect(() => {
       const handleOnline = () => setIsOnline(true);
       const handleOffline = () => setIsOnline(false);

       window.addEventListener('online', handleOnline);
       window.addEventListener('offline', handleOffline);

       return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
       };
     }, []);

     return (
       <AnimatePresence>
         {!isOnline && (
           <motion.div
             initial={{ y: -100 }}
             animate={{ y: 0 }}
             exit={{ y: -100 }}
             className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 text-center z-50"
           >
             No internet connection. Waiting for network...
           </motion.div>
         )}
       </AnimatePresence>
     );
   };

   export default OfflineIndicator;
   ```

3. Update `frontend/src/App.jsx` to include global indicators:
   ```javascript
   import OfflineIndicator from './components/OfflineIndicator';

   function App() {
     return (
       <Router>
         <GameProvider>
           <MultiplayerProvider>
             <OfflineIndicator />
             <Routes>
               {/* ... routes */}
             </Routes>
           </MultiplayerProvider>
         </GameProvider>
       </Router>
     );
   }
   ```

### 4.2 Backend: Cleanup and Maintenance Tasks

**Tasks:**
1. Create management command to clean up old rooms `backend/multiplayer/management/commands/cleanup_old_rooms.py`:
   ```python
   from django.core.management.base import BaseCommand
   from django.utils import timezone
   from multiplayer.models import MultiplayerRoom

   class Command(BaseCommand):
       help = 'Clean up old/abandoned multiplayer rooms'

       def handle(self, *args, **options):
           # Delete rooms older than 24 hours
           cutoff = timezone.now() - timezone.timedelta(hours=24)
           old_rooms = MultiplayerRoom.objects.filter(created_at__lt=cutoff)
           count = old_rooms.count()
           old_rooms.delete()

           self.stdout.write(
               self.style.SUCCESS(f'Deleted {count} old rooms')
           )
   ```

2. Add to cron job (or Celery periodic task):
   ```bash
   # Add to crontab
   0 */6 * * * cd /path/to/backend && python manage.py cleanup_old_rooms
   ```

**Files Created:**
- `frontend/src/components/ReconnectionOverlay.jsx`
- `frontend/src/components/OfflineIndicator.jsx`
- `backend/multiplayer/management/commands/cleanup_old_rooms.py`

---

## Phase 5: Testing & Edge Cases

**Objective**: Comprehensive testing of multiplayer features and edge cases

### 5.1 Testing Scenarios

**Manual Testing Checklist:**

**Connection Resilience:**
- [ ] Lock screen for 5 seconds → should reconnect seamlessly
- [ ] Turn off WiFi for 8 seconds → should reconnect after WiFi restored
- [ ] Switch from WiFi to mobile data → should reconnect
- [ ] Close laptop lid for 5 seconds → should reconnect
- [ ] Navigate away from tab for 1 minute → should maintain connection
- [ ] Force kill browser tab → other player sees disconnect after 10s
- [ ] Refresh page mid-game → should restore game state

**Room Management:**
- [ ] Create room → verify room code, QR, and link generated
- [ ] Copy room code → verify clipboard
- [ ] Join via link → verify auto-join flow
- [ ] Join via manual code entry → verify join flow
- [ ] Guest joins → host sees notification
- [ ] Start game before guest joins → should show error
- [ ] Start game after guest joins → both players see game start

**Gameplay:**
- [ ] Player 1 draws character → Player 2 sees character drawn
- [ ] Player 2 tries to draw on Player 1's turn → should show error
- [ ] Player places character → both see placement
- [ ] All slots filled → both see results screen
- [ ] Reset game → both return to draft state

**Disconnect Scenarios:**
- [ ] Host disconnects for 5s → guest sees "reconnecting" message
- [ ] Host disconnects for 15s → guest sees results screen
- [ ] Guest disconnects for 5s → host sees "waiting" message
- [ ] Guest disconnects for 15s → host sees results screen
- [ ] Both disconnect → room marked as abandoned
- [ ] Host disconnects, guest waits → host reconnects within 10s → game continues

**Edge Cases:**
- [ ] Two tabs from same player → should handle gracefully
- [ ] Room code already exists → should generate new code
- [ ] Join expired room → should show error
- [ ] Join full room → should show error
- [ ] Invalid room code → should show error
- [ ] WebSocket connection fails → should show retry UI

### 5.2 Automated Tests

**Tasks:**
1. Create `backend/multiplayer/tests.py`:
   ```python
   from django.test import TestCase, TransactionTestCase
   from channels.testing import WebsocketCommunicator
   from channels.routing import URLRouter
   from django.urls import path
   from .consumers import GameConsumer
   from .models import MultiplayerRoom
   import json

   class MultiplayerRoomTestCase(TestCase):
       def test_room_creation(self):
           """Test room code generation"""
           room = MultiplayerRoom.objects.create()
           self.assertIsNotNone(room.room_code)
           self.assertEqual(len(room.room_code), 6)

       def test_unique_room_codes(self):
           """Test room codes are unique"""
           room1 = MultiplayerRoom.objects.create()
           room2 = MultiplayerRoom.objects.create()
           self.assertNotEqual(room1.room_code, room2.room_code)

       def test_join_url_generation(self):
           """Test join URL generation"""
           room = MultiplayerRoom.objects.create()
           url = room.get_join_url()
           self.assertIn(room.room_code, url)

   class WebSocketTestCase(TransactionTestCase):
       async def test_websocket_connection(self):
           """Test WebSocket connection"""
           room = await MultiplayerRoom.objects.acreate()

           application = URLRouter([
               path('ws/game/<str:room_code>/', GameConsumer.as_asgi()),
           ])

           communicator = WebsocketCommunicator(
               application,
               f'/ws/game/{room.room_code}/'
           )

           connected, _ = await communicator.connect()
           self.assertTrue(connected)

           # Receive connection confirmation
           response = await communicator.receive_json_from()
           self.assertEqual(response['type'], 'connection_established')

           await communicator.disconnect()

       async def test_draw_character(self):
           """Test character draw synchronization"""
           # Create room and connect two players
           # ... test implementation
           pass
   ```

2. Run tests:
   ```bash
   python manage.py test multiplayer
   ```

**Files Created:**
- `backend/multiplayer/tests.py`

---

## Phase 6: Production Optimization & Deployment

**Objective**: Optimize for production and deploy

### 6.1 Performance Optimizations

**Tasks:**
1. Configure Redis persistence in `backend/anifight/settings.py`:
   ```python
   CACHES = {
       'default': {
           'BACKEND': 'django.core.cache.backends.redis.RedisCache',
           'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
           'OPTIONS': {
               'CLIENT_CLASS': 'django_redis.client.DefaultClient',
               'CONNECTION_POOL_KWARGS': {
                   'max_connections': 50,
                   'retry_on_timeout': True,
               },
           },
       }
   }
   ```

2. Configure Channels Layer for production:
   ```python
   CHANNEL_LAYERS = {
       'default': {
           'BACKEND': 'channels_redis.core.RedisChannelLayer',
           'CONFIG': {
               "hosts": [os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')],
               "capacity": 2000,
               "expiry": 15,
           },
       },
   }
   ```

3. Add WebSocket compression in `consumers.py`:
   ```python
   class GameConsumer(AsyncWebsocketConsumer):
       # Enable compression
       compression = True
   ```

4. Frontend: Add service worker for offline support (optional):
   ```javascript
   // frontend/public/service-worker.js
   // Cache static assets for offline access
   ```

### 6.2 Monitoring & Logging

**Tasks:**
1. Add structured logging:
   ```python
   # backend/anifight/settings.py
   LOGGING = {
       'version': 1,
       'handlers': {
           'file': {
               'level': 'INFO',
               'class': 'logging.FileHandler',
               'filename': 'logs/multiplayer.log',
           },
       },
       'loggers': {
           'multiplayer': {
               'handlers': ['file'],
               'level': 'INFO',
           },
       },
   }
   ```

2. Add metrics tracking (optional with Django Prometheus):
   ```bash
   pip install django-prometheus
   ```

### 6.3 Deployment Configuration

**Tasks:**
1. Update `backend/requirements.txt` for production:
   ```
   # ... existing
   daphne==4.0.0
   uvicorn[standard]==0.25.0  # Alternative ASGI server
   gunicorn==21.2.0  # For HTTP
   ```

2. Create `docker-compose.yml` for deployment:
   ```yaml
   version: '3.8'

   services:
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
       command: redis-server --appendonly yes

     backend:
       build: ./backend
       command: daphne -b 0.0.0.0 -p 8000 anifight.asgi:application
       volumes:
         - ./backend:/app
       ports:
         - "8000:8000"
       environment:
         - REDIS_URL=redis://redis:6379/0
       depends_on:
         - redis
         - db

     db:
       image: postgres:15
       environment:
         POSTGRES_DB: anifight
         POSTGRES_USER: anifight
         POSTGRES_PASSWORD: password
       volumes:
         - postgres_data:/var/lib/postgresql/data

   volumes:
     redis_data:
     postgres_data:
   ```

3. Configure Nginx for WebSocket proxying:
   ```nginx
   # /etc/nginx/sites-available/anifight
   server {
       listen 80;
       server_name anifight.com;

       # WebSocket endpoint
       location /ws/ {
           proxy_pass http://localhost:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_read_timeout 86400;
       }

       # API endpoint
       location /api/ {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       # Static files
       location /static/ {
           alias /var/www/anifight/static/;
       }

       # Frontend
       location / {
           root /var/www/anifight/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

**Files Created:**
- `docker-compose.yml`
- Nginx configuration
- Production settings

---

## Summary & Acceptance Criteria

### Features Implemented:
- ✅ WebSocket-based real-time multiplayer
- ✅ Room creation with code, link, and QR
- ✅ Resilient connection with auto-reconnect (exponential backoff)
- ✅ 10-second grace period for disconnections
- ✅ Network change handling (WiFi ↔ mobile data)
- ✅ Screen lock handling
- ✅ State synchronization via event sourcing
- ✅ Heartbeat mechanism for connection monitoring
- ✅ Visual connection status indicators
- ✅ Opponent disconnect notifications
- ✅ Force-end game after 10s disconnect
- ✅ Auto-end if both players disconnect

### Technology Stack:
- **Backend**: Django Channels + Redis
- **WebSocket**: Native WebSocket with auto-reconnect
- **State Management**: Event sourcing with Redis cache
- **QR Codes**: qrcode library (backend + frontend)
- **Connection Resilience**: Heartbeat + exponential backoff

### Acceptance Criteria:
- [ ] User can click "Online Multiplayer" button from StartScreen
- [ ] Room created with 6-character code, join link, and QR code
- [ ] Guest can join via link, QR, or manual code entry
- [ ] Both players see each other's connection status
- [ ] Game starts only when both connected
- [ ] Actions synchronized in real-time (draw, placement)
- [ ] Screen lock for <10s → auto-reconnect
- [ ] WiFi disconnect for <10s → auto-reconnect
- [ ] Network switch (WiFi → mobile) → auto-reconnect
- [ ] Player disconnect >10s → show results to other player
- [ ] Both players disconnect → room abandoned
- [ ] Page refresh → state restored from Redis
- [ ] Connection status visible at all times
- [ ] Works on mobile and desktop

### Estimated Timeline:
- **Phase 1**: Backend WebSocket (3-4 days)
- **Phase 2**: Frontend WebSocket (2-3 days)
- **Phase 3**: Draft Screen Integration (2 days)
- **Phase 4**: Connection Resilience (2-3 days)
- **Phase 5**: Testing (2 days)
- **Phase 6**: Production Deployment (1-2 days)

**Total: 12-16 days**

---

## Getting Started

**Installation:**
```bash
# Backend
cd backend
pip install -r requirements.txt
brew install redis
brew services start redis
python manage.py makemigrations
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

**Testing WebSocket:**
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Django
cd backend
python manage.py runserver

# Terminal 3: Start Frontend
cd frontend
npm run dev

# Open two browsers:
# Browser 1: http://localhost:5174/ → Click "Online Multiplayer"
# Browser 2: http://localhost:5174/join/XXXXXX (use code from Browser 1)
```

---

## Additional Notes

- **Security**: Add CSRF protection, rate limiting on room creation
- **Scaling**: Use Redis Cluster for horizontal scaling
- **Monitoring**: Add Sentry for error tracking
- **Analytics**: Track multiplayer usage metrics
- **Future**: Add chat, emotes, spectator mode, tournaments
