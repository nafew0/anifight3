# WebSocket Connection Debugging Guide

## Current Status ✅
- ✅ Redis is running (port 6379)
- ✅ Daphne ASGI server is running (port 8000)
- ✅ Frontend is running (port 5173)
- ✅ Channel layer (Redis) is communicating
- ✅ Backend HTTP API is working

## The Problem
- Host creates room → sees "disconnected" status
- Guest joins from another browser → sees "connected"
- WebSocket error: `WebSocket connection to 'ws://localhost:8000/ws/game/XXXXX/' failed` (code 1006)

## Step-by-Step Debugging

### Step 1: Check Browser Console (When Creating Room)

Open browser DevTools (F12) → Console tab, then create a multiplayer room. Look for these messages:

```
[MultiplayerContext] 📡 Connect called with room code: XXXXX
[WebSocket] Connecting to ws://localhost:8000/ws/game/XXXXX/
[WebSocket] Connected  ← Should see this if working
[WebSocket] Error: Event  ← You're seeing this instead
[WebSocket] Disconnected (code: 1006, reason: )
```

**What to check:**
- Is the room code in the WebSocket URL correct?
- Does the URL match the pattern `ws://localhost:8000/ws/game/XXXXX/` (with trailing slash)?

### Step 2: Check Daphne Terminal Output

Look at the terminal where Daphne is running. When you try to connect, you should see logs like:

```
[WS CONNECT] Starting connection - Path: /ws/game/XXXXX/
[WS CONNECT] Room code: XXXXX
[WS CONNECT] Session ID: ...
[WS CONNECT] Fetching room...
[WS CONNECT] Room found: X
[WS CONNECT] Determining role...
[WS CONNECT] Role: host
[WS CONNECT] Joining group...
[WS CONNECT] Accepting connection...
```

**What to look for:**
- Do you see `[WS CONNECT]` logs at all?
- If yes, where does it fail? (which step?)
- Do you see any ERROR messages?
- Do you see any tracebacks (Python errors)?

### Step 3: Test WebSocket Manually

Create a test HTML file to verify WebSocket works:

```bash
cat > /tmp/test_ws.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>WS Test</title></head>
<body>
<h1>WebSocket Test</h1>
<button onclick="testWS()">Test Connection</button>
<pre id="log"></pre>
<script>
function log(msg) {
  document.getElementById('log').innerText += msg + '\n';
}

async function testWS() {
  log('Creating test room via API...');
  const response = await fetch('http://localhost:8000/api/multiplayer/rooms/create_room/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      host_nickname: 'Test',
      template_id: 1,
      anime_pool_ids: [1,2]
    })
  });
  const data = await response.json();
  log('Room created: ' + data.room_code);

  log('Connecting to WebSocket...');
  const ws = new WebSocket('ws://localhost:8000/ws/game/' + data.room_code + '/');

  ws.onopen = () => log('✅ CONNECTED!');
  ws.onclose = (e) => log('❌ CLOSED: code=' + e.code + ' reason=' + e.reason);
  ws.onerror = (e) => log('❌ ERROR: ' + JSON.stringify(e));
  ws.onmessage = (e) => log('📩 MESSAGE: ' + e.data);
}
</script>
</body>
</html>
EOF

open /tmp/test_ws.html
```

This will open a test page. Click "Test Connection" and see what happens.

### Step 4: Check Database for Rooms

```bash
cd backend
source venv/bin/activate
python manage.py shell << 'EOF'
from multiplayer.models import MultiplayerRoom
rooms = MultiplayerRoom.objects.all().order_by('-created_at')[:5]
for r in rooms:
    print(f"Room: {r.room_code} | Status: {r.status} | Host: {r.host_nickname} | Guest: {r.guest_nickname or 'waiting'}")
EOF
```

Verify that rooms are being created correctly.

### Step 5: Check Redis Connection from Django

```bash
cd backend
source venv/bin/activate
python manage.py shell << 'EOF'
import asyncio
from channels.layers import get_channel_layer

async def test():
    layer = get_channel_layer()
    print("Testing Redis channel layer...")
    try:
        await layer.group_send(
            "test_group",
            {"type": "test.message", "data": "hello"}
        )
        print("✅ Can send to groups")
    except Exception as e:
        print(f"❌ Error: {e}")

asyncio.run(test())
EOF
```

### Step 6: Enable Debug Logging

Add to your `backend/anifight/settings.py` (temporarily):

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'multiplayer': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'daphne': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

Then restart Daphne and try again.

## Common Issues & Solutions

### Issue 1: Session not created
**Symptom:** Logs show "No session, using anonymous"
**Solution:** Make sure cookies are enabled in browser

### Issue 2: Room not found
**Symptom:** `[WS CONNECT] Room not found: XXXXX`
**Solution:** Room may have expired or wasn't created properly. Check database.

### Issue 3: Database locked
**Symptom:** `database is locked` error in Daphne logs
**Solution:** Stop all Django processes and restart

### Issue 4: Redis connection refused
**Symptom:** `Connection refused` to Redis
**Solution:** Start redis-server

### Issue 5: Port conflict
**Symptom:** WebSocket connects but immediately disconnects
**Solution:** Make sure only ONE Daphne process is running:
```bash
ps aux | grep daphne
# Kill any duplicate processes
```

## What to Report

After running these tests, please share:
1. What you see in the browser console (Step 1)
2. What you see in the Daphne terminal (Step 2)
3. Result of the manual WebSocket test (Step 3)
4. Any ERROR messages or Python tracebacks
