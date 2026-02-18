"""
Scoring logic for AniFight

This module implements the deterministic scoring formula with proper Decimal math
to avoid floating-point precision issues.

Scoring Formula:
    specialty_match = (lowercase(character.specialty) == lowercase(role_name))
    specialty_multiplier = specialty_match ? template.specialty_match_multiplier : 1.00
    role_score = round(character_power * anime_power_scale * specialty_multiplier, 2)

Edge cases handled:
- Null/blank values treated as 0
- Case-insensitive specialty matching with whitespace trimming
- Supports both single specialty (string) and multiple specialties (array)
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Optional


def normalize_specialty(specialty: str) -> str:
    """
    Normalize specialty string for comparison
    - Convert to lowercase
    - Strip whitespace
    """
    if not specialty:
        return ""
    return specialty.strip().lower()


def check_specialty_match(character_specialties: List[str], role_name: str) -> bool:
    """
    Check if character's specialty matches the role

    Args:
        character_specialties: List of character specialties (can be empty)
        role_name: Name of the role to match against

    Returns:
        True if any specialty matches the role (case-insensitive)
    """
    if not character_specialties or not role_name:
        return False

    normalized_role = normalize_specialty(role_name)

    for specialty in character_specialties:
        if normalize_specialty(specialty) == normalized_role:
            return True

    return False


def calculate_role_score(
    character_power: Optional[Decimal],
    anime_power_scale: Optional[Decimal],
    specialty_multiplier: Decimal
) -> Decimal:
    """
    Calculate the score for a single role assignment

    Args:
        character_power: Character power (CP), null treated as 0
        anime_power_scale: Anime power scale (APS), null treated as 0
        specialty_multiplier: Multiplier based on specialty match

    Returns:
        Role score rounded to 2 decimal places
    """
    # Handle null values as 0
    cp = character_power if character_power is not None else Decimal('0')
    aps = anime_power_scale if anime_power_scale is not None else Decimal('0')

    # Calculate score
    score = cp * aps * specialty_multiplier

    # Round to 2 decimal places using ROUND_HALF_UP (standard rounding)
    return score.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_draw_score(
    character_power: Optional[Decimal],
    anime_power_scale: Optional[Decimal]
) -> Decimal:
    """
    Calculate the base score for a drawn character (without specialty multiplier)
    Used for draw rating (S/A/B/C/D tier)

    Args:
        character_power: Character power (CP)
        anime_power_scale: Anime power scale (APS)

    Returns:
        Draw score rounded to 2 decimal places
    """
    cp = character_power if character_power is not None else Decimal('0')
    aps = anime_power_scale if anime_power_scale is not None else Decimal('0')

    score = cp * aps
    return score.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def get_rating_tier(
    draw_score: Decimal,
    character_pool: List[Dict[str, Any]],
    rating_bands: Dict[str, Dict[str, Any]]
) -> tuple[str, str]:
    """
    Determine the rating tier (S/A/B/C/D) for a drawn character
    based on percentile within the available character pool

    Args:
        draw_score: The draw score of the character
        character_pool: List of all characters in the pool
        rating_bands: Rating band configuration from template

    Returns:
        Tuple of (tier, label) e.g., ('S', 'INSANE PULL!')
    """
    # Calculate draw scores for all characters in pool
    pool_scores = []
    for char in character_pool:
        cp = char.get('character_power') or Decimal('0')
        aps = char.get('anime_power_scale') or Decimal('0')
        pool_scores.append(calculate_draw_score(cp, aps))

    # Handle edge case: empty pool
    if not pool_scores:
        return ('C', rating_bands.get('C', {}).get('label', 'Meh…'))

    # Sort scores
    pool_scores.sort()

    # Calculate percentile (what percentage of pool is <= this score)
    count_below_or_equal = sum(1 for s in pool_scores if s <= draw_score)
    percentile = (count_below_or_equal / len(pool_scores)) * 100

    # Determine tier based on percentile
    # Bands are checked from highest to lowest
    for tier in ['S', 'A', 'B', 'C', 'D']:
        band = rating_bands.get(tier, {})
        min_percentile = band.get('min', 0)
        if percentile >= min_percentile:
            return (tier, band.get('label', ''))

    # Fallback to D tier
    return ('D', rating_bands.get('D', {}).get('label', 'Oof.'))


def calculate_team_score(
    assignments: List[Dict[str, Any]],
    template_roles: List[str],
    specialty_match_multiplier: Decimal,
    characters_data: Dict[int, Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculate total score and breakdown for one team

    Args:
        assignments: List of {role, characterId} assignments
        template_roles: List of role names from template
        specialty_match_multiplier: Multiplier from template for specialty matches
        characters_data: Dict mapping character IDs to character data

    Returns:
        Dict with 'breakdown' (list of role details) and 'total' score
    """
    breakdown = []
    total = Decimal('0')

    for assignment in assignments:
        role = assignment.get('role', '')
        character_id = assignment.get('characterId')

        # Get character data
        character = characters_data.get(character_id, {})

        # Extract values
        cp = character.get('character_power')
        aps = character.get('anime_power_scale')
        specialties = character.get('specialties', [])

        # Check specialty match
        specialty_match = check_specialty_match(specialties, role)
        multiplier = specialty_match_multiplier if specialty_match else Decimal('1.00')

        # Calculate role score
        role_score = calculate_role_score(cp, aps, multiplier)
        total += role_score

        # Build breakdown entry
        breakdown.append({
            'role': role,
            'character_id': character_id,
            'character_name': character.get('name', ''),
            'character_image': character.get('image'),
            'anime_name': character.get('anime', {}).get('name') if character.get('anime') else None,
            'anime_power_scale': aps if aps is not None else Decimal('0'),
            'character_power': cp if cp is not None else Decimal('0'),
            'specialties': specialties,
            'specialty_match': specialty_match,
            'specialty_multiplier': multiplier,
            'role_score': role_score
        })

    return {
        'breakdown': breakdown,
        'total': total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    }


def calculate_match_result(
    template_id: int,
    left_team_assignments: List[Dict[str, Any]],
    right_team_assignments: List[Dict[str, Any]],
    template_data: Dict[str, Any],
    characters_data: Dict[int, Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculate the complete match result including both teams and winner

    Args:
        template_id: ID of the game template
        left_team_assignments: List of assignments for left player
        right_team_assignments: List of assignments for right player
        template_data: Template configuration data
        characters_data: Dict mapping character IDs to character data

    Returns:
        Dict with leftTeam, rightTeam results and winner
    """
    specialty_multiplier = Decimal(str(template_data.get('specialty_match_multiplier', 1.20)))
    template_roles = template_data.get('roles_json', [])

    # Calculate scores for both teams
    left_result = calculate_team_score(
        left_team_assignments,
        template_roles,
        specialty_multiplier,
        characters_data
    )

    right_result = calculate_team_score(
        right_team_assignments,
        template_roles,
        specialty_multiplier,
        characters_data
    )

    # Determine winner
    left_total = left_result['total']
    right_total = right_result['total']

    if left_total > right_total:
        winner = 'left'
    elif right_total > left_total:
        winner = 'right'
    else:
        winner = 'draw'

    return {
        'leftTeam': left_result,
        'rightTeam': right_result,
        'winner': winner
    }
