from django.contrib import admin
from import_export import resources, fields
from import_export.admin import ImportExportModelAdmin
from import_export.widgets import ForeignKeyWidget
from .models import Anime, Character, GameTemplate, AnimeRating


# ============================================================================
# IMPORT/EXPORT RESOURCES
# ============================================================================

class AnimeResource(resources.ModelResource):
    """
    Resource for importing/exporting Anime
    CSV Format: name, anime_power_scale, image (optional - leave empty for file uploads)
    Only 'name' is required
    Note: Image uploads should be done through the admin interface
    """
    class Meta:
        model = Anime
        fields = ('id', 'name', 'anime_power_scale', 'created_at', 'updated_at')
        export_order = ('id', 'name', 'anime_power_scale', 'created_at', 'updated_at')
        import_id_fields = ('name',)  # Use name as unique identifier for updates
        skip_unchanged = True
        report_skipped = True
        exclude = ('image',)  # Exclude image from CSV import (use admin for uploads)

    def before_import_row(self, row, **kwargs):
        """
        Clean and validate row data before import
        """
        # Ensure name is provided
        if not row.get('name') or not row.get('name').strip():
            raise ValueError("Name is required for all anime")

        # Strip whitespace from name
        row['name'] = row['name'].strip()

        # Handle empty anime_power_scale - treat as None/null
        if not row.get('anime_power_scale') or str(row.get('anime_power_scale')).strip() == '':
            row['anime_power_scale'] = None
        else:
            try:
                row['anime_power_scale'] = float(row['anime_power_scale'])
            except (ValueError, TypeError):
                raise ValueError(f"Invalid anime_power_scale: {row.get('anime_power_scale')}")


class CharacterResource(resources.ModelResource):
    """
    Resource for importing/exporting Characters
    CSV Format: name, anime, character_power, specialties
    Only 'name' is required
    'anime' can match by name (exact string) or be blank
    'specialties' should be comma-separated values, e.g., "CAPTAIN,TANK"
    Note: anime_power_scale is now on the Anime model, not Character
    Note: Image uploads should be done through the admin interface
    """
    anime = fields.Field(
        column_name='anime',
        attribute='anime',
        widget=ForeignKeyWidget(Anime, 'name')
    )

    specialties = fields.Field(
        column_name='specialties',
        attribute='specialties'
    )

    class Meta:
        model = Character
        fields = (
            'id', 'name', 'anime',
            'character_power', 'specialties',
            'created_at', 'updated_at'
        )
        export_order = (
            'id', 'name', 'anime',
            'character_power', 'specialties',
            'created_at', 'updated_at'
        )
        import_id_fields = ('name',)
        skip_unchanged = True
        report_skipped = True
        exclude = ('image',)  # Exclude image from CSV import (use admin for uploads)

    def dehydrate_specialties(self, character):
        """Export specialties as comma-separated string"""
        if character.specialties:
            return ','.join(character.specialties)
        return ''

    def before_import_row(self, row, **kwargs):
        """
        Clean and validate row data before import
        """
        # Ensure name is provided
        if not row.get('name') or not row.get('name').strip():
            raise ValueError("Name is required for all characters")

        # Strip whitespace from name
        row['name'] = row['name'].strip()

        # Handle empty anime (nullable)
        if not row.get('anime') or not row.get('anime').strip():
            row['anime'] = None

        # Handle empty character_power - treat as None/null
        if not row.get('character_power') or str(row.get('character_power')).strip() == '':
            row['character_power'] = None
        else:
            try:
                row['character_power'] = float(row['character_power'])
            except (ValueError, TypeError):
                raise ValueError(f"Invalid character_power: {row.get('character_power')}")

        # Validate character_power range (1.00-100.00)
        if row.get('character_power') is not None:
            cp = float(row['character_power'])
            if cp < 1.00 or cp > 100.00:
                raise ValueError(f"character_power must be between 1.00 and 100.00, got {cp}")

        # Handle specialties - convert comma-separated string to array
        specialties_str = row.get('specialties', '').strip()
        if specialties_str:
            # Split by comma and clean each value
            specialties_list = [s.strip() for s in specialties_str.split(',') if s.strip()]
            row['specialties'] = specialties_list
        else:
            row['specialties'] = []


# ============================================================================
# MODEL ADMINS
# ============================================================================

@admin.register(Anime)
class AnimeAdmin(ImportExportModelAdmin):
    """
    Admin for Anime model with CSV import/export
    """
    resource_class = AnimeResource

    list_display = ('id', 'name', 'owner_display', 'is_public', 'anime_power_scale', 'average_rating', 'total_ratings', 'character_count', 'created_at')
    list_display_links = ('id', 'name')
    search_fields = ('name', 'owner__username')  # Required for autocomplete
    list_filter = ('is_public', 'created_at', 'updated_at')
    ordering = ('name',)

    readonly_fields = ('created_at', 'updated_at', 'average_rating', 'total_ratings')

    fields = ('owner', 'name', 'anime_power_scale', 'is_public', 'image', 'average_rating', 'total_ratings')

    def owner_display(self, obj):
        """Display owner or 'Admin' if null"""
        if obj.owner:
            return obj.owner.username
        return 'Admin'
    owner_display.short_description = 'Owner'

    def character_count(self, obj):
        """Display the number of characters for this anime"""
        return obj.characters.count()
    character_count.short_description = 'Characters'

    def image_preview(self, obj):
        """Show small image preview in list view"""
        if obj.image:
            return f'✓'
        return '✗'
    image_preview.short_description = 'Image'


@admin.register(Character)
class CharacterAdmin(ImportExportModelAdmin):
    """
    Admin for Character model with CSV import/export
    """
    resource_class = CharacterResource

    list_display = (
        'id', 'name', 'owner_display', 'anime', 'get_anime_power_scale',
        'character_power', 'specialties_display', 'created_at'
    )
    list_display_links = ('id', 'name')
    search_fields = ('name', 'anime__name', 'owner__username')
    list_filter = ('anime', 'created_at', 'updated_at')
    ordering = ('name',)

    readonly_fields = ('created_at', 'updated_at')

    fields = ('owner', 'name', 'anime', 'image', 'character_power', 'specialties')

    autocomplete_fields = ['anime']

    def owner_display(self, obj):
        """Display owner or 'Admin' if null"""
        if obj.owner:
            return obj.owner.username
        return 'Admin'
    owner_display.short_description = 'Owner'

    def get_anime_power_scale(self, obj):
        """Display anime_power_scale from related Anime"""
        if obj.anime:
            return obj.anime.anime_power_scale
        return '-'
    get_anime_power_scale.short_description = 'Anime Power Scale'
    get_anime_power_scale.admin_order_field = 'anime__anime_power_scale'

    def specialties_display(self, obj):
        """Display specialties as comma-separated string"""
        if obj.specialties:
            return ', '.join(obj.specialties)
        return '-'
    specialties_display.short_description = 'Specialties'


@admin.register(GameTemplate)
class GameTemplateAdmin(admin.ModelAdmin):
    """
    Admin for GameTemplate model
    """
    list_display = (
        'id', 'name', 'owner_display', 'is_published', 'role_count',
        'specialty_match_multiplier', 'created_at'
    )
    list_display_links = ('id', 'name')
    list_filter = ('is_published', 'created_at', 'updated_at')
    search_fields = ('name', 'owner__username')
    ordering = ('-is_published', 'name')

    readonly_fields = ('created_at', 'updated_at')

    def owner_display(self, obj):
        """Display owner or 'Admin' if null"""
        if obj.owner:
            return obj.owner.username
        return 'Admin'
    owner_display.short_description = 'Owner'

    fieldsets = (
        ('Basic Information', {
            'fields': ('owner', 'name', 'is_published')
        }),
        ('Game Configuration', {
            'fields': ('roles_json', 'specialty_match_multiplier'),
            'description': 'Roles should be a JSON array like: ["CAPTAIN","VICE CAPTAIN","TANK","HEALER","SUPPORT","SUPPORT"]'
        }),
        ('Rating Bands (Optional)', {
            'fields': ('rating_bands_json',),
            'description': 'Leave empty to auto-populate with default S/A/B/C/D rating bands. Defaults: S=90th, A=70th, B=40th, C=10th, D=0th percentile.',
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def role_count(self, obj):
        """Display the number of roles in this template"""
        return len(obj.roles_json) if obj.roles_json else 0
    role_count.short_description = 'Roles'


@admin.register(AnimeRating)
class AnimeRatingAdmin(admin.ModelAdmin):
    """
    Admin for AnimeRating model
    """
    list_display = ('id', 'anime', 'user', 'rating', 'created_at', 'updated_at')
    list_display_links = ('id',)
    list_filter = ('rating', 'created_at')
    search_fields = ('anime__name', 'user__username')
    ordering = ('-created_at',)

    readonly_fields = ('created_at', 'updated_at')

    fields = ('anime', 'user', 'rating', 'created_at', 'updated_at')

    def has_add_permission(self, request):
        """Allow adding ratings through admin"""
        return True

    def has_change_permission(self, request, obj=None):
        """Allow changing ratings"""
        return True
