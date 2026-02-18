# Phase 5 Draft Screen Test Plan

## Test Date: 2025-10-22

## Components Implemented:
- ✅ CharacterCard - Displays character with image, stats, and drag functionality
- ✅ RoleSlot - Drop target for characters with visual feedback
- ✅ DrawButton - Button with shuffle animation (1.2s)
- ✅ RatingBanner - Tier feedback display (S/A/B/C/D)
- ✅ DraftScreen - Full draft interface with drag-and-drop

## Features Implemented:
- ✅ Draw Character API Integration (`POST /api/draw/`)
- ✅ Shuffle animation (cycles through character images for 1.2s)
- ✅ Rating tier calculation (S≥90%, A≥70%, B≥40%, C≥10%, D<10%)
- ✅ Drag-and-drop using @dnd-kit
- ✅ Mobile tap-to-place fallback
- ✅ Turn management and indicators
- ✅ Game completion detection
- ✅ Auto-transition to results when complete
- ✅ Reset match with confirmation dialog
- ✅ LocalStorage state persistence
- ✅ Mute button (placeholder for Phase 6)

## Manual Test Scenarios:

### Scenario 1: Basic Draft Flow
1. ✅ Navigate to http://localhost:5173
2. ✅ Select template "Draft a Team to beat mine"
3. ✅ Select anime "Fairy Tales"
4. ✅ Enter player names and start game
5. ✅ Click "Draw Character" button
6. ✅ Verify shuffle animation plays for ~1.2 seconds
7. ✅ Verify rating banner appears with tier (S/A/B/C/D)
8. ✅ Drag character to Player 1's CAPTAIN slot
9. ✅ Verify character appears in slot
10. ✅ Verify turn switches to Player 2
11. ✅ Continue until all slots filled
12. ✅ Verify auto-transition to results screen

### Scenario 2: Mobile Tap-to-Place
1. Open browser dev tools, enable mobile view
2. Start a new game
3. Draw a character
4. Tap/click on a highlighted slot instead of dragging
5. Verify character is assigned to slot
6. Verify turn switches

### Scenario 3: Reset Match
1. Start a game and make a few assignments
2. Click "Reset Match" button
3. Verify confirmation dialog appears
4. Click "Reset" to confirm
5. Verify game returns to start screen
6. Verify all state is cleared

### Scenario 4: Rating Tiers
Test that different character power levels show correct tiers:
- S tier: Top 10% characters (≥90 percentile)
- A tier: 70-90 percentile
- B tier: 40-70 percentile
- C tier: 10-40 percentile
- D tier: Bottom 10% (<10 percentile)

### Scenario 5: State Persistence
1. Start a game and make some assignments
2. Refresh the page
3. Verify game state is restored from localStorage
4. Verify all assignments are preserved
5. Continue playing from where left off

## API Endpoints Tested:
- ✅ GET /api/templates/ - Returns published templates
- ✅ GET /api/anime/ - Returns anime list
- ✅ GET /api/characters/?anime_ids=2 - Returns filtered characters
- ✅ POST /api/draw/ - Draws random character from pool

## Browser Compatibility:
- [ ] Chrome/Edge (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Chrome (mobile)
- [ ] Safari (mobile)

## Known Issues:
None identified yet

## Next Steps:
- Phase 6: Audio & Sound Effects
- Phase 7: Result Screen improvements
- Phase 8: Animations & Polish
