"""
Management command to seed default game data
Usage: python manage.py seed_default_data
"""
from django.core.management.base import BaseCommand
from game.models import GameTemplate


class Command(BaseCommand):
    help = 'Creates default GameTemplate and sample data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding default data...')

        # Create default GameTemplate
        template, created = GameTemplate.objects.get_or_create(
            name='Standard 6v6',
            defaults={
                'is_published': True,
                'roles_json': [
                    "CAPTAIN",
                    "VICE CAPTAIN",
                    "TANK",
                    "HEALER",
                    "SUPPORT",
                    "SUPPORT"
                ],
                'specialty_match_multiplier': 1.20,
                'rating_bands_json': {
                    "S": {"min": 90, "label": "INSANE PULL!"},
                    "A": {"min": 70, "label": "HUGE WIN!"},
                    "B": {"min": 40, "label": "Nice pick"},
                    "C": {"min": 10, "label": "Meh…"},
                    "D": {"min": 0, "label": "Oof."}
                }
            }
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(f'✓ Created GameTemplate: {template.name}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'⚠ GameTemplate "{template.name}" already exists')
            )

        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('Default data seeding complete!'))
        self.stdout.write('='*50)
        self.stdout.write(f'\nGameTemplates: {GameTemplate.objects.count()}')
        self.stdout.write(f'Published Templates: {GameTemplate.objects.filter(is_published=True).count()}')
        self.stdout.write('\nNext steps:')
        self.stdout.write('1. Go to http://localhost:8000/admin')
        self.stdout.write('2. Import anime using: backend/sample_data/anime_sample.csv')
        self.stdout.write('3. Import characters using: backend/sample_data/characters_sample.csv')
