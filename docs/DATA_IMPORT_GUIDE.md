# AniFight - Data Import Guide

## ✅ DATA ALREADY LOADED!

**Good news!** I've already loaded all the data for you:

### Loaded Data:
- ✅ **3 Anime**: One Piece (1.5), Naruto (1.3), Bleach (1.8)
- ✅ **30 Characters**: 10 from each anime with proper power scales and specialties

**Verify Data:**
- Frontend: http://localhost:5173
- Django Admin: http://localhost:8000/admin (username: admin, password: admin123)
- API: http://localhost:8000/api/anime/ and http://localhost:8000/api/characters/

---

## 📊 Character Summary

### One Piece (Power Scale: 1.5)
**Draw Score Range: 102.0 - 142.5**

| Character | Power | Draw Score | Specialties |
|-----------|-------|------------|-------------|
| Monkey D. Luffy | 95.0 | 142.5 | CAPTAIN |
| Roronoa Zoro | 93.0 | 139.5 | VICE CAPTAIN, TANK |
| Sanji | 90.0 | 135.0 | SUPPORT |
| Jinbe | 88.0 | 132.0 | TANK |
| Nico Robin | 82.0 | 123.0 | SUPPORT |
| Franky | 78.0 | 117.0 | TANK |
| Nami | 75.0 | 112.5 | SUPPORT |
| Brook | 72.0 | 108.0 | SUPPORT |
| Tony Tony Chopper | 70.0 | 105.0 | HEALER |
| Usopp | 68.0 | 102.0 | SUPPORT |

### Naruto (Power Scale: 1.3)
**Draw Score Range: 104.0 - 126.1**

| Character | Power | Draw Score | Specialties |
|-----------|-------|------------|-------------|
| Minato Namikaze | 97.0 | 126.1 | CAPTAIN |
| Itachi Uchiha | 96.0 | 124.8 | CAPTAIN |
| Naruto Uzumaki | 95.0 | 123.5 | CAPTAIN |
| Sasuke Uchiha | 93.0 | 120.9 | VICE CAPTAIN |
| Jiraiya | 90.0 | 117.0 | SUPPORT |
| Kakashi Hatake | 88.0 | 114.4 | SUPPORT |
| Might Guy | 87.0 | 113.1 | TANK |
| Tsunade | 85.0 | 110.5 | HEALER |
| Rock Lee | 82.0 | 106.6 | TANK |
| Sakura Haruno | 80.0 | 104.0 | HEALER |

### Bleach (Power Scale: 1.8)
**Draw Score Range: 135.0 - 176.4**

| Character | Power | Draw Score | Specialties |
|-----------|-------|------------|-------------|
| Kenpachi Zaraki | 98.0 | 176.4 | TANK |
| Ichigo Kurosaki | 96.0 | 172.8 | CAPTAIN |
| Byakuya Kuchiki | 94.0 | 169.2 | CAPTAIN |
| Kisuke Urahara | 92.0 | 165.6 | SUPPORT |
| Yoruichi Shihoin | 90.0 | 162.0 | SUPPORT |
| Toshiro Hitsugaya | 88.0 | 158.4 | VICE CAPTAIN |
| Renji Abarai | 85.0 | 153.0 | VICE CAPTAIN |
| Rukia Kuchiki | 82.0 | 147.6 | SUPPORT |
| Uryu Ishida | 78.0 | 140.4 | SUPPORT |
| Orihime Inoue | 75.0 | 135.0 | HEALER |

---

## 🎮 Test the Game

1. **Start the game:** http://localhost:5173
2. Select template "Draft a Team to beat mine"
3. Select all 3 anime (One Piece, Naruto, Bleach)
4. Enter player names
5. Start drafting!

**Note:** Bleach characters have the highest draw scores due to 1.8 power scale!

---

## 🔄 Method 1: Reload Data (Django Command) - EASIEST

If you need to reload or clear the data:

```bash
cd backend
source venv/bin/activate

# Reload data (clears existing first)
python manage.py load_top3_anime --clear

# Add without clearing
python manage.py load_top3_anime
```

**Advantages:**
- ✅ Fastest method
- ✅ No manual steps
- ✅ Always works
- ✅ Can be scripted

---

## 📁 Method 2: CSV Import (Django Admin)

If you want to use CSV import (useful for bulk updates):

### Step 1: Access Django Admin
```
URL: http://localhost:8000/admin
Username: admin
Password: admin123
```

### Step 2: Import Anime

1. Click **"Anime"** in the sidebar
2. Look for the **"IMPORT"** button (top right, next to "ADD ANIME")
3. Click "IMPORT"
4. Choose file: `backend/sample_data/anime_top3.csv`
5. Click "Submit"
6. Review preview (should show 3 anime)
7. Click "Confirm import"
8. ✓ Success!

**CSV File Location:** `/backend/sample_data/anime_top3.csv`

**CSV Format:**
```csv
name
One Piece
Naruto
Bleach
```

### Step 3: Import Characters

1. Click **"Characters"** in the sidebar
2. Click **"IMPORT"** button
3. Choose file: `backend/sample_data/characters_top3.csv`
4. Click "Submit"
5. Review preview (should show 30 characters)
6. Click "Confirm import"
7. ✓ Success!

**CSV File Location:** `/backend/sample_data/characters_top3.csv`

**CSV Format:**
```csv
name,anime,anime_power_scale,character_power,specialties
Monkey D. Luffy,One Piece,1.5,95.0,CAPTAIN
Roronoa Zoro,One Piece,1.5,93.0,"VICE CAPTAIN,TANK"
...
```

---

## 🔧 Troubleshooting Import Button

### Issue: "I don't see the IMPORT button"

**Solutions:**

1. **Check if django-import-export is installed:**
   ```bash
   cd backend
   source venv/bin/activate
   pip install django-import-export
   ```

2. **Verify it's in INSTALLED_APPS:**
   ```bash
   cd backend
   grep -r "import_export" anifight/settings.py
   ```
   Should show: `'import_export',`

3. **Restart Django server:**
   ```bash
   # Kill old server
   lsof -ti:8000 | xargs kill -9

   # Start fresh
   cd backend
   source venv/bin/activate
   python manage.py runserver
   ```

4. **Clear browser cache:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or try incognito/private browsing

5. **Check admin permissions:**
   - Make sure you're logged in as superuser (admin)
   - Regular staff users may not see import/export

### Issue: "Import fails with validation errors"

**Common Causes:**

❌ **Anime not imported first**
```
Error: Anime "One Piece" does not exist
Solution: Import anime_top3.csv BEFORE characters_top3.csv
```

❌ **Anime name mismatch**
```
Error: Anime "one piece" does not exist (case-sensitive!)
Solution: Ensure anime names match exactly (case-sensitive)
```

❌ **Invalid power range**
```
Error: character_power must be between 1.00 and 100.00
Solution: Check all character_power values are 1-100
```

❌ **Missing required field**
```
Error: Name is required
Solution: Ensure every row has a name
```

### Issue: "CSV format errors"

**Check CSV Format:**

✅ **Correct Format:**
```csv
name,anime,anime_power_scale,character_power,specialties
Monkey D. Luffy,One Piece,1.5,95.0,CAPTAIN
```

❌ **Wrong Format:**
```csv
name;anime;anime_power_scale;character_power;specialties  # Semicolons instead of commas
Monkey D. Luffy One Piece 1.5 95.0 CAPTAIN  # Spaces instead of commas
```

**Fix:**
- Use commas (`,`) as separator, not semicolons (`;`)
- First row must be column headers
- Wrap values with commas in quotes: `"VICE CAPTAIN,TANK"`
- Ensure UTF-8 encoding

---

## 🖼️ Adding Images

Images are **NOT** included in CSV import (by design). Add them via Django Admin:

### Method 1: Django Admin (Recommended)

1. Go to http://localhost:8000/admin
2. Click "Anime" or "Characters"
3. Click on the name to edit
4. Click "Choose File" next to Image field
5. Upload your image
6. Click "Save"

### Method 2: Direct File Upload

1. Place images in `backend/media/anime/` or `backend/media/characters/`
2. Update database directly:
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py shell
   ```
   ```python
   from game.models import Anime
   anime = Anime.objects.get(name="One Piece")
   anime.image = "anime/onepiece.png"
   anime.save()
   ```

### Recommended Image Specs:
- **Anime:** 300x300px (square)
- **Characters:** 600x800px (portrait, 3:4 ratio)
- **Format:** PNG or JPG
- **Max size:** 2MB

---

## 📋 Quick Reference

### Management Commands
```bash
# Load data (clears first)
python manage.py load_top3_anime --clear

# Load data (keeps existing)
python manage.py load_top3_anime

# Check what's in database
python manage.py shell
>>> from game.models import Anime, Character
>>> Anime.objects.count()
>>> Character.objects.count()
```

### API Endpoints
```bash
# List all anime
curl http://localhost:8000/api/anime/

# List all characters
curl http://localhost:8000/api/characters/

# List characters from specific anime
curl "http://localhost:8000/api/characters/?anime_ids=3,4,5"

# Draw a character
curl -X POST http://localhost:8000/api/draw/ \
  -H "Content-Type: application/json" \
  -d '{"remainingCharacterIds": [1,2,3,4,5]}'
```

### File Locations
```
backend/
├── sample_data/
│   ├── anime_top3.csv           ← Import this first
│   └── characters_top3.csv      ← Then import this
├── game/
│   └── management/
│       └── commands/
│           └── load_top3_anime.py  ← Django command
└── media/
    ├── anime/                   ← Put anime images here
    └── characters/              ← Put character images here
```

---

## ✨ Next Steps

1. ✅ **Data is loaded** - 3 anime, 30 characters
2. 🖼️ **Upload images** - Add images via Django Admin
3. 🎮 **Play the game** - Test at http://localhost:5173
4. 📊 **Add more characters** - Use CSV import or Django Admin
5. 🎨 **Customize** - Adjust power scales and specialties

---

## 🆘 Still Having Issues?

If the import button still doesn't show:

1. **Check browser console** (F12) for JavaScript errors
2. **Verify URL** - Should be http://localhost:8000/admin/game/anime/
3. **Try different browser** - Chrome, Firefox, Safari
4. **Check Python packages:**
   ```bash
   cd backend
   source venv/bin/activate
   pip list | grep import-export
   ```
   Should show: `django-import-export` with version number

5. **Use the management command instead** - It's more reliable!
   ```bash
   python manage.py load_top3_anime --clear
   ```

---

**All data is ready to use! You can now upload images for the anime and characters via Django Admin.**
