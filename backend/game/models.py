from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.models import User


class Anime(models.Model):
    """
    Anime model - represents an anime series/show

    Ownership and Visibility:
    - owner=null: Admin anime (always visible to everyone)
    - owner set + is_public=True: User anime visible to all
    - owner set + is_public=False: User anime visible only to owner
    """
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='anime',
        null=True,
        blank=True,
        help_text='Owner of this anime. Null = admin content (always public)'
    )
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to='anime/', blank=True, null=True)
    anime_power_scale = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Anime Power Scale (APS) - multiplier based on anime strength'
    )
    is_public = models.BooleanField(
        default=False,
        help_text='Make this anime visible in public library (only for user-owned anime)'
    )
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.00), MaxValueValidator(5.00)],
        help_text='Average user rating (0.00 - 5.00)'
    )
    total_ratings = models.IntegerField(
        default=0,
        help_text='Total number of ratings received'
    )
    original_creator_username = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Original creator username if this anime was imported from another user'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Anime'
        verbose_name_plural = 'Anime'
        ordering = ['name']

    def __str__(self):
        return self.name


class Character(models.Model):
    """
    Character model - represents a character from an anime

    Visibility: Characters inherit visibility from their parent Anime.
    No separate is_public field needed.
    """
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='characters',
        null=True,
        blank=True,
        help_text='Owner of this character. Null = admin content'
    )
    anime = models.ForeignKey(
        Anime,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='characters'
    )
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to='characters/', blank=True, null=True)
    character_power = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(1.00),
            MaxValueValidator(100.00)
        ],
        help_text='Character Power (CP) - must be between 1.00 and 100.00'
    )
    specialties = models.JSONField(
        default=list,
        blank=True,
        help_text='Array of specialties, e.g., ["CAPTAIN", "TANK"]'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Character'
        verbose_name_plural = 'Characters'
        ordering = ['name']

    def __str__(self):
        if self.anime:
            return f"{self.name} ({self.anime.name})"
        return self.name


class GameTemplate(models.Model):
    """
    GameTemplate model - defines game rules and roles

    Ownership:
    - owner=null: Admin template (visible to all)
    - owner set: User template (visible based on is_published)
    """
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='game_templates',
        null=True,
        blank=True,
        help_text='Owner of this template. Null = admin content (always published)'
    )
    name = models.CharField(max_length=255)
    roles_json = models.JSONField(
        default=list,
        help_text='Array of role names, e.g., ["CAPTAIN","VICE CAPTAIN","TANK","HEALER","SUPPORT","SUPPORT"]'
    )
    is_published = models.BooleanField(
        default=False,
        help_text='Only published templates appear on the play page'
    )
    specialty_match_multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=1.20,
        help_text='Multiplier applied when character specialty matches role'
    )
    rating_bands_json = models.JSONField(
        default=dict,
        blank=True,
        help_text='Percentile thresholds for draw ratings (S/A/B/C/D). Leave empty to use defaults.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Game Template'
        verbose_name_plural = 'Game Templates'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Set default roles if empty
        if not self.roles_json:
            self.roles_json = ["CAPTAIN", "VICE CAPTAIN", "TANK", "HEALER", "SUPPORT", "SUPPORT"]

        # Set default rating bands if empty or only contains empty dict
        if not self.rating_bands_json or self.rating_bands_json == {}:
            self.rating_bands_json = {
                "S": {"min": 90, "label": "INSANE PULL!"},
                "A": {"min": 70, "label": "HUGE WIN!"},
                "B": {"min": 40, "label": "Nice pick"},
                "C": {"min": 10, "label": "Meh…"},
                "D": {"min": 0, "label": "Oof."}
            }

        super().save(*args, **kwargs)


class AnimeRating(models.Model):
    """
    AnimeRating model - stores user ratings for anime

    Business Rules:
    - One rating per user per anime (enforced by unique_together)
    - Rating must be between 1 and 5 stars
    - Users can only rate public anime (enforced in API layer)
    - Users cannot rate their own anime (enforced in API layer)
    """
    anime = models.ForeignKey(
        Anime,
        on_delete=models.CASCADE,
        related_name='ratings',
        help_text='The anime being rated'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='anime_ratings',
        help_text='User who submitted this rating'
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Rating value (1-5 stars)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['anime', 'user']
        verbose_name = 'Anime Rating'
        verbose_name_plural = 'Anime Ratings'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} rated {self.anime.name}: {self.rating}/5"

    def save(self, *args, **kwargs):
        """
        When a rating is saved or updated, recalculate the anime's average rating
        """
        super().save(*args, **kwargs)
        self.update_anime_rating()

    def delete(self, *args, **kwargs):
        """
        When a rating is deleted, recalculate the anime's average rating
        """
        super().delete(*args, **kwargs)
        self.update_anime_rating()

    def update_anime_rating(self):
        """
        Recalculate and update the parent anime's average_rating and total_ratings
        """
        from django.db.models import Avg, Count

        ratings = AnimeRating.objects.filter(anime=self.anime).aggregate(
            avg=Avg('rating'),
            count=Count('id')
        )

        self.anime.average_rating = round(ratings['avg'] or 0, 2)
        self.anime.total_ratings = ratings['count'] or 0
        self.anime.save()
