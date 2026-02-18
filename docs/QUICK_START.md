# 🚀 AniFight - Quick Start Guide

## ✅ DATA IS ALREADY LOADED!

All your requested data has been successfully loaded into the database:

### What's Loaded:
- **3 Anime**: One Piece (1.5), Naruto (1.3), Bleach (1.8)
- **30 Characters**: 10 from each anime
- **Power Scales Applied**: Bleach characters are strongest (1.8x), Naruto are balanced (1.3x), One Piece in between (1.5x)

---

## 🎮 Play the Game RIGHT NOW

1. Open your browser: **http://localhost:5173**
2. Select template: **"Draft a Team to beat mine"**
3. Select all 3 anime: **One Piece, Naruto, Bleach**
4. Enter player names (e.g., "Player 1" and "Player 2")
5. Click **"Start Game"**
6. **Draw characters** and assign them to roles!

**Both frontend and backend are already running!**

---

## 🖼️ How to Add Images

### Step 1: Go to Django Admin
```
URL: http://localhost:8000/admin
Username: admin
Password: admin123
```

### Step 2: Upload Images

**For Anime:**
1. Click "Anime" in the sidebar
2. Click on "One Piece", "Naruto", or "Bleach"
3. Scroll to "Image" field
4. Click "Choose File"
5. Select your image
6. Click "Save"

**For Characters:**
1. Click "Characters" in the sidebar
2. Click on any character name
3. Scroll to "Image" field
4. Click "Choose File"
5. Select your image
6. Click "Save"

**Recommended Image Sizes:**
- Anime: 300x300px (square)
- Characters: 600x800px (portrait, 3:4 ratio)

---

## 🔍 Where is the IMPORT Button?

The import button is in Django Admin. Here's exactly where to find it:

### Location:
```
http://localhost:8000/admin/game/anime/
```

1. Log in to Django Admin (http://localhost:8000/admin)
2. Click "Anime" or "Characters" in the sidebar
3. Look at the **TOP RIGHT** of the page
4. You'll see buttons: **[EXPORT] [IMPORT] [ADD ANIME +]**
5. Click **[IMPORT]**

### If you don't see the IMPORT button:

**Try this:**
1. Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
2. Or open in **Incognito/Private browsing** mode

**Still not visible?** The management command works perfectly:
```bash
cd backend
source venv/bin/activate
python manage.py load_top3_anime --clear
```

---

## 📊 View Your Data

### Via Django Admin:
- **Anime:** http://localhost:8000/admin/game/anime/
- **Characters:** http://localhost:8000/admin/game/character/

### Via API:
- **All Anime:** http://localhost:8000/api/anime/
- **All Characters:** http://localhost:8000/api/characters/
- **Filtered Characters:** http://localhost:8000/api/characters/?anime_ids=3,4,5

### Via Database Command:
```bash
cd backend
source venv/bin/activate
python manage.py shell
```
```python
from game.models import Anime, Character

# Count entries
print(f"Anime: {Anime.objects.count()}")
print(f"Characters: {Character.objects.count()}")

# List all anime
for anime in Anime.objects.all():
    char_count = anime.characters.count()
    print(f"{anime.name}: {char_count} characters")
```

---

## 📈 Character Power Rankings

### Highest Draw Scores (Best Pulls):
1. **Kenpachi Zaraki** (Bleach) - 176.4
2. **Ichigo Kurosaki** (Bleach) - 172.8
3. **Byakuya Kuchiki** (Bleach) - 169.2
4. **Kisuke Urahara** (Bleach) - 165.6
5. **Yoruichi Shihoin** (Bleach) - 162.0

### Why is Bleach so strong?
- Bleach has **1.8 power scale** (highest)
- Naruto has **1.3 power scale** (lowest)
- One Piece has **1.5 power scale** (middle)

This means even a 75-power Bleach character (Orihime: 135.0) has a higher draw score than an 80-power Naruto character (Sakura: 104.0)!

---

## 🔄 Need to Reload Data?

### Clear and reload everything:
```bash
cd backend
source venv/bin/activate
python manage.py load_top3_anime --clear
```

### Add more without clearing:
```bash
python manage.py load_top3_anime
```

---

## 📁 Files Created for You

### Data Files (CSV format):
- `backend/sample_data/anime_top3.csv` - 3 anime
- `backend/sample_data/characters_top3.csv` - 30 characters

### Management Command:
- `backend/game/management/commands/load_top3_anime.py` - Auto-load script

### Documentation:
- `DATA_IMPORT_GUIDE.md` - Complete import guide with troubleshooting
- `QUICK_START.md` - This file!

---

## ✨ What's Working

✅ Backend API running (port 8000)
✅ Frontend running (port 5173)
✅ Database loaded with 3 anime + 30 characters
✅ All power scales applied correctly
✅ All specialties assigned
✅ CSV import/export configured
✅ Django Admin accessible
✅ API endpoints operational
✅ Game is playable!

---

## 🎯 Next Steps

1. **Play the game** - http://localhost:5173
2. **Upload images** - Use Django Admin
3. **Test different matchups** - Bleach vs Naruto characters
4. **Add more characters** - Use CSV import or Django Admin

---

## 🆘 Quick Commands

```bash
# Check data
cd backend && source venv/bin/activate
python manage.py shell -c "from game.models import *; print(f'Anime: {Anime.objects.count()}, Characters: {Character.objects.count()}')"

# Reload data
python manage.py load_top3_anime --clear

# Restart backend
lsof -ti:8000 | xargs kill -9
python manage.py runserver

# Restart frontend
cd ../frontend
npm run dev
```

---

## 🎉 You're All Set!

Your AniFight game is ready to play with:
- **One Piece** characters (1.5x power scale)
- **Naruto** characters (1.3x power scale)
- **Bleach** characters (1.8x power scale)

**Start playing:** http://localhost:5173

**Upload images:** http://localhost:8000/admin

**Enjoy drafting!** 🚀
