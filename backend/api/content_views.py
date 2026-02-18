"""
Content Management and Library Views
Handles user-owned content (my/templates, my/anime) and public library
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.shortcuts import get_object_or_404

from game.models import Anime, Character, GameTemplate, AnimeRating
from .serializers import (
    AnimeSerializer,
    AnimeDetailSerializer,
    AnimeLibrarySerializer,
    AnimeCreateSerializer,
    CharacterCreateSerializer,
    CharacterListSerializer,
    GameTemplateSerializer,
    GameTemplateCreateSerializer,
    AnimeRatingSerializer,
    MyAnimeRatingSerializer,
)
from .permissions import IsOwnerOrReadOnly


# ============================================
# USER GAME TEMPLATES (/api/my/templates/)
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def my_templates_list(request):
    """
    GET: List all templates owned by current user
    POST: Create a new template
    """
    if request.method == 'GET':
        templates = GameTemplate.objects.filter(owner=request.user)
        serializer = GameTemplateSerializer(templates, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = GameTemplateCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsOwnerOrReadOnly])
def my_template_detail(request, pk):
    """
    GET: Retrieve a template
    PUT: Update a template (only owner)
    DELETE: Delete a template (only owner)
    """
    template = get_object_or_404(GameTemplate, pk=pk, owner=request.user)

    # Check object-level permission
    if request.method in ['PUT', 'DELETE']:
        if not IsOwnerOrReadOnly().has_object_permission(request, None, template):
            return Response({'detail': 'You do not have permission to perform this action.'},
                          status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = GameTemplateSerializer(template, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = GameTemplateCreateSerializer(template, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================
# USER ANIME (/api/my/anime/)
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def my_anime_list(request):
    """
    GET: List all anime owned by current user
    POST: Create a new anime
    """
    if request.method == 'GET':
        anime = Anime.objects.filter(owner=request.user)
        serializer = AnimeSerializer(anime, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = AnimeCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsOwnerOrReadOnly])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def my_anime_detail(request, pk):
    """
    GET: Retrieve anime with all characters
    PUT: Update anime details
    DELETE: Delete anime (cascades to characters)
    """
    anime = get_object_or_404(Anime, pk=pk, owner=request.user)

    # Check object-level permission
    if request.method in ['PUT', 'DELETE']:
        if not IsOwnerOrReadOnly().has_object_permission(request, None, anime):
            return Response({'detail': 'You do not have permission to perform this action.'},
                          status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = AnimeDetailSerializer(anime, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PUT':
        # If trying to make anime public, validate character requirements
        if request.data.get('is_public') == 'true' or request.data.get('is_public') is True:
            # Get all characters for this anime with complete fields
            complete_characters = anime.characters.filter(
                name__isnull=False,
                image__isnull=False,
                character_power__isnull=False
            ).exclude(image='').exclude(specialties=[])

            complete_count = complete_characters.count()

            # Check if anime was imported
            if anime.original_creator_username:
                # Imported anime: needs 10 additional complete characters
                # Count characters that were added after import (not copied from original)
                source_chars = anime.characters.filter(
                    name__isnull=False,
                    image__isnull=False,
                    character_power__isnull=False
                ).exclude(image='').exclude(specialties=[])

                if complete_count < 10:
                    return Response(
                        {
                            'detail': f'Imported anime must have at least 10 additional characters with all fields filled (name, image, power, specialties). You have {complete_count} complete character(s).'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Original anime: needs 12 complete characters minimum
                if complete_count < 12:
                    return Response(
                        {
                            'detail': f'Anime must have at least 12 characters with all fields filled (name, image, power, specialties) to be made public. You have {complete_count} complete character(s).'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

        serializer = AnimeCreateSerializer(anime, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        anime.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================
# USER ANIME CHARACTERS (/api/my/anime/{id}/characters/)
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def my_anime_characters(request, anime_id):
    """
    GET: List all characters for user's anime
    POST: Add a new character to user's anime
    """
    anime = get_object_or_404(Anime, pk=anime_id, owner=request.user)

    if request.method == 'GET':
        characters = anime.characters.all()
        serializer = CharacterListSerializer(characters, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = CharacterCreateSerializer(
            data=request.data,
            context={'request': request, 'anime_id': anime_id}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsOwnerOrReadOnly])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def my_anime_character_detail(request, anime_id, char_id):
    """
    PUT: Update a character
    DELETE: Delete a character
    """
    anime = get_object_or_404(Anime, pk=anime_id, owner=request.user)
    character = get_object_or_404(Character, pk=char_id, anime=anime, owner=request.user)

    # Check object-level permission
    if not IsOwnerOrReadOnly().has_object_permission(request, None, character):
        return Response({'detail': 'You do not have permission to perform this action.'},
                      status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        serializer = CharacterCreateSerializer(character, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        character.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================
# IMPORT ANIME (/api/my/anime/import/)
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_anime(request, pk):
    """
    POST: Import a public anime to user's collection
    Creates a copy of the anime with all its characters
    """
    # Get the source anime (must be public and not owned by current user)
    source_anime = get_object_or_404(
        Anime.objects.filter(Q(owner__isnull=False) & Q(is_public=True)),
        pk=pk
    )

    # Prevent importing own anime
    if source_anime.owner == request.user:
        return Response(
            {'detail': 'You cannot import your own anime'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user already has this anime imported
    existing_import = Anime.objects.filter(
        owner=request.user,
        name=source_anime.name,
        original_creator_username=source_anime.owner.username
    ).first()

    if existing_import:
        return Response(
            {'detail': 'You have already imported this anime'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create a copy of the anime
    new_anime = Anime.objects.create(
        owner=request.user,
        name=source_anime.name,
        anime_power_scale=source_anime.anime_power_scale,
        is_public=False,  # Default to private
        original_creator_username=source_anime.owner.username
    )

    # Copy the image if it exists
    if source_anime.image:
        new_anime.image = source_anime.image
        new_anime.save()

    # Copy all characters
    source_characters = source_anime.characters.all()
    for char in source_characters:
        Character.objects.create(
            owner=request.user,
            anime=new_anime,
            name=char.name,
            character_power=char.character_power,
            specialties=char.specialties,
            image=char.image
        )

    # Return the new anime
    serializer = AnimeSerializer(new_anime, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================================
# PUBLIC LIBRARY (/api/library/anime/)
# ============================================

@api_view(['GET'])
def library_anime_list(request):
    """
    GET: List all public anime (admin + user public)
    Query params:
      - sort: 'newest', 'highest_rated', 'most_rated' (default: newest)
    """
    # Filter: admin anime (owner=null) OR public user anime
    anime = Anime.objects.filter(
        Q(owner__isnull=True) | Q(is_public=True)
    )

    # Sorting
    sort_by = request.query_params.get('sort', 'newest')
    if sort_by == 'highest_rated':
        anime = anime.order_by('-average_rating', '-created_at')
    elif sort_by == 'most_rated':
        anime = anime.order_by('-total_ratings', '-created_at')
    else:  # newest (default)
        anime = anime.order_by('-created_at')

    serializer = AnimeLibrarySerializer(anime, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def library_anime_detail(request, pk):
    """
    GET: Get single anime with all characters and ratings
    """
    # Filter: admin anime (owner=null) OR public user anime
    anime = get_object_or_404(
        Anime.objects.filter(Q(owner__isnull=True) | Q(is_public=True)),
        pk=pk
    )

    serializer = AnimeDetailSerializer(anime, context={'request': request})
    return Response(serializer.data)


# ============================================
# RATING ENDPOINTS (/api/library/anime/{id}/rate/)
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rate_anime(request, pk):
    """
    POST: Rate an anime (1-5 stars)
    Creates or updates rating for current user
    """
    # Get anime (must be public)
    anime = get_object_or_404(
        Anime.objects.filter(Q(owner__isnull=True) | Q(is_public=True)),
        pk=pk
    )

    # Users cannot rate their own anime
    if anime.owner == request.user:
        return Response(
            {'detail': 'You cannot rate your own anime'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get or create rating
    rating_obj, created = AnimeRating.objects.get_or_create(
        anime=anime,
        user=request.user,
        defaults={'rating': request.data.get('rating')}
    )

    if not created:
        # Update existing rating
        serializer = MyAnimeRatingSerializer(data=request.data)
        if serializer.is_valid():
            rating_obj.rating = serializer.validated_data['rating']
            rating_obj.save()
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer = AnimeRatingSerializer(rating_obj, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_anime_rating(request, pk):
    """
    GET: Get current user's rating for an anime
    """
    anime = get_object_or_404(Anime, pk=pk)

    try:
        rating = AnimeRating.objects.get(anime=anime, user=request.user)
        serializer = AnimeRatingSerializer(rating, context={'request': request})
        return Response(serializer.data)
    except AnimeRating.DoesNotExist:
        return Response({'detail': 'No rating found'}, status=status.HTTP_404_NOT_FOUND)
