"""
Django management command to load Top 3 Anime (One Piece, Naruto, Bleach)
and their characters into the database.

Usage:
    python manage.py load_top3_anime
    python manage.py load_top3_anime --clear  (clears existing data first)
"""

from django.core.management.base import BaseCommand, CommandError
from game.models import Anime, Character


class Command(BaseCommand):
    help = 'Loads Top 3 Anime (One Piece, Naruto, Bleach) and their characters'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing anime and characters before loading',
        )

    def handle(self, *args, **options):
        # Clear existing data if requested
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            Character.objects.all().delete()
            Anime.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ Cleared all anime and characters'))

        # Anime data with power scales
        anime_data = [
            {'name': 'One Piece', 'power_scale': 1.5},
            {'name': 'Naruto', 'power_scale': 1.3},
            {'name': 'Bleach', 'power_scale': 1.8},
        ]

        # Create anime
        self.stdout.write('Creating anime...')
        anime_objects = {}
        for anime_info in anime_data:
            anime, created = Anime.objects.get_or_create(
                name=anime_info['name']
            )
            anime_objects[anime_info['name']] = {
                'anime': anime,
                'power_scale': anime_info['power_scale']
            }
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'  {status}: {anime.name} (power scale: {anime_info["power_scale"]})')

        # Characters data
        characters_data = [
            # One Piece Characters
            {'name': 'Monkey D. Luffy', 'anime': 'One Piece', 'power': 95.0, 'specialties': ['CAPTAIN']},
            {'name': 'Roronoa Zoro', 'anime': 'One Piece', 'power': 93.0, 'specialties': ['VICE CAPTAIN', 'TANK']},
            {'name': 'Sanji', 'anime': 'One Piece', 'power': 90.0, 'specialties': ['SUPPORT']},
            {'name': 'Nami', 'anime': 'One Piece', 'power': 75.0, 'specialties': ['SUPPORT']},
            {'name': 'Nico Robin', 'anime': 'One Piece', 'power': 82.0, 'specialties': ['SUPPORT']},
            {'name': 'Tony Tony Chopper', 'anime': 'One Piece', 'power': 70.0, 'specialties': ['HEALER']},
            {'name': 'Usopp', 'anime': 'One Piece', 'power': 68.0, 'specialties': ['SUPPORT']},
            {'name': 'Brook', 'anime': 'One Piece', 'power': 72.0, 'specialties': ['SUPPORT']},
            {'name': 'Franky', 'anime': 'One Piece', 'power': 78.0, 'specialties': ['TANK']},
            {'name': 'Jinbe', 'anime': 'One Piece', 'power': 88.0, 'specialties': ['TANK']},

            # Naruto Characters
            {'name': 'Naruto Uzumaki', 'anime': 'Naruto', 'power': 95.0, 'specialties': ['CAPTAIN']},
            {'name': 'Sasuke Uchiha', 'anime': 'Naruto', 'power': 93.0, 'specialties': ['VICE CAPTAIN']},
            {'name': 'Kakashi Hatake', 'anime': 'Naruto', 'power': 88.0, 'specialties': ['SUPPORT']},
            {'name': 'Sakura Haruno', 'anime': 'Naruto', 'power': 80.0, 'specialties': ['HEALER']},
            {'name': 'Rock Lee', 'anime': 'Naruto', 'power': 82.0, 'specialties': ['TANK']},
            {'name': 'Itachi Uchiha', 'anime': 'Naruto', 'power': 96.0, 'specialties': ['CAPTAIN']},
            {'name': 'Minato Namikaze', 'anime': 'Naruto', 'power': 97.0, 'specialties': ['CAPTAIN']},
            {'name': 'Jiraiya', 'anime': 'Naruto', 'power': 90.0, 'specialties': ['SUPPORT']},
            {'name': 'Tsunade', 'anime': 'Naruto', 'power': 85.0, 'specialties': ['HEALER']},
            {'name': 'Might Guy', 'anime': 'Naruto', 'power': 87.0, 'specialties': ['TANK']},

            # Bleach Characters
            {'name': 'Ichigo Kurosaki', 'anime': 'Bleach', 'power': 96.0, 'specialties': ['CAPTAIN']},
            {'name': 'Rukia Kuchiki', 'anime': 'Bleach', 'power': 82.0, 'specialties': ['SUPPORT']},
            {'name': 'Renji Abarai', 'anime': 'Bleach', 'power': 85.0, 'specialties': ['VICE CAPTAIN']},
            {'name': 'Byakuya Kuchiki', 'anime': 'Bleach', 'power': 94.0, 'specialties': ['CAPTAIN']},
            {'name': 'Kenpachi Zaraki', 'anime': 'Bleach', 'power': 98.0, 'specialties': ['TANK']},
            {'name': 'Toshiro Hitsugaya', 'anime': 'Bleach', 'power': 88.0, 'specialties': ['VICE CAPTAIN']},
            {'name': 'Yoruichi Shihoin', 'anime': 'Bleach', 'power': 90.0, 'specialties': ['SUPPORT']},
            {'name': 'Kisuke Urahara', 'anime': 'Bleach', 'power': 92.0, 'specialties': ['SUPPORT']},
            {'name': 'Orihime Inoue', 'anime': 'Bleach', 'power': 75.0, 'specialties': ['HEALER']},
            {'name': 'Uryu Ishida', 'anime': 'Bleach', 'power': 78.0, 'specialties': ['SUPPORT']},
        ]

        # Create characters
        self.stdout.write('\nCreating characters...')
        created_count = 0
        exists_count = 0

        for char_data in characters_data:
            anime_name = char_data['anime']
            anime_obj = anime_objects[anime_name]['anime']
            power_scale = anime_objects[anime_name]['power_scale']

            character, created = Character.objects.get_or_create(
                name=char_data['name'],
                defaults={
                    'anime': anime_obj,
                    'anime_power_scale': power_scale,
                    'character_power': char_data['power'],
                    'specialties': char_data['specialties'],
                }
            )

            if created:
                created_count += 1
                status = '✓'
            else:
                exists_count += 1
                status = '→'

            draw_score = power_scale * char_data['power']
            self.stdout.write(
                f'  {status} {char_data["name"]} '
                f'({anime_name}, Power: {char_data["power"]}, '
                f'Draw Score: {draw_score:.1f})'
            )

        # Summary
        self.stdout.write(self.style.SUCCESS(f'\n✓ Data loading complete!'))
        self.stdout.write(f'  Anime: {len(anime_data)} total')
        self.stdout.write(f'  Characters: {created_count} created, {exists_count} already existed')
        self.stdout.write(f'  Total characters: {len(characters_data)}')

        # Display draw score ranges
        self.stdout.write('\n📊 Draw Score Ranges:')
        for anime_name, data in anime_objects.items():
            chars = Character.objects.filter(anime=data['anime'])
            if chars.exists():
                scores = [c.character_power * c.anime_power_scale for c in chars]
                min_score = min(scores)
                max_score = max(scores)
                self.stdout.write(
                    f'  {anime_name}: {min_score:.1f} - {max_score:.1f} '
                    f'(power scale: {data["power_scale"]})'
                )
