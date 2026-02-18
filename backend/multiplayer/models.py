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

    def __str__(self):
        return f"Room {self.room_code} - {self.status}"


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

    def __str__(self):
        return f"{self.room.room_code} - {self.action_type} #{self.sequence_number}"
