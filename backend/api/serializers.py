"""
Serializers for the AniFight API
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from game.models import Anime, Character, GameTemplate, AnimeRating


class AnimeSerializer(serializers.ModelSerializer):
    """
    Serializer for Anime model
    Returns: id, name, image, anime_power_scale, owner info, visibility, ratings
    """
    image = serializers.SerializerMethodField()
    owner_username = serializers.SerializerMethodField()
    character_count = serializers.SerializerMethodField()

    class Meta:
        model = Anime
        fields = [
            'id', 'name', 'image', 'anime_power_scale',
            'owner', 'owner_username', 'is_public',
            'average_rating', 'total_ratings', 'character_count',
            'original_creator_username'
        ]
        read_only_fields = ['owner', 'average_rating', 'total_ratings', 'original_creator_username']

    def get_image(self, obj):
        """Return full URL for image or None"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_owner_username(self, obj):
        """Return owner username or 'Admin' if null"""
        if obj.owner:
            return obj.owner.username
        return 'Admin'

    def get_character_count(self, obj):
        """Return number of characters for this anime"""
        return obj.characters.count()


class CharacterListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for character lists
    """
    anime = AnimeSerializer(read_only=True)
    image = serializers.SerializerMethodField()
    anime_power_scale = serializers.SerializerMethodField()

    class Meta:
        model = Character
        fields = [
            'id', 'name', 'image', 'anime',
            'anime_power_scale', 'character_power', 'specialties'
        ]

    def get_image(self, obj):
        """Return full URL for image or None"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_anime_power_scale(self, obj):
        """Return anime_power_scale from related Anime"""
        if obj.anime:
            return obj.anime.anime_power_scale
        return None


class CharacterDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for single character with nested anime
    """
    anime = AnimeSerializer(read_only=True)
    image = serializers.SerializerMethodField()
    anime_power_scale = serializers.SerializerMethodField()

    class Meta:
        model = Character
        fields = [
            'id', 'name', 'image', 'anime',
            'anime_power_scale', 'character_power', 'specialties',
            'created_at', 'updated_at'
        ]

    def get_image(self, obj):
        """Return full URL for image or None"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_anime_power_scale(self, obj):
        """Return anime_power_scale from related Anime"""
        if obj.anime:
            return obj.anime.anime_power_scale
        return None


class GameTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for GameTemplate model
    Returns only published templates with all configuration
    """
    roles = serializers.JSONField(source='roles_json')
    rating_bands = serializers.JSONField(source='rating_bands_json')
    owner_username = serializers.SerializerMethodField()

    class Meta:
        model = GameTemplate
        fields = [
            'id', 'name', 'roles',
            'specialty_match_multiplier', 'rating_bands',
            'owner', 'owner_username', 'is_published'
        ]
        read_only_fields = ['owner']

    def get_owner_username(self, obj):
        """Return owner username or 'Admin' if null"""
        if obj.owner:
            return obj.owner.username
        return 'Admin'


class DrawRequestSerializer(serializers.Serializer):
    """
    Serializer for draw request
    """
    remainingCharacterIds = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='Array of character IDs still available in the pool'
    )
    seed = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='Optional random seed for reproducibility'
    )


class RoleAssignmentSerializer(serializers.Serializer):
    """
    Serializer for a single role assignment
    """
    role = serializers.CharField(help_text='Role name (e.g., CAPTAIN)')
    characterId = serializers.IntegerField(help_text='ID of assigned character')


class TeamAssignmentSerializer(serializers.Serializer):
    """
    Serializer for one player's team assignments
    """
    assignments = RoleAssignmentSerializer(many=True)


class ScoreRequestSerializer(serializers.Serializer):
    """
    Serializer for score calculation request
    """
    templateId = serializers.IntegerField(help_text='ID of the game template used')
    leftTeam = TeamAssignmentSerializer(help_text='Player 1 (left) assignments')
    rightTeam = TeamAssignmentSerializer(help_text='Player 2 (right) assignments')


class RoleScoreBreakdownSerializer(serializers.Serializer):
    """
    Serializer for individual role score breakdown
    """
    role = serializers.CharField()
    character_id = serializers.IntegerField()
    character_name = serializers.CharField()
    character_image = serializers.CharField(allow_null=True)
    anime_name = serializers.CharField(allow_null=True)
    anime_power_scale = serializers.DecimalField(max_digits=6, decimal_places=2)
    character_power = serializers.DecimalField(max_digits=6, decimal_places=2)
    specialties = serializers.ListField(child=serializers.CharField())
    specialty_match = serializers.BooleanField()
    specialty_multiplier = serializers.DecimalField(max_digits=4, decimal_places=2)
    role_score = serializers.DecimalField(max_digits=10, decimal_places=2)


class TeamScoreSerializer(serializers.Serializer):
    """
    Serializer for team score results
    """
    breakdown = RoleScoreBreakdownSerializer(many=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2)


class ScoreResponseSerializer(serializers.Serializer):
    """
    Serializer for score calculation response
    """
    leftTeam = TeamScoreSerializer()
    rightTeam = TeamScoreSerializer()
    winner = serializers.CharField(help_text='left, right, or draw')


# ============================================
# AUTHENTICATION SERIALIZERS
# ============================================

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model - returns user profile information
    Used for /api/auth/me/ endpoint
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration
    Validates username, email, password, and password confirmation
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate_email(self, value):
        """Ensure email is unique"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_username(self, value):
        """Ensure username is unique"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate(self, attrs):
        """Ensure passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        """Create user with hashed password"""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login
    Accepts email and password
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )


# ============================================
# CONTENT MANAGEMENT SERIALIZERS
# ============================================

class AnimeDetailSerializer(serializers.ModelSerializer):
    """
    Detailed Anime serializer with nested characters
    Used for anime detail pages
    """
    image = serializers.SerializerMethodField()
    owner_username = serializers.SerializerMethodField()
    characters = serializers.SerializerMethodField()

    class Meta:
        model = Anime
        fields = [
            'id', 'name', 'image', 'anime_power_scale',
            'owner', 'owner_username', 'is_public',
            'average_rating', 'total_ratings',
            'characters', 'created_at', 'updated_at'
        ]
        read_only_fields = ['owner', 'average_rating', 'total_ratings', 'created_at', 'updated_at']

    def get_image(self, obj):
        """Return full URL for image or None"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_owner_username(self, obj):
        """Return owner username or 'Admin' if null"""
        if obj.owner:
            return obj.owner.username
        return 'Admin'

    def get_characters(self, obj):
        """Return all characters for this anime"""
        characters = obj.characters.all()
        return CharacterListSerializer(characters, many=True, context=self.context).data


class AnimeLibrarySerializer(serializers.ModelSerializer):
    """
    Optimized serializer for library view
    Shows anime cards with ratings and character count (no character details)
    """
    image = serializers.SerializerMethodField()
    owner_username = serializers.SerializerMethodField()
    character_count = serializers.SerializerMethodField()

    class Meta:
        model = Anime
        fields = [
            'id', 'name', 'image', 'anime_power_scale',
            'owner', 'owner_username', 'average_rating', 'total_ratings',
            'character_count', 'created_at', 'original_creator_username'
        ]
        read_only_fields = ['owner', 'original_creator_username']

    def get_image(self, obj):
        """Return full URL for image or None"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_owner_username(self, obj):
        """Return owner username or 'Official' if null"""
        if obj.owner:
            return obj.owner.username
        return 'Official'

    def get_character_count(self, obj):
        """Return number of characters"""
        return obj.characters.count()


class AnimeCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating anime
    """
    class Meta:
        model = Anime
        fields = ['id', 'name', 'anime_power_scale', 'is_public', 'image']
        read_only_fields = ['id']

    def create(self, validated_data):
        """Set owner from request context"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['owner'] = request.user
        return super().create(validated_data)


class CharacterCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating characters
    """
    class Meta:
        model = Character
        fields = ['id', 'name', 'character_power', 'specialties', 'image']
        read_only_fields = ['id']

    def create(self, validated_data):
        """Set owner and anime from context"""
        request = self.context.get('request')
        anime_id = self.context.get('anime_id')

        if request and hasattr(request, 'user'):
            validated_data['owner'] = request.user

        if anime_id:
            validated_data['anime_id'] = anime_id

        return super().create(validated_data)


class GameTemplateCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating game templates
    """
    roles = serializers.ListField(
        child=serializers.CharField(),
        source='roles_json',
        help_text='Array of role names'
    )

    class Meta:
        model = GameTemplate
        fields = ['name', 'roles', 'specialty_match_multiplier', 'rating_bands_json', 'is_published']

    def create(self, validated_data):
        """Set owner from request context"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['owner'] = request.user
        return super().create(validated_data)


class AnimeRatingSerializer(serializers.ModelSerializer):
    """
    Serializer for anime ratings
    """
    user_username = serializers.SerializerMethodField()

    class Meta:
        model = AnimeRating
        fields = ['id', 'anime', 'user', 'user_username', 'rating', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_user_username(self, obj):
        """Return username of the rater"""
        return obj.user.username if obj.user else None

    def validate_rating(self, value):
        """Ensure rating is between 1 and 5"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value

    def create(self, validated_data):
        """Set user from request context"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        return super().create(validated_data)


class MyAnimeRatingSerializer(serializers.Serializer):
    """
    Simple serializer for submitting a rating
    """
    rating = serializers.IntegerField(min_value=1, max_value=5)
