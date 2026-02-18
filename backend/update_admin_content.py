#!/usr/bin/env python
"""
Data migration script to update existing content as admin content.

This script:
1. Sets all existing Anime to is_public=True (admin content is always public)
2. Verifies that owner=null for existing content (already default from migration)
3. Shows stats about the update
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'anifight.settings')
django.setup()

from game.models import Anime, Character, GameTemplate

def update_admin_content():
    """Update all existing content to be admin content (public)"""

    print("=" * 60)
    print("Updating Existing Content as Admin Content")
    print("=" * 60)
    print()

    # Count existing content
    anime_count = Anime.objects.filter(owner__isnull=True).count()
    character_count = Character.objects.filter(owner__isnull=True).count()
    template_count = GameTemplate.objects.filter(owner__isnull=True).count()

    print(f"Found admin content (owner=null):")
    print(f"  - Anime: {anime_count}")
    print(f"  - Characters: {character_count}")
    print(f"  - Game Templates: {template_count}")
    print()

    # Update all admin anime to be public
    anime_updated = Anime.objects.filter(owner__isnull=True).update(is_public=True)

    print(f"Updated {anime_updated} anime to is_public=True")
    print()

    # Verify the update
    print("Verification:")
    public_anime = Anime.objects.filter(owner__isnull=True, is_public=True).count()
    print(f"  - Admin anime with is_public=True: {public_anime}/{anime_count}")

    if public_anime == anime_count:
        print()
        print("✅ All admin anime successfully set to public!")
    else:
        print()
        print("⚠️  Some anime may not have been updated correctly.")

    print()
    print("=" * 60)
    print("Data Migration Complete")
    print("=" * 60)

    # Show sample anime
    print()
    print("Sample admin anime:")
    for anime in Anime.objects.filter(owner__isnull=True)[:5]:
        print(f"  - {anime.name}: is_public={anime.is_public}, avg_rating={anime.average_rating}, total_ratings={anime.total_ratings}")

if __name__ == '__main__':
    update_admin_content()
