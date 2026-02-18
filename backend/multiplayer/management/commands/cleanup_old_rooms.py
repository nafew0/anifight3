from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.cache import cache
from multiplayer.models import MultiplayerRoom
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up old/abandoned multiplayer rooms'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Delete rooms older than this many hours (default: 24)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']

        # Calculate cutoff time
        cutoff = timezone.now() - timezone.timedelta(hours=hours)

        # Find old rooms
        old_rooms = MultiplayerRoom.objects.filter(created_at__lt=cutoff)
        count = old_rooms.count()

        if count == 0:
            self.stdout.write(
                self.style.SUCCESS(f'No rooms older than {hours} hours found.')
            )
            return

        self.stdout.write(
            self.style.WARNING(f'Found {count} rooms older than {hours} hours:')
        )

        # List rooms to be deleted
        for room in old_rooms:
            age_hours = (timezone.now() - room.created_at).total_seconds() / 3600
            self.stdout.write(
                f'  - Room {room.room_code} (Status: {room.status}, Age: {age_hours:.1f} hours)'
            )

            if not dry_run:
                # Clean up Redis cache for this room
                cache_key = f'game_state:{room.room_code}'
                if cache.get(cache_key):
                    cache.delete(cache_key)
                    logger.info(f'Deleted Redis cache for room {room.room_code}')

        # Delete rooms (this will cascade to GameAction due to foreign key)
        if not dry_run:
            deleted_count, _ = old_rooms.delete()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully deleted {deleted_count} rooms and their associated data.'
                )
            )
            logger.info(f'Cleanup completed: deleted {deleted_count} old rooms')
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would have deleted {count} rooms. Run without --dry-run to actually delete.'
                )
            )
