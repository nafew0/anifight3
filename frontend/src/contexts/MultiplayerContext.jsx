import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import GameWebSocket from '../services/websocket';

const MultiplayerContext = createContext();

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within MultiplayerProvider');
  }
  return context;
};

export const MultiplayerProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [playerRole, setPlayerRole] = useState(null); // 'host' or 'guest'
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [isMultiplayerGame, setIsMultiplayerGame] = useState(false);

  // Initialize WebSocket connection
  const connect = useCallback((code) => {
    console.log('[MultiplayerContext] 📡 Connect called with room code:', code);

    if (ws) {
      console.log('[MultiplayerContext] Closing existing WebSocket');
      ws.close();
    }

    const socket = new GameWebSocket(code);

    socket.onOpen = () => {
      console.log('[MultiplayerContext] ✅ WebSocket opened');
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempts(0);
    };

    socket.onClose = () => {
      console.log('[MultiplayerContext] ❌ WebSocket closed');
      setIsConnected(false);
    };

    socket.onReconnecting = (attempt, delay) => {
      setIsReconnecting(true);
      setReconnectAttempts(attempt);
    };

    socket.onReconnected = () => {
      setIsReconnecting(false);
      setReconnectAttempts(0);
    };

    socket.onMessage = (data) => {
      handleWebSocketMessage(data);
    };

    socket.connect();
    setWs(socket);
    setRoomCode(code);
    console.log('[MultiplayerContext] ✅ Room code set to:', code);
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    console.log('[Multiplayer] Received:', data.type, data);

    switch (data.type) {
      case 'connection_established':
        setPlayerRole(data.player_role);
        setGameState(data.current_state);
        break;

      case 'player_joined':
        setOpponentConnected(true);
        break;

      case 'player_disconnected':
        setOpponentConnected(false);
        break;

      case 'player_reconnected':
        setOpponentConnected(true);
        break;

      case 'game_started':
        setIsMultiplayerGame(true);
        setGameState((prev) => ({
          ...prev,
          status: 'in_progress',
          template_id: data.template_id,
          anime_pool_ids: data.anime_pool_ids,
        }));
        break;

      case 'character_drawn':
        setGameState((prev) => ({
          ...prev,
          drawn_character: data.character,
          current_turn: data.player_role === 'host' ? 'guest' : 'host',
        }));
        break;

      case 'character_placed':
        setGameState((prev) => {
          const placementsKey = `${data.player_role}_placements`;
          return {
            ...prev,
            [placementsKey]: {
              ...prev[placementsKey],
              [data.role_name]: data.character_id,
            },
            drawn_character: null,
            current_turn: data.player_role === 'host' ? 'guest' : 'host',
            is_complete: data.is_complete,
          };
        });
        break;

      case 'game_ended':
        setGameState((prev) => ({
          ...prev,
          status: 'completed',
          results: data.results,
          end_reason: data.reason,
        }));
        break;

      case 'state_sync':
        setGameState(data.state);
        break;

      case 'error':
        console.error('[Multiplayer] Error:', data.message);
        break;

      default:
        console.log('[Multiplayer] Unknown message type:', data.type);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    setRoomCode(null);
    setPlayerRole(null);
    setIsConnected(false);
    setOpponentConnected(false);
    setGameState(null);
    setIsMultiplayerGame(false);
  }, [ws]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const value = {
    ws,
    connect,
    disconnect,
    roomCode,
    playerRole,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    opponentConnected,
    gameState,
    setGameState,
    isMultiplayerGame,
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
};
