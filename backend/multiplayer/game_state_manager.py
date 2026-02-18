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
            'remaining_character_ids': anime_pool_ids.copy(),  # Will be updated as characters are drawn
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
        state['sequence_number'] = state.get('sequence_number', 0) + 1

        # Update state based on action type
        if action_type == 'DRAW_CHARACTER':
            state['drawn_characters'].append(action_data['character'])
            # Remove from remaining
            char_id = action_data['character']['id']
            if char_id in state.get('remaining_character_ids', []):
                state['remaining_character_ids'].remove(char_id)

        elif action_type == 'PLACE_CHARACTER':
            placements_key = f'{player_role}_placements'
            if placements_key not in state:
                state[placements_key] = {}
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
        from channels.db import database_sync_to_async

        @database_sync_to_async
        def get_template_roles():
            template = GameTemplate.objects.get(id=state['template_id'])
            return json.loads(template.roles_json)

        try:
            roles = await get_template_roles()
            return (
                len(state.get('host_placements', {})) == len(roles) and
                len(state.get('guest_placements', {})) == len(roles)
            )
        except:
            return False

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
        for action in actions:
            # Re-apply action logic
            await self.add_action(
                action['action_type'],
                action['player_role'],
                action['action_data']
            )

        state = await self.get_state()
        return state
