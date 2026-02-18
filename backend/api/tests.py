"""
Unit tests for AniFight API, focusing on scoring logic
"""
from decimal import Decimal
from django.test import TestCase
from api.scoring import (
    normalize_specialty,
    check_specialty_match,
    calculate_role_score,
    calculate_draw_score,
    calculate_team_score,
    calculate_match_result,
)


class ScoringTestCase(TestCase):
    """Test cases for scoring logic"""

    def test_normalize_specialty(self):
        """Test specialty normalization"""
        self.assertEqual(normalize_specialty("CAPTAIN"), "captain")
        self.assertEqual(normalize_specialty("  TANK  "), "tank")
        self.assertEqual(normalize_specialty("Vice Captain"), "vice captain")
        self.assertEqual(normalize_specialty(""), "")
        self.assertEqual(normalize_specialty(None), "")

    def test_specialty_match_exact(self):
        """Test exact specialty match"""
        self.assertTrue(check_specialty_match(["CAPTAIN"], "CAPTAIN"))
        self.assertTrue(check_specialty_match(["TANK"], "tank"))
        self.assertTrue(check_specialty_match(["healer"], "HEALER"))

    def test_specialty_match_with_whitespace(self):
        """Test specialty match with extra whitespace (PRD requirement)"""
        self.assertTrue(check_specialty_match(["TANK "], "TANK"))
        self.assertTrue(check_specialty_match(["  CAPTAIN"], "captain"))
        self.assertTrue(check_specialty_match([" HEALER "], " healer "))

    def test_specialty_match_multiple_specialties(self):
        """Test matching against multiple specialties"""
        self.assertTrue(check_specialty_match(["CAPTAIN", "TANK"], "TANK"))
        self.assertTrue(check_specialty_match(["HEALER", "SUPPORT"], "support"))
        self.assertFalse(check_specialty_match(["CAPTAIN", "TANK"], "HEALER"))

    def test_specialty_no_match(self):
        """Test when specialty doesn't match"""
        self.assertFalse(check_specialty_match(["CAPTAIN"], "TANK"))
        self.assertFalse(check_specialty_match([], "CAPTAIN"))
        self.assertFalse(check_specialty_match(["TANK"], ""))

    def test_calculate_role_score_basic(self):
        """Test basic role score calculation"""
        score = calculate_role_score(
            character_power=Decimal('50.00'),
            anime_power_scale=Decimal('2.00'),
            specialty_multiplier=Decimal('1.00')
        )
        self.assertEqual(score, Decimal('100.00'))

    def test_calculate_role_score_with_specialty_match(self):
        """Test role score with specialty multiplier"""
        score = calculate_role_score(
            character_power=Decimal('85.00'),
            anime_power_scale=Decimal('8.50'),
            specialty_multiplier=Decimal('1.20')
        )
        # 85 * 8.5 * 1.2 = 867.00
        self.assertEqual(score, Decimal('867.00'))

    def test_calculate_role_score_null_values(self):
        """Test role score with null values (treated as 0) - PRD requirement"""
        # Both null
        score = calculate_role_score(None, None, Decimal('1.20'))
        self.assertEqual(score, Decimal('0.00'))

        # Character power null
        score = calculate_role_score(None, Decimal('5.00'), Decimal('1.00'))
        self.assertEqual(score, Decimal('0.00'))

        # Anime power scale null
        score = calculate_role_score(Decimal('80.00'), None, Decimal('1.00'))
        self.assertEqual(score, Decimal('0.00'))

    def test_calculate_role_score_rounding(self):
        """Test proper decimal rounding to 2 places - PRD requirement"""
        score = calculate_role_score(
            character_power=Decimal('33.33'),
            anime_power_scale=Decimal('3.33'),
            specialty_multiplier=Decimal('1.00')
        )
        # 33.33 * 3.33 = 110.9889 -> rounds to 110.99
        self.assertEqual(score, Decimal('110.99'))

    def test_calculate_draw_score(self):
        """Test draw score calculation (no multiplier)"""
        score = calculate_draw_score(
            character_power=Decimal('75.00'),
            anime_power_scale=Decimal('5.00')
        )
        self.assertEqual(score, Decimal('375.00'))

        # With nulls
        score = calculate_draw_score(None, Decimal('5.00'))
        self.assertEqual(score, Decimal('0.00'))

    def test_calculate_team_score(self):
        """Test full team score calculation"""
        assignments = [
            {'role': 'CAPTAIN', 'characterId': 1},
            {'role': 'TANK', 'characterId': 2},
        ]

        template_roles = ['CAPTAIN', 'TANK']
        specialty_multiplier = Decimal('1.20')

        characters_data = {
            1: {
                'id': 1,
                'name': 'Naruto',
                'image': None,
                'anime': {'id': 1, 'name': 'Naruto', 'image': None},
                'anime_power_scale': Decimal('8.00'),
                'character_power': Decimal('90.00'),
                'specialties': ['CAPTAIN']
            },
            2: {
                'id': 2,
                'name': 'Tank Guy',
                'image': None,
                'anime': {'id': 2, 'name': 'Some Anime', 'image': None},
                'anime_power_scale': Decimal('5.00'),
                'character_power': Decimal('70.00'),
                'specialties': ['TANK']
            }
        }

        result = calculate_team_score(
            assignments,
            template_roles,
            specialty_multiplier,
            characters_data
        )

        # Naruto: 90 * 8 * 1.2 = 864.00 (specialty match)
        # Tank Guy: 70 * 5 * 1.2 = 420.00 (specialty match)
        # Total: 1284.00
        self.assertEqual(result['total'], Decimal('1284.00'))
        self.assertEqual(len(result['breakdown']), 2)
        self.assertTrue(result['breakdown'][0]['specialty_match'])
        self.assertTrue(result['breakdown'][1]['specialty_match'])

    def test_calculate_match_result_left_wins(self):
        """Test match where left team wins"""
        left_team = [{'role': 'CAPTAIN', 'characterId': 1}]
        right_team = [{'role': 'CAPTAIN', 'characterId': 2}]

        template_data = {
            'specialty_match_multiplier': Decimal('1.20'),
            'roles_json': ['CAPTAIN']
        }

        characters_data = {
            1: {
                'id': 1,
                'name': 'Strong',
                'image': None,
                'anime': None,
                'anime_power_scale': Decimal('10.00'),
                'character_power': Decimal('100.00'),
                'specialties': ['CAPTAIN']
            },
            2: {
                'id': 2,
                'name': 'Weak',
                'image': None,
                'anime': None,
                'anime_power_scale': Decimal('2.00'),
                'character_power': Decimal('30.00'),
                'specialties': ['CAPTAIN']
            }
        }

        result = calculate_match_result(
            1, left_team, right_team, template_data, characters_data
        )

        # Left: 100 * 10 * 1.2 = 1200.00
        # Right: 30 * 2 * 1.2 = 72.00
        self.assertEqual(result['winner'], 'left')
        self.assertEqual(result['leftTeam']['total'], Decimal('1200.00'))
        self.assertEqual(result['rightTeam']['total'], Decimal('72.00'))

    def test_calculate_match_result_draw(self):
        """Test match that ends in a draw"""
        left_team = [{'role': 'CAPTAIN', 'characterId': 1}]
        right_team = [{'role': 'CAPTAIN', 'characterId': 2}]

        template_data = {
            'specialty_match_multiplier': Decimal('1.00'),
            'roles_json': ['CAPTAIN']
        }

        characters_data = {
            1: {
                'id': 1,
                'name': 'Player1',
                'image': None,
                'anime': None,
                'anime_power_scale': Decimal('5.00'),
                'character_power': Decimal('50.00'),
                'specialties': []
            },
            2: {
                'id': 2,
                'name': 'Player2',
                'image': None,
                'anime': None,
                'anime_power_scale': Decimal('5.00'),
                'character_power': Decimal('50.00'),
                'specialties': []
            }
        }

        result = calculate_match_result(
            1, left_team, right_team, template_data, characters_data
        )

        # Both: 50 * 5 * 1.0 = 250.00
        self.assertEqual(result['winner'], 'draw')
        self.assertEqual(result['leftTeam']['total'], Decimal('250.00'))
        self.assertEqual(result['rightTeam']['total'], Decimal('250.00'))

    def test_specialty_match_no_multiplier_if_no_match(self):
        """Test that specialty multiplier is NOT applied when specialty doesn't match"""
        assignments = [{'role': 'CAPTAIN', 'characterId': 1}]
        template_roles = ['CAPTAIN']
        specialty_multiplier = Decimal('1.20')

        characters_data = {
            1: {
                'id': 1,
                'name': 'Tank Only',
                'image': None,
                'anime': None,
                'anime_power_scale': Decimal('5.00'),
                'character_power': Decimal('50.00'),
                'specialties': ['TANK']  # Doesn't match CAPTAIN
            }
        }

        result = calculate_team_score(
            assignments,
            template_roles,
            specialty_multiplier,
            characters_data
        )

        # 50 * 5 * 1.0 (no multiplier) = 250.00
        self.assertEqual(result['breakdown'][0]['specialty_multiplier'], Decimal('1.00'))
        self.assertEqual(result['total'], Decimal('250.00'))
        self.assertFalse(result['breakdown'][0]['specialty_match'])

    def test_edge_case_empty_specialties(self):
        """Test character with empty specialties array"""
        self.assertFalse(check_specialty_match([], "CAPTAIN"))

        assignments = [{'role': 'CAPTAIN', 'characterId': 1}]
        characters_data = {
            1: {
                'id': 1,
                'name': 'No Specialty',
                'image': None,
                'anime': None,
                'anime_power_scale': Decimal('5.00'),
                'character_power': Decimal('50.00'),
                'specialties': []
            }
        }

        result = calculate_team_score(
            assignments,
            ['CAPTAIN'],
            Decimal('1.20'),
            characters_data
        )

        self.assertFalse(result['breakdown'][0]['specialty_match'])
        self.assertEqual(result['breakdown'][0]['specialty_multiplier'], Decimal('1.00'))
