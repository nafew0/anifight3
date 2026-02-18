# Manual Testing Checklist for Phase 5 - Draft Screen

## ✅ Backend API Tests (Completed)
- ✅ GET /api/templates/ - Returns templates
- ✅ GET /api/anime/ - Returns anime list
- ✅ GET /api/characters/?anime_ids=X - Returns characters
- ✅ POST /api/draw/ - Draws random character
- ✅ POST /api/score/ - Calculates final scores
- ✅ Automated test script runs successfully

## Frontend UI Tests (To be tested in browser)

### 1. Start Screen Flow
- [ ] Navigate to http://localhost:5173
- [ ] Verify start screen loads without errors
- [ ] Select template "Draft a Team to beat mine"
- [ ] Select anime "Fairy Tales"
- [ ] Enter Player 1 name: "Alice"
- [ ] Enter Player 2 name: "Bob"
- [ ] Click "Start Game"
- [ ] Verify navigation to Draft Screen

### 2. Draft Screen - UI Components
- [ ] Verify turn indicator shows "Alice's Turn"
- [ ] Verify Player 1 panel shows 6 empty slots (CAPTAIN, VICE CAPTAIN, TANK, HEALER, SUPPORT, SUPPORT)
- [ ] Verify Player 2 panel shows 6 empty slots
- [ ] Verify center area shows "Draw Character" button
- [ ] Verify footer shows template name, mute button, and reset button
- [ ] Verify remaining characters count displays correctly

### 3. Draw Character Flow
- [ ] Click "Draw Character" button
- [ ] Verify shuffle animation plays (cycling through images for ~1.2 seconds)
- [ ] Verify "Drawing..." text appears during shuffle
- [ ] Verify character card appears after animation
- [ ] Verify rating banner appears with tier (S/A/B/C/D)
- [ ] Verify banner has appropriate color and glow effect
- [ ] Verify character card shows: image, name, anime name, stats
- [ ] Verify "Drag to a slot or tap a highlighted slot" instruction appears

### 4. Drag and Drop (Desktop)
- [ ] Verify drawn character card is draggable (cursor changes to grab)
- [ ] Verify Player 1's slots are highlighted (blue border, pulsing)
- [ ] Verify Player 2's slots are NOT highlighted (gray, locked)
- [ ] Drag character to Player 1's CAPTAIN slot
- [ ] Verify slot turns green when hovering over it
- [ ] Drop character on CAPTAIN slot
- [ ] Verify character appears in compact form in the slot
- [ ] Verify if character has CAPTAIN specialty, "MATCH!" badge appears
- [ ] Verify turn switches to "Bob's Turn"
- [ ] Verify Player 1's slots are now locked (gray)
- [ ] Verify Player 2's slots are now highlighted

### 5. Tap-to-Place (Mobile/Desktop Click)
- [ ] Draw a character
- [ ] Instead of dragging, click directly on a highlighted slot
- [ ] Verify character is assigned to that slot
- [ ] Verify turn switches
- [ ] Verify tap on locked slot does nothing

### 6. Turn Management
- [ ] Verify turn indicator updates with animation on each turn switch
- [ ] Verify green pulse dot moves to current player
- [ ] Verify only current player's empty slots are highlighted
- [ ] Verify non-current player's slots are locked
- [ ] Verify draw button is only enabled on current player's turn
- [ ] Verify remaining characters count decreases after each draw

### 7. Game Completion
- [ ] Continue drawing and placing until all 12 slots are filled (6 per player)
- [ ] Verify after last placement, "Draft Complete!" message appears
- [ ] Verify green checkmark and "Calculating results..." text shows
- [ ] Verify auto-transition to Result Screen after ~1 second

### 8. Reset Match
- [ ] Start a new game and make 2-3 assignments
- [ ] Click "Reset Match" button
- [ ] Verify confirmation modal appears with warning icon
- [ ] Verify modal has "Reset Match?" title and warning message
- [ ] Click "Cancel"
- [ ] Verify modal closes and game continues
- [ ] Click "Reset Match" again
- [ ] Click "Reset" to confirm
- [ ] Verify navigation to Start Screen
- [ ] Verify all game state is cleared

### 9. State Persistence (LocalStorage)
- [ ] Start a game and make 3-4 assignments
- [ ] Note current turn and assignments
- [ ] Refresh the page (F5 or Cmd+R)
- [ ] Verify game state is restored
- [ ] Verify all assignments are still there
- [ ] Verify turn is preserved
- [ ] Continue playing from where left off

### 10. Mute Button (Placeholder)
- [ ] Click mute button
- [ ] Verify icon changes from speaker to muted speaker
- [ ] Click again
- [ ] Verify icon changes back
- [ ] Note: No actual audio yet (Phase 6)

### 11. Rating Tiers
Test with different character power levels (if more characters available):
- [ ] S tier (gold/red gradient, "INSANE PULL!"): Top 10% characters
- [ ] A tier (purple/pink gradient, "GREAT PULL!"): 70-90 percentile
- [ ] B tier (blue gradient, "Good Pull"): 40-70 percentile
- [ ] C tier (green gradient, "Decent Pull"): 10-40 percentile
- [ ] D tier (gray gradient, "Weak Pull"): Bottom 10%

### 12. Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify 3-column layout on large screens
- [ ] Verify stacked layout on mobile
- [ ] Verify all text is readable
- [ ] Verify buttons are easily tappable
- [ ] Verify drag-and-drop works or tap-to-place fallback works

### 13. Error Handling
- [ ] Stop backend server
- [ ] Try to draw a character
- [ ] Verify error alert appears
- [ ] Verify game doesn't break
- [ ] Restart backend
- [ ] Verify game continues working

### 14. Animations
- [ ] Verify turn indicator animates when turn changes (scale + fade)
- [ ] Verify rating banner animates in (spring animation + shine effect)
- [ ] Verify S tier has particle effects
- [ ] Verify "Draft Complete!" message animates in
- [ ] Verify reset confirmation modal animates in/out
- [ ] Verify draw button has hover/tap feedback
- [ ] Verify character card has hover scale effect

## Performance Checks
- [ ] No console errors
- [ ] No console warnings
- [ ] Animations are smooth (60fps)
- [ ] API calls complete within reasonable time (<1s)
- [ ] Page load is fast
- [ ] LocalStorage operations don't cause lag

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Chrome Mobile
- [ ] Safari Mobile

## Accessibility
- [ ] All buttons have appropriate hover states
- [ ] Focus indicators are visible
- [ ] Text contrast is sufficient
- [ ] Interactive elements are keyboard accessible
- [ ] Screen reader compatible (aria labels if needed)

## Known Limitations (Expected)
- ✅ Only 1 character in database for testing (will draw same character)
- ✅ No sound effects yet (Phase 6)
- ✅ Result screen is placeholder (Phase 7 improvements)

## Test Results
Date: 2025-10-22
Tester: ___________
Status: ⬜ Pass / ⬜ Fail
Notes: _____________________________________________
