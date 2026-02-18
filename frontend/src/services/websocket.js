/**
 * WebSocket service with auto-reconnect and resilience features
 */

class GameWebSocket {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 10000; // Max 10 seconds
    this.heartbeatInterval = null;
    this.missedHeartbeats = 0;
    this.maxMissedHeartbeats = 3;
    this.isIntentionalClose = false;
    this.messageQueue = [];
    this.isConnected = false;

    // Event handlers
    this.onOpen = null;
    this.onClose = null;
    this.onMessage = null;
    this.onError = null;
    this.onReconnecting = null;
    this.onReconnected = null;

    // Network change detection
    this.setupNetworkListeners();
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/game/${this.roomCode}/`;

    console.log(`[WebSocket] Connecting to ${wsUrl}`);

    // Reset intentional close flag when explicitly connecting
    this.isIntentionalClose = false;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  handleOpen(event) {
    console.log('[WebSocket] Connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.missedHeartbeats = 0;

    // Start heartbeat monitoring
    this.startHeartbeat();

    // Flush message queue
    this.flushMessageQueue();

    // Notify application
    if (this.onOpen) this.onOpen(event);
    if (this.reconnectAttempts > 0 && this.onReconnected) {
      this.onReconnected();
    }

    // Request state sync after reconnection
    if (this.reconnectAttempts > 0) {
      this.send({ type: 'request_sync' });
    }
  }

  handleClose(event) {
    console.log(`[WebSocket] Disconnected (code: ${event.code}, reason: ${event.reason})`);
    this.isConnected = false;
    this.stopHeartbeat();

    // Notify application
    if (this.onClose) this.onClose(event);

    // Attempt reconnection if not intentional
    if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      // Handle ping/pong
      if (data.type === 'ping') {
        this.missedHeartbeats = 0;
        this.send({ type: 'pong', timestamp: data.timestamp });
        return;
      }

      // Forward to application
      if (this.onMessage) this.onMessage(data);
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
    }
  }

  handleError(event) {
    console.error('[WebSocket] Error:', event);
    if (this.onError) this.onError(event);
  }

  attemptReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    if (this.onReconnecting) {
      this.onReconnecting(this.reconnectAttempts, delay);
    }

    setTimeout(() => {
      if (!this.isIntentionalClose) {
        this.connect();
      }
    }, delay);
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message for later
      console.log('[WebSocket] Message queued (not connected)');
      this.messageQueue.push(data);
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.missedHeartbeats++;
      if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
        console.warn('[WebSocket] Heartbeat timeout, closing connection');
        this.ws.close();
      }
    }, 15000); // Check every 15 seconds (server sends every 5s)
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  setupNetworkListeners() {
    // Detect online/offline events
    window.addEventListener('online', () => {
      console.log('[WebSocket] Network online, attempting reconnect');
      if (!this.isConnected && !this.isIntentionalClose) {
        this.reconnectAttempts = 0; // Reset attempts on network recovery
        this.connect();
      }
    });

    window.addEventListener('offline', () => {
      console.log('[WebSocket] Network offline');
    });

    // Detect visibility change (tab hidden/shown)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isConnected && !this.isIntentionalClose) {
        console.log('[WebSocket] Tab visible, checking connection');
        this.connect();
      }
    });
  }

  close() {
    console.log('[WebSocket] Closing connection (intentional)');
    this.isIntentionalClose = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }

  // Convenience methods for game actions

  startGame(templateId, animePoolIds) {
    this.send({
      type: 'start_game',
      template_id: templateId,
      anime_pool_ids: animePoolIds,
    });
  }

  drawCharacter(characterData) {
    this.send({
      type: 'draw_character',
      character: characterData,
    });
  }

  placeCharacter(characterId, roleName) {
    this.send({
      type: 'place_character',
      character_id: characterId,
      role_name: roleName,
    });
  }

  resetGame() {
    this.send({
      type: 'reset_game',
    });
  }
}

export default GameWebSocket;
