"""
Comprehensive test suite for multiplayer functionality.

Tests cover:
- Model creation and validation
- WebSocket connections and communication
- API endpoints
- Edge cases
"""

from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth.models import User
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from django.urls import path
from rest_framework.test import APITestCase
from rest_framework import status
import json
from datetime import timedelta

from .models import MultiplayerRoom, GameAction
from .consumers import GameConsumer


# =============================================================================
# Model Tests
# =============================================================================

class MultiplayerRoomModelTestCase(TestCase):
    """Test MultiplayerRoom model functionality"""

    def test_room_code_auto_generation(self):
        """Test that room code is automatically generated on save"""
        room = MultiplayerRoom.objects.create()
        self.assertIsNotNone(room.room_code)
        self.assertEqual(len(room.room_code), 6)
        self.assertTrue(room.room_code.isupper())

    def test_unique_room_codes(self):
        """Test that generated room codes are unique"""
        room1 = MultiplayerRoom.objects.create()
        room2 = MultiplayerRoom.objects.create()
        self.assertNotEqual(room1.room_code, room2.room_code)

    def test_manual_room_code(self):
        """Test creating room with manual room code"""
        room = MultiplayerRoom.objects.create(room_code='TEST01')
        self.assertEqual(room.room_code, 'TEST01')

    def test_redis_state_key_auto_generation(self):
        """Test that Redis state key is automatically generated"""
        room = MultiplayerRoom.objects.create()
        expected_key = f'game_state:{room.room_code}'
        self.assertEqual(room.redis_state_key, expected_key)

    def test_join_url_generation(self):
        """Test join URL generation"""
        room = MultiplayerRoom.objects.create(room_code='ABC123')
        url = room.get_join_url()
        self.assertIn('ABC123', url)
        self.assertIn('/join/', url)

    def test_join_url_with_custom_base(self):
        """Test join URL with custom base URL"""
        room = MultiplayerRoom.objects.create(room_code='ABC123')
        url = room.get_join_url(base_url='https://example.com')
        self.assertEqual(url, 'https://example.com/join/ABC123')

    def test_room_initial_status(self):
        """Test that new room has 'waiting' status"""
        room = MultiplayerRoom.objects.create()
        self.assertEqual(room.status, 'waiting')

    def test_room_status_transitions(self):
        """Test room status can transition through states"""
        room = MultiplayerRoom.objects.create()

        # waiting -> ready
        room.status = 'ready'
        room.save()
        self.assertEqual(room.status, 'ready')

        # ready -> in_progress
        room.status = 'in_progress'
        room.save()
        self.assertEqual(room.status, 'in_progress')

        # in_progress -> completed
        room.status = 'completed'
        room.save()
        self.assertEqual(room.status, 'completed')

    def test_room_is_not_expired_when_in_progress(self):
        """Test that in-progress rooms never expire"""
        room = MultiplayerRoom.objects.create(status='in_progress')
        # Manually set old created_at
        room.created_at = timezone.now() - timedelta(hours=2)
        room.save()
        self.assertFalse(room.is_expired())

    def test_room_is_expired_after_30_minutes(self):
        """Test that waiting rooms expire after 30 minutes"""
        room = MultiplayerRoom.objects.create(status='waiting')
        # Manually set old created_at
        room.created_at = timezone.now() - timedelta(minutes=31)
        room.save()
        self.assertTrue(room.is_expired())

    def test_room_is_not_expired_within_30_minutes(self):
        """Test that rooms don't expire within 30 minutes"""
        room = MultiplayerRoom.objects.create(status='waiting')
        self.assertFalse(room.is_expired())

    def test_room_connection_tracking(self):
        """Test connection tracking fields"""
        room = MultiplayerRoom.objects.create()
        self.assertTrue(room.host_connected)
        self.assertFalse(room.guest_connected)
        self.assertIsNotNone(room.host_last_seen)
        self.assertIsNone(room.guest_last_seen)

    def test_room_with_authenticated_users(self):
        """Test room with authenticated users"""
        host_user = User.objects.create_user('host', 'host@test.com', 'password')
        guest_user = User.objects.create_user('guest', 'guest@test.com', 'password')

        room = MultiplayerRoom.objects.create(
            host=host_user,
            guest=guest_user
        )

        self.assertEqual(room.host, host_user)
        self.assertEqual(room.guest, guest_user)

    def test_room_str_representation(self):
        """Test string representation of room"""
        room = MultiplayerRoom.objects.create(room_code='ABC123', status='waiting')
        self.assertEqual(str(room), 'Room ABC123 - waiting')


class GameActionModelTestCase(TestCase):
    """Test GameAction model functionality"""

    def setUp(self):
        self.room = MultiplayerRoom.objects.create(room_code='TEST01')

    def test_game_action_creation(self):
        """Test creating a game action"""
        action = GameAction.objects.create(
            room=self.room,
            action_type='DRAW_CHARACTER',
            player_role='host',
            action_data={'character_id': 123},
            sequence_number=1
        )

        self.assertEqual(action.room, self.room)
        self.assertEqual(action.action_type, 'DRAW_CHARACTER')
        self.assertEqual(action.player_role, 'host')
        self.assertEqual(action.sequence_number, 1)

    def test_game_action_ordering(self):
        """Test that actions are ordered by sequence_number"""
        action2 = GameAction.objects.create(
            room=self.room,
            action_type='PLACE_CHARACTER',
            player_role='host',
            action_data={'slot': 1},
            sequence_number=2
        )

        action1 = GameAction.objects.create(
            room=self.room,
            action_type='DRAW_CHARACTER',
            player_role='host',
            action_data={'character_id': 123},
            sequence_number=1
        )

        actions = list(self.room.actions.all())
        self.assertEqual(actions[0], action1)
        self.assertEqual(actions[1], action2)

    def test_game_action_cascade_delete(self):
        """Test that actions are deleted when room is deleted"""
        GameAction.objects.create(
            room=self.room,
            action_type='DRAW_CHARACTER',
            player_role='host',
            action_data={'character_id': 123},
            sequence_number=1
        )

        room_id = self.room.id
        self.room.delete()

        # Verify actions are deleted
        actions = GameAction.objects.filter(room_id=room_id)
        self.assertEqual(actions.count(), 0)

    def test_game_action_str_representation(self):
        """Test string representation of game action"""
        action = GameAction.objects.create(
            room=self.room,
            action_type='DRAW_CHARACTER',
            player_role='host',
            action_data={'character_id': 123},
            sequence_number=1
        )

        expected = f"{self.room.room_code} - DRAW_CHARACTER #1"
        self.assertEqual(str(action), expected)


# =============================================================================
# API Tests
# =============================================================================

class MultiplayerAPITestCase(APITestCase):
    """Test multiplayer API endpoints"""

    def test_create_room_endpoint(self):
        """Test creating a room via API"""
        url = reverse('create-room')
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('room_code', response.data)
        self.assertIn('join_url', response.data)
        self.assertEqual(response.data['status'], 'waiting')
        self.assertEqual(len(response.data['room_code']), 6)

    def test_get_room_detail(self):
        """Test getting room details via API"""
        room = MultiplayerRoom.objects.create(room_code='TEST01')
        url = reverse('room-detail', kwargs={'room_code': 'TEST01'})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['room_code'], 'TEST01')
        self.assertEqual(response.data['status'], 'waiting')

    def test_get_nonexistent_room(self):
        """Test getting details of non-existent room"""
        url = reverse('room-detail', kwargs={'room_code': 'NOTFOUND'})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_join_room_endpoint(self):
        """Test joining a room via API"""
        room = MultiplayerRoom.objects.create(room_code='TEST01', status='waiting')
        url = reverse('join-room')

        response = self.client.post(url, {'room_code': 'TEST01'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['room_code'], 'TEST01')
        self.assertIn('can_join', response.data)

    def test_join_nonexistent_room(self):
        """Test joining non-existent room"""
        url = reverse('join-room')
        response = self.client.post(url, {'room_code': 'NOTFOUND'})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_join_full_room(self):
        """Test joining a room that already has a guest"""
        room = MultiplayerRoom.objects.create(
            room_code='TEST01',
            status='ready',
            guest_session_id='existing_guest'
        )

        url = reverse('join-room')
        response = self.client.post(url, {'room_code': 'TEST01'})

        # Should still return room info but indicate can't join
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_start_game_endpoint(self):
        """Test starting a game via API"""
        room = MultiplayerRoom.objects.create(
            room_code='TEST01',
            status='ready'
        )

        url = reverse('start-game')
        response = self.client.post(url, {
            'room_code': 'TEST01',
            'template_id': 1,
            'anime_pool_ids': [1, 2, 3]
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify room status changed
        room.refresh_from_db()
        self.assertEqual(room.status, 'in_progress')
        self.assertEqual(room.template_id, 1)


# =============================================================================
# WebSocket Tests
# =============================================================================

class WebSocketConnectionTestCase(TransactionTestCase):
    """Test WebSocket connections"""

    async def test_websocket_connection(self):
        """Test establishing WebSocket connection"""
        room = await MultiplayerRoom.objects.acreate(room_code='TEST01')

        application = URLRouter([
            path('ws/game/<str:room_code>/', GameConsumer.as_asgi()),
        ])

        communicator = WebsocketCommunicator(
            application,
            f'/ws/game/{room.room_code}/'
        )

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Should receive connection_established message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'connection_established')
        self.assertIn('player_role', response)

        await communicator.disconnect()

    async def test_websocket_connection_invalid_room(self):
        """Test connecting to non-existent room creates it"""
        application = URLRouter([
            path('ws/game/<str:room_code>/', GameConsumer.as_asgi()),
        ])

        communicator = WebsocketCommunicator(
            application,
            '/ws/game/NEWROOM/'
        )

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Room should be created
        room_exists = await MultiplayerRoom.objects.filter(room_code='NEWROOM').aexists()
        self.assertTrue(room_exists)

        await communicator.disconnect()

    async def test_websocket_player_join_notification(self):
        """Test that host is notified when guest joins"""
        room = await MultiplayerRoom.objects.acreate(room_code='TEST01')

        application = URLRouter([
            path('ws/game/<str:room_code>/', GameConsumer.as_asgi()),
        ])

        # Connect host
        host_comm = WebsocketCommunicator(application, '/ws/game/TEST01/')
        await host_comm.connect()
        host_msg = await host_comm.receive_json_from()
        self.assertEqual(host_msg['player_role'], 'host')

        # Connect guest
        guest_comm = WebsocketCommunicator(application, '/ws/game/TEST01/')
        await guest_comm.connect()
        guest_msg = await guest_comm.receive_json_from()
        self.assertEqual(guest_msg['player_role'], 'guest')

        # Host should receive player_joined message
        join_notification = await host_comm.receive_json_from()
        self.assertEqual(join_notification['type'], 'player_joined')

        await host_comm.disconnect()
        await guest_comm.disconnect()


# =============================================================================
# Edge Case Tests
# =============================================================================

class EdgeCaseTestCase(TestCase):
    """Test edge cases and error handling"""

    def test_room_code_collision_prevention(self):
        """Test that room code generation prevents collisions"""
        # Create 10 rooms and verify all codes are unique
        rooms = [MultiplayerRoom.objects.create() for _ in range(10)]
        codes = [room.room_code for room in rooms]

        self.assertEqual(len(codes), len(set(codes)), "Room codes should be unique")

    def test_expired_room_detection(self):
        """Test detecting expired rooms"""
        # Create old room
        old_room = MultiplayerRoom.objects.create(status='waiting')
        old_room.created_at = timezone.now() - timedelta(minutes=35)
        old_room.save()

        # Create recent room
        recent_room = MultiplayerRoom.objects.create(status='waiting')

        self.assertTrue(old_room.is_expired())
        self.assertFalse(recent_room.is_expired())

    def test_multiple_actions_same_room(self):
        """Test handling multiple actions in same room"""
        room = MultiplayerRoom.objects.create()

        actions = []
        for i in range(5):
            action = GameAction.objects.create(
                room=room,
                action_type=f'ACTION_{i}',
                player_role='host',
                action_data={'index': i},
                sequence_number=i + 1
            )
            actions.append(action)

        # Verify all actions are associated with room
        self.assertEqual(room.actions.count(), 5)

        # Verify ordering
        room_actions = list(room.actions.all())
        for i, action in enumerate(room_actions):
            self.assertEqual(action.sequence_number, i + 1)

    def test_room_with_no_players(self):
        """Test room can exist without players"""
        room = MultiplayerRoom.objects.create()

        self.assertIsNone(room.host)
        self.assertIsNone(room.guest)
        self.assertIsNone(room.host_session_id)
        self.assertIsNone(room.guest_session_id)

    def test_room_status_invalid_transition(self):
        """Test that we can track invalid status transitions"""
        room = MultiplayerRoom.objects.create(status='completed')

        # While Django doesn't prevent this at model level,
        # we can verify status can be set
        room.status = 'waiting'
        room.save()

        # In production, this would be prevented by business logic
        self.assertEqual(room.status, 'waiting')


# =============================================================================
# Integration Tests
# =============================================================================

class IntegrationTestCase(TestCase):
    """Test full workflows"""

    def test_full_room_lifecycle(self):
        """Test complete room lifecycle from creation to completion"""
        # Create room
        room = MultiplayerRoom.objects.create()
        self.assertEqual(room.status, 'waiting')

        # Guest joins (simulated)
        room.guest_session_id = 'guest123'
        room.status = 'ready'
        room.save()

        # Start game
        room.status = 'in_progress'
        room.template_id = 1
        room.anime_pool_ids = [1, 2, 3]
        room.started_at = timezone.now()
        room.save()

        # Complete game
        room.status = 'completed'
        room.completed_at = timezone.now()
        room.save()

        # Verify final state
        self.assertEqual(room.status, 'completed')
        self.assertIsNotNone(room.started_at)
        self.assertIsNotNone(room.completed_at)

    def test_room_abandonment(self):
        """Test marking room as abandoned"""
        room = MultiplayerRoom.objects.create(status='in_progress')

        # Simulate abandonment
        room.status = 'abandoned'
        room.save()

        self.assertEqual(room.status, 'abandoned')
