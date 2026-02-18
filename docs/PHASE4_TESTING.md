# Phase 4: Connection Resilience Features - Testing Guide

## Overview
Phase 4 implements robust connection handling with automatic reconnection, network status monitoring, and cleanup utilities.

## Features Implemented

### Frontend Components

1. **OfflineIndicator** ([frontend/src/components/OfflineIndicator.jsx](frontend/src/components/OfflineIndicator.jsx))
   - Displays red banner at top when internet connection is lost
   - Automatically shows/hides based on browser's online/offline events
   - Global component visible on all pages

2. **ReconnectionOverlay** ([frontend/src/components/ReconnectionOverlay.jsx](frontend/src/components/ReconnectionOverlay.jsx))
   - Full-screen overlay during reconnection attempts
   - Shows reconnection progress (attempt X/10)
   - Displays reassuring message about saved game progress
   - Provides "Quit Game" button

3. **MultiplayerContext Updates** ([frontend/src/contexts/MultiplayerContext.jsx](frontend/src/contexts/MultiplayerContext.jsx))
   - Added `reconnectAttempts` state
   - Tracks reconnection progress
   - Exposes state to components

### Backend Components

1. **Cleanup Management Command** ([backend/multiplayer/management/commands/cleanup_old_rooms.py](backend/multiplayer/management/commands/cleanup_old_rooms.py))
   - Deletes rooms older than specified hours (default: 24)
   - Cleans up associated Redis cache
   - Supports dry-run mode
   - Provides detailed logging

## Testing Procedures

### 1. Cleanup Command Testing

#### Basic Usage
```bash
# Dry run (shows what would be deleted)
python manage.py cleanup_old_rooms --dry-run

# Delete rooms older than 24 hours (default)
python manage.py cleanup_old_rooms

# Delete rooms older than 6 hours
python manage.py cleanup_old_rooms --hours 6

# Help
python manage.py cleanup_old_rooms --help
```

#### Expected Output
- Lists all rooms that will be deleted
- Shows room code, status, and age
- In non-dry-run mode: deletes rooms and Redis cache
- Provides success/failure messages

### 2. Offline Indicator Testing

#### Test Scenarios

**Test 1: Network Disconnect**
1. Start the application (npm run dev)
2. Open browser to any page
3. Open browser DevTools → Network tab
4. Set to "Offline" mode
5. **Expected**: Red banner appears at top saying "No internet connection. Waiting for network..."

**Test 2: Network Reconnect**
1. Continue from Test 1
2. In DevTools, set back to "Online"
3. **Expected**: Red banner slides away smoothly

**Test 3: Multiple Pages**
1. Turn network offline
2. Navigate between different pages
3. **Expected**: Banner remains visible on all pages

### 3. Reconnection Overlay Testing

**Note**: The ReconnectionOverlay will be integrated in multiplayer pages (to be tested in integration with multiplayer components)

#### When to Show
- WebSocket connection lost during active game
- Multiple reconnection attempts in progress
- Game state being restored

#### Expected Behavior
- Shows spinner animation
- Displays current attempt number (e.g., "attempt 3/10")
- Shows reassuring message about saved progress
- "Quit Game" button works and navigates away

### 4. WebSocket Reconnection Testing

#### Test Scenarios

**Test 1: Brief Disconnection (< 5 seconds)**
1. Start a multiplayer game
2. Lock screen or close laptop lid for 3 seconds
3. Unlock/open
4. **Expected**:
   - Connection restored automatically
   - Game continues seamlessly
   - No data loss

**Test 2: Medium Disconnection (5-10 seconds)**
1. Start a multiplayer game
2. Disable WiFi for 8 seconds
3. Re-enable WiFi
4. **Expected**:
   - ReconnectionOverlay appears
   - Shows reconnection attempts
   - Connection restored
   - Game state synced

**Test 3: Long Disconnection (> 10 seconds)**
1. Start a multiplayer game
2. Disable WiFi for 15 seconds
3. **Expected**:
   - Other player sees "player disconnected" message
   - After 10 seconds, game ends
   - Results shown to remaining player

**Test 4: Network Switch**
1. Start game on WiFi
2. Switch to mobile hotspot/tethering
3. **Expected**:
   - Brief reconnection overlay
   - Automatic reconnection
   - Game continues

**Test 5: Tab Visibility**
1. Start game in browser tab
2. Switch to different tab/window for 1 minute
3. Switch back
4. **Expected**:
   - Connection maintained or quickly restored
   - Game state current

### 5. Browser Compatibility Testing

Test on multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### 6. Production Setup (Optional)

#### Cron Job for Cleanup

Add to crontab (run every 6 hours):
```bash
crontab -e
```

Add line:
```
0 */6 * * * cd /path/to/backend && /path/to/python manage.py cleanup_old_rooms
```

Or using system cron:
```bash
# /etc/cron.d/anifight-cleanup
0 */6 * * * www-data cd /var/www/anifight/backend && python manage.py cleanup_old_rooms
```

#### Celery Periodic Task (Alternative)

If using Celery, add to `celery.py`:
```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    'cleanup-old-rooms': {
        'task': 'multiplayer.tasks.cleanup_old_rooms',
        'schedule': crontab(hour='*/6'),  # Every 6 hours
    },
}
```

## Manual Testing Checklist

### Frontend
- [ ] OfflineIndicator appears when offline
- [ ] OfflineIndicator disappears when online
- [ ] OfflineIndicator visible on all pages
- [ ] Smooth animations for show/hide
- [ ] Proper styling and visibility (z-index)

### Reconnection Logic
- [ ] Exponential backoff working (1s, 2s, 4s, 8s, 10s)
- [ ] Maximum 10 reconnection attempts
- [ ] State preserved during reconnection
- [ ] Message queue flushed after reconnect
- [ ] Heartbeat resumes after reconnect

### Cleanup Command
- [ ] Dry-run shows correct rooms
- [ ] Actual deletion works
- [ ] Redis cache cleaned
- [ ] Logging works correctly
- [ ] Custom hours parameter works

## Known Issues / Notes

1. **Browser Notifications**: Browser's online/offline events may have slight delays
2. **Mobile Networks**: Network switches on mobile may trigger temporary disconnections
3. **Server Restart**: If server restarts, clients will attempt to reconnect but may fail if Redis state is lost

## Success Criteria

Phase 4 is successful if:
- ✅ OfflineIndicator shows/hides correctly based on network status
- ✅ Reconnection overlay displays during connection attempts
- ✅ WebSocket automatically reconnects with exponential backoff
- ✅ Game state preserved through brief disconnections
- ✅ Cleanup command successfully removes old rooms
- ✅ No console errors during normal operation
- ✅ Graceful degradation on connection loss

## Next Steps

After Phase 4 testing is complete:
- Proceed to Phase 5: Testing & Edge Cases (comprehensive multiplayer testing)
- Integrate ReconnectionOverlay into multiplayer game pages
- Add visual indicators for connection quality
- Consider adding connection statistics/metrics
