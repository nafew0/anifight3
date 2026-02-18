from django.contrib import admin
from .models import MultiplayerRoom, GameAction


@admin.register(MultiplayerRoom)
class MultiplayerRoomAdmin(admin.ModelAdmin):
    list_display = [
        'room_code', 'host_nickname', 'guest_nickname',
        'status', 'host_connected', 'guest_connected',
        'created_at', 'started_at'
    ]
    list_filter = ['status', 'created_at', 'host_connected', 'guest_connected']
    search_fields = ['room_code', 'host_nickname', 'guest_nickname']
    readonly_fields = [
        'room_code', 'redis_state_key', 'created_at',
        'started_at', 'completed_at', 'host_last_seen', 'guest_last_seen'
    ]
    fieldsets = (
        ('Room Information', {
            'fields': ('room_code', 'status', 'redis_state_key')
        }),
        ('Players', {
            'fields': (
                'host', 'host_nickname', 'host_session_id', 'host_connected', 'host_last_seen',
                'guest', 'guest_nickname', 'guest_session_id', 'guest_connected', 'guest_last_seen'
            )
        }),
        ('Game Configuration', {
            'fields': ('template_id', 'anime_pool_ids')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'started_at', 'completed_at')
        }),
    )


@admin.register(GameAction)
class GameActionAdmin(admin.ModelAdmin):
    list_display = [
        'room', 'action_type', 'player_role',
        'sequence_number', 'timestamp'
    ]
    list_filter = ['action_type', 'player_role', 'timestamp']
    search_fields = ['room__room_code']
    readonly_fields = ['timestamp']
    ordering = ['room', 'sequence_number']
