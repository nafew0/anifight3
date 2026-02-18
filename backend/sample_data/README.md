# Sample CSV Data for AniFight

This directory contains sample CSV files for testing the import functionality in Django Admin.

## Files

### anime_sample.csv
Sample anime data for import.

**Format:**
```csv
name
```

**Fields:**
- `name` (required): Unique name of the anime

**Note:** Images must be uploaded through the Django Admin interface after importing. CSV import does not support image uploads.

**Example:**
```csv
name
Naruto
One Piece
```

### characters_sample.csv
Sample character data for import. Includes various test scenarios:
- Characters with all fields populated
- Characters with missing anime (standalone)
- Characters with missing power stats (will be treated as 0)
- Characters with multiple specialties
- Characters with no specialties

**Format:**
```csv
name,anime,anime_power_scale,character_power,specialties
```

**Fields:**
- `name` (required): Character name
- `anime` (optional): Anime name (must match existing anime exactly)
- `anime_power_scale` (optional): APS multiplier, can be any positive decimal
- `character_power` (optional): CP value, must be between 1.00 and 100.00
- `specialties` (optional): Comma-separated role specialties (e.g., "CAPTAIN,TANK")

**Note:** Images must be uploaded through the Django Admin interface after importing. CSV import does not support image uploads.

**Example:**
```csv
name,anime,anime_power_scale,character_power,specialties
Naruto Uzumaki,Naruto,8.5,95.0,CAPTAIN
Roronoa Zoro,One Piece,9.2,95.0,"VICE CAPTAIN,TANK"
Weak Character,Naruto,2.5,15.0,
Character With No Anime,,,5.0,50.0,SUPPORT
```

## How to Import

1. Go to Django Admin: http://localhost:8000/admin
2. Login with: admin/admin123
3. Navigate to the model you want to import (Anime or Characters)
4. Click the "Import" button at the top right
5. Select the CSV file
6. Review the import preview
7. Click "Confirm import" to execute

## Import Order

**Important:** Import anime first, then characters!

1. Import `anime_sample.csv` into the Anime model
2. Import `characters_sample.csv` into the Character model

This ensures that anime references in the character CSV can be matched correctly.

## Validation Rules

### Anime
- `name` is required and must be unique
- Whitespace is automatically trimmed from names
- Images must be uploaded via admin interface (not CSV)

### Characters
- `name` is required
- `anime` must match an existing anime name exactly (case-sensitive), or be empty
- Empty numeric fields (`anime_power_scale`, `character_power`) are converted to null
- `character_power` must be between 1.00 and 100.00 if provided
- `specialties` should be comma-separated values (e.g., "CAPTAIN,TANK")
- Each specialty is trimmed of whitespace
- Images must be uploaded via admin interface (not CSV)

## Error Handling

If an import fails:
1. Check the error message in the Django Admin interface
2. Common issues:
   - Missing required `name` field
   - `character_power` outside valid range (1.00-100.00)
   - Anime name doesn't match (import anime first!)
   - Invalid numeric format for power fields
3. Fix the CSV and try again

## Exporting Data

You can also export existing data to CSV:
1. Go to the model list page in Django Admin
2. Click the "Export" button
3. Choose CSV format
4. Download the file

This is useful for:
- Creating templates for new imports
- Backing up data
- Sharing data between environments
