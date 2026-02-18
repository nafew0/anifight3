#!/usr/bin/env python
"""
Test script for Phase 2: Database Schema Updates

Tests:
1. User can create anime with ownership
2. User can create anime without ownership (admin)
3. Anime visibility flags work correctly
4. Rating fields have correct defaults
5. AnimeRating model works with unique constraint
6. Rating calculations update anime fields
7. Rating validation (1-5 range)
8. Character and GameTemplate ownership
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'anifight.settings')
django.setup()

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from game.models import Anime, Character, GameTemplate, AnimeRating

def run_tests():
    print("=" * 70)
    print("PHASE 2: Database Schema Updates - Model Tests")
    print("=" * 70)
    print()

    # Create a test user
    test_user, created = User.objects.get_or_create(
        username='testmodeluser',
        defaults={'email': 'testmodel@example.com'}
    )
    if created:
        test_user.set_password('testpass123')
        test_user.save()
        print(f"✅ Created test user: {test_user.username}")
    else:
        print(f"✅ Using existing test user: {test_user.username}")
    print()

    # Test 1: Create admin anime (owner=null)
    print("TEST 1: Create Admin Anime (owner=null)")
    try:
        admin_anime = Anime.objects.create(
            name="Test Admin Anime",
            anime_power_scale=5.0,
            is_public=True  # Admin content is always public
        )
        assert admin_anime.owner is None, "Admin anime should have owner=null"
        assert admin_anime.is_public == True, "Admin anime should be public"
        assert admin_anime.average_rating == 0.00, "Default rating should be 0.00"
        assert admin_anime.total_ratings == 0, "Default total_ratings should be 0"
        print(f"   ✅ Created: {admin_anime.name} (owner=null, is_public={admin_anime.is_public})")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    print()

    # Test 2: Create user-owned anime (private)
    print("TEST 2: Create User-Owned Anime (private)")
    try:
        user_anime_private = Anime.objects.create(
            owner=test_user,
            name="Test User Private Anime",
            anime_power_scale=3.5,
            is_public=False
        )
        assert user_anime_private.owner == test_user, "Should have correct owner"
        assert user_anime_private.is_public == False, "Should be private"
        print(f"   ✅ Created: {user_anime_private.name} (owner={user_anime_private.owner.username}, is_public=False)")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    print()

    # Test 3: Create user-owned anime (public)
    print("TEST 3: Create User-Owned Anime (public)")
    try:
        user_anime_public = Anime.objects.create(
            owner=test_user,
            name="Test User Public Anime",
            anime_power_scale=4.0,
            is_public=True
        )
        assert user_anime_public.owner == test_user, "Should have correct owner"
        assert user_anime_public.is_public == True, "Should be public"
        print(f"   ✅ Created: {user_anime_public.name} (owner={user_anime_public.owner.username}, is_public=True)")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    print()

    # Test 4: Create character with ownership
    print("TEST 4: Create Character with Owner")
    try:
        user_character = Character.objects.create(
            owner=test_user,
            anime=user_anime_public,
            name="Test User Character",
            character_power=50.0,
            specialties=["CAPTAIN", "TANK"]
        )
        assert user_character.owner == test_user, "Character should have correct owner"
        assert user_character.anime == user_anime_public, "Character should link to anime"
        print(f"   ✅ Created: {user_character.name} (owner={user_character.owner.username}, anime={user_character.anime.name})")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    print()

    # Test 5: Create game template with ownership
    print("TEST 5: Create GameTemplate with Owner")
    try:
        user_template = GameTemplate.objects.create(
            owner=test_user,
            name="Test User Template",
            roles_json=["CAPTAIN", "TANK", "HEALER"],
            is_published=False
        )
        assert user_template.owner == test_user, "Template should have correct owner"
        assert user_template.is_published == False, "Should not be published by default"
        print(f"   ✅ Created: {user_template.name} (owner={user_template.owner.username}, published={user_template.is_published})")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    print()

    # Test 6: Create rating for anime
    print("TEST 6: Create AnimeRating")
    try:
        rating1 = AnimeRating.objects.create(
            anime=user_anime_public,
            user=test_user,
            rating=4
        )
        # Refresh anime from database to get updated ratings
        user_anime_public.refresh_from_db()
        assert user_anime_public.average_rating == 4.00, f"Average should be 4.00, got {user_anime_public.average_rating}"
        assert user_anime_public.total_ratings == 1, f"Total should be 1, got {user_anime_public.total_ratings}"
        print(f"   ✅ Created rating: {rating1.rating}/5 for {rating1.anime.name}")
        print(f"      Updated anime: avg={user_anime_public.average_rating}, total={user_anime_public.total_ratings}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    print()

    # Test 7: Rating validation (must be 1-5)
    print("TEST 7: Rating Validation (1-5 range)")
    try:
        # Try to create invalid rating (should fail)
        invalid_rating = AnimeRating(
            anime=admin_anime,
            user=test_user,
            rating=10  # Invalid: > 5
        )
        invalid_rating.full_clean()  # This should raise ValidationError
        print(f"   ❌ Failed: Invalid rating (10) was allowed")
    except ValidationError as e:
        print(f"   ✅ Correctly rejected invalid rating: {e}")
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
    print()

    # Test 8: Unique constraint (one rating per user per anime)
    print("TEST 8: Unique Constraint (one rating per user per anime)")
    try:
        # Try to create duplicate rating (should fail)
        duplicate_rating = AnimeRating.objects.create(
            anime=user_anime_public,
            user=test_user,
            rating=5
        )
        print(f"   ❌ Failed: Duplicate rating was allowed")
    except IntegrityError as e:
        print(f"   ✅ Correctly rejected duplicate rating")
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
    print()

    # Test 9: Update existing rating
    print("TEST 9: Update Existing Rating")
    try:
        # Get the existing rating
        existing_rating = AnimeRating.objects.get(anime=user_anime_public, user=test_user)
        old_rating = existing_rating.rating

        # Update it
        existing_rating.rating = 5
        existing_rating.save()

        # Refresh anime
        user_anime_public.refresh_from_db()

        print(f"   ✅ Updated rating: {old_rating}/5 → {existing_rating.rating}/5")
        print(f"      Updated anime: avg={user_anime_public.average_rating}, total={user_anime_public.total_ratings}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    print()

    # Test 10: Multiple ratings average calculation
    print("TEST 10: Multiple Ratings Average Calculation")
    try:
        # Create another user
        user2, _ = User.objects.get_or_create(
            username='testmodeluser2',
            defaults={'email': 'testmodel2@example.com'}
        )

        # Add second rating
        rating2 = AnimeRating.objects.create(
            anime=user_anime_public,
            user=user2,
            rating=3
        )

        # Refresh anime
        user_anime_public.refresh_from_db()

        # Average should be (5 + 3) / 2 = 4.0
        expected_avg = 4.0
        assert user_anime_public.average_rating == expected_avg, f"Average should be {expected_avg}, got {user_anime_public.average_rating}"
        assert user_anime_public.total_ratings == 2, f"Total should be 2, got {user_anime_public.total_ratings}"

        print(f"   ✅ Ratings: 5/5, 3/5")
        print(f"      Calculated: avg={user_anime_public.average_rating}, total={user_anime_public.total_ratings}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    print()

    # Cleanup
    print("Cleaning up test data...")
    try:
        AnimeRating.objects.filter(anime__name__startswith="Test").delete()
        Character.objects.filter(name__startswith="Test").delete()
        Anime.objects.filter(name__startswith="Test").delete()
        GameTemplate.objects.filter(name__startswith="Test").delete()
        User.objects.filter(username__startswith='testmodel').delete()
        print("✅ Cleanup complete")
    except Exception as e:
        print(f"⚠️  Cleanup warning: {e}")

    print()
    print("=" * 70)
    print("All Model Tests Complete!")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
