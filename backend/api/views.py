"""
API Views for AniFight
"""
import random
from decimal import Decimal

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q

from game.models import Anime, Character, GameTemplate
from .serializers import (
    AnimeSerializer,
    CharacterListSerializer,
    CharacterDetailSerializer,
    GameTemplateSerializer,
    DrawRequestSerializer,
    ScoreRequestSerializer,
    ScoreResponseSerializer,
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
)
from .scoring import calculate_match_result, get_rating_tier, calculate_draw_score


@api_view(['GET'])
def list_templates(request):
    """
    GET /api/templates/

    Returns game templates available for gameplay

    Visibility rules for gameplay:
    - Admin templates (owner=null): Always visible if published
    - User's own templates: Visible if user is authenticated

    Note: This endpoint is for the game setup screen. Public user templates
    are NOT shown here - only admin templates and the authenticated user's own templates.

    Response:
        [
            {
                "id": 1,
                "name": "Standard 6v6",
                "roles": ["CAPTAIN", "VICE CAPTAIN", ...],
                "specialty_match_multiplier": 1.20,
                "rating_bands": {...},
                "owner": null,
                "owner_username": "Admin"
            }
        ]
    """
    # Base query: Admin templates that are published
    templates_query = Q(owner__isnull=True, is_published=True)

    # If user is authenticated, also include their own templates (published or not)
    if request.user and request.user.is_authenticated:
        templates_query |= Q(owner=request.user)

    templates = GameTemplate.objects.filter(templates_query)
    serializer = GameTemplateSerializer(templates, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def list_anime(request):
    """
    GET /api/anime/

    Returns anime available for gameplay

    Visibility rules for gameplay:
    - Admin anime (owner=null): Always visible
    - User's own anime: Visible if user is authenticated (includes imported anime)

    Note: This endpoint is for the game setup screen. Public user anime from other users
    are NOT shown here - only admin anime and the authenticated user's own anime
    (including any anime they've imported from the public library).

    If user is not authenticated, returns:
    - All admin anime only

    If user is authenticated, returns:
    - All admin anime
    - User's own anime (both private and public, including imported ones)

    Response:
        [
            {
                "id": 1,
                "name": "Naruto",
                "image": "http://...",
                "owner": null,
                "owner_username": "Admin",
                "is_public": true,
                "average_rating": 4.5,
                "total_ratings": 10,
                "character_count": 30
            }
        ]
    """
    # Base query: admin anime only
    anime_query = Q(owner__isnull=True)

    # If user is authenticated, also include their own anime (public or private)
    if request.user and request.user.is_authenticated:
        anime_query |= Q(owner=request.user)

    anime = Anime.objects.filter(anime_query)
    serializer = AnimeSerializer(anime, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def list_characters(request):
    """
    GET /api/characters/?anime_ids=1,2,3

    Returns characters filtered by anime IDs, respecting gameplay visibility rules

    Characters inherit visibility from their parent Anime (for gameplay):
    - Admin anime characters: Always visible
    - User's own anime characters: Visible if user is authenticated

    Note: This endpoint is for the game setup screen. Characters from public anime
    created by other users are NOT shown here.

    Query Parameters:
        anime_ids (optional): Comma-separated list of anime IDs

    Response:
        [
            {
                "id": 1,
                "name": "Naruto Uzumaki",
                "image": "http://...",
                "anime": {...},
                "anime_power_scale": 8.50,
                "character_power": 85.00,
                "specialties": ["CAPTAIN", "TANK"]
            }
        ]
    """
    # Get anime_ids query parameter
    anime_ids_param = request.query_params.get('anime_ids', None)

    # Build visibility query for anime - matching the gameplay rules:
    # Only admin anime OR user's own anime (no public anime from other users)
    anime_query = Q(anime__owner__isnull=True)

    # If user is authenticated, also include their own anime characters
    if request.user and request.user.is_authenticated:
        anime_query |= Q(anime__owner=request.user)

    characters = Character.objects.select_related('anime').filter(anime_query)

    # Filter by anime IDs if provided
    if anime_ids_param:
        try:
            # Parse comma-separated IDs
            anime_ids = [int(id_str.strip()) for id_str in anime_ids_param.split(',') if id_str.strip()]
            if anime_ids:
                characters = characters.filter(anime_id__in=anime_ids)
        except ValueError:
            return Response(
                {'error': 'Invalid anime_ids format. Expected comma-separated integers.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    serializer = CharacterListSerializer(characters, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
def draw_character(request):
    """
    POST /api/draw/

    Draws a random character from the remaining pool

    Request body:
        {
            "remainingCharacterIds": [1, 2, 3, 4, ...],
            "seed": 12345 (optional)
        }

    Response:
        {
            "character": {...},  // Full character data with nested anime
            "rating": {
                "tier": "S",
                "label": "INSANE PULL!"
            }
        }
    """
    serializer = DrawRequestSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    remaining_ids = serializer.validated_data['remainingCharacterIds']
    seed = serializer.validated_data.get('seed')

    # Set random seed if provided (for reproducibility in testing)
    if seed is not None:
        random.seed(seed)

    # Select random character ID
    if not remaining_ids:
        return Response(
            {'error': 'No characters remaining in pool'},
            status=status.HTTP_400_BAD_REQUEST
        )

    drawn_id = random.choice(remaining_ids)

    # Fetch the character
    try:
        character = Character.objects.select_related('anime').get(id=drawn_id)
    except Character.DoesNotExist:
        return Response(
            {'error': f'Character with ID {drawn_id} not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Serialize character
    character_serializer = CharacterDetailSerializer(character, context={'request': request})

    # For rating, we need to know the full pool and template rating bands
    # Since we don't have template context here, we'll return just the character
    # Frontend can calculate the rating based on the pool it has

    # However, if we want to calculate rating here, we'd need the full pool data
    # For now, return character only and let frontend handle rating
    # OR we can add template_id to the request and calculate it server-side

    return Response({
        'character': character_serializer.data
    })


@api_view(['POST'])
def calculate_score(request):
    """
    POST /api/score/

    Calculates the final score for both teams and determines the winner

    Request body:
        {
            "templateId": 1,
            "leftTeam": {
                "assignments": [
                    {"role": "CAPTAIN", "characterId": 1},
                    ...
                ]
            },
            "rightTeam": {
                "assignments": [
                    {"role": "CAPTAIN", "characterId": 2},
                    ...
                ]
            }
        }

    Response:
        {
            "leftTeam": {
                "breakdown": [
                    {
                        "role": "CAPTAIN",
                        "character_id": 1,
                        "character_name": "Naruto",
                        "anime_name": "Naruto",
                        "anime_power_scale": 8.50,
                        "character_power": 85.00,
                        "specialties": ["CAPTAIN"],
                        "specialty_match": true,
                        "specialty_multiplier": 1.20,
                        "role_score": 867.00
                    },
                    ...
                ],
                "total": 5200.50
            },
            "rightTeam": {...},
            "winner": "left"  // or "right" or "draw"
        }
    """
    serializer = ScoreRequestSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    template_id = serializer.validated_data['templateId']
    left_team = serializer.validated_data['leftTeam']['assignments']
    right_team = serializer.validated_data['rightTeam']['assignments']

    # Fetch template
    try:
        template = GameTemplate.objects.get(id=template_id)
    except GameTemplate.DoesNotExist:
        return Response(
            {'error': f'Template with ID {template_id} not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Collect all character IDs
    all_character_ids = set()
    for assignment in left_team:
        all_character_ids.add(assignment['characterId'])
    for assignment in right_team:
        all_character_ids.add(assignment['characterId'])

    # Fetch all characters at once
    characters = Character.objects.select_related('anime').filter(id__in=all_character_ids)

    # Build character data dict
    characters_data = {}
    for char in characters:
        characters_data[char.id] = {
            'id': char.id,
            'name': char.name,
            'image': request.build_absolute_uri(char.image.url) if char.image else None,
            'anime': {
                'id': char.anime.id,
                'name': char.anime.name,
                'image': request.build_absolute_uri(char.anime.image.url) if char.anime and char.anime.image else None
            } if char.anime else None,
            'anime_power_scale': char.anime.anime_power_scale if char.anime else None,
            'character_power': char.character_power,
            'specialties': char.specialties if char.specialties else []
        }

    # Prepare template data
    template_data = {
        'specialty_match_multiplier': template.specialty_match_multiplier,
        'roles_json': template.roles_json
    }

    # Calculate match result
    result = calculate_match_result(
        template_id,
        left_team,
        right_team,
        template_data,
        characters_data
    )

    # Serialize response
    response_serializer = ScoreResponseSerializer(result)
    return Response(response_serializer.data)


# ============================================
# AUTHENTICATION VIEWS
# ============================================

@api_view(['POST'])
def register_user(request):
    """
    POST /api/auth/register/

    Register a new user with username, email, and password

    Request Body:
        {
            "username": "johndoe",
            "email": "john@example.com",
            "password": "SecurePassword123",
            "password_confirm": "SecurePassword123"
        }

    Response:
        {
            "user": {
                "id": 1,
                "username": "johndoe",
                "email": "john@example.com",
                "date_joined": "2025-01-01T00:00:00Z"
            },
            "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
        }
    """
    serializer = UserRegistrationSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login_user(request):
    """
    POST /api/auth/login/

    Login with email and password

    Request Body:
        {
            "email": "john@example.com",
            "password": "SecurePassword123"
        }

    Response:
        {
            "user": {
                "id": 1,
                "username": "johndoe",
                "email": "john@example.com",
                "date_joined": "2025-01-01T00:00:00Z"
            },
            "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
        }
    """
    serializer = UserLoginSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    password = serializer.validated_data['password']

    # Find user by email
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Authenticate user
    user = authenticate(username=user.username, password=password)

    if user is None:
        return Response(
            {'detail': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)

    return Response({
        'user': UserSerializer(user).data,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    POST /api/auth/logout/

    Logout and blacklist refresh token
    Requires: Authorization: Bearer <access_token>

    Request Body:
        {
            "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
        }

    Response:
        {
            "detail": "Successfully logged out"
        }
    """
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        token = RefreshToken(refresh_token)
        token.blacklist()

        return Response(
            {'detail': 'Successfully logged out'},
            status=status.HTTP_200_OK
        )
    except TokenError:
        return Response(
            {'detail': 'Invalid token'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    GET /api/auth/me/

    Get current authenticated user information
    Requires: Authorization: Bearer <access_token>

    Response:
        {
            "id": 1,
            "username": "johndoe",
            "email": "john@example.com",
            "date_joined": "2025-01-01T00:00:00Z"
        }
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
