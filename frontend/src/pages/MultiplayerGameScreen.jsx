import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import { useGame, GAME_SCREENS } from '../context/GameContext';
import Navigation from '../components/Navigation';
import StartScreen from '../components/StartScreen';
import DraftScreen from '../components/DraftScreen';
import ResultScreen from '../components/ResultScreen';
import MultiplayerGameBridge from '../components/MultiplayerGameBridge';

/**
 * Dedicated screen for multiplayer games
 * URL: /multiplayer/game/:roomCode
 *
 * NOTE: This component does NOT manage WebSocket connection.
 * Connection should be established BEFORE navigating here (via MultiplayerCreate or MultiplayerJoin).
 */
const MultiplayerGameScreen = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { isConnected, roomCode: connectedRoomCode, disconnect } = useMultiplayer();
  const { currentScreen, resetGame } = useGame();

  // Log render
  console.log('[MultiplayerGameScreen] Render:', {
    roomCodeFromURL: roomCode,
    connectedRoomCode,
    isConnected
  });

  // Verify connection on mount - use a timer to avoid race conditions
  useEffect(() => {
    if (!roomCode) {
      console.error('[MultiplayerGameScreen] No room code in URL');
      navigate('/');
      return;
    }

    // Give WebSocket time to connect before giving up (handles race condition)
    const timeoutId = setTimeout(() => {
      if (!isConnected || connectedRoomCode !== roomCode) {
        console.error('[MultiplayerGameScreen] Connection timeout. Expected:', roomCode, 'Connected:', connectedRoomCode);
        navigate('/');
      }
    }, 5000); // Wait 5 seconds for connection

    if (isConnected && connectedRoomCode === roomCode) {
      console.log('[MultiplayerGameScreen] ✅ Verified connection to room:', roomCode);
      clearTimeout(timeoutId); // Connection successful, clear timeout
    }

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      console.log('[MultiplayerGameScreen] Cleanup triggered');
      // Don't disconnect - prevents Strict Mode issues
    };
  }, [roomCode, connectedRoomCode, isConnected, navigate]);

  // Show loading if not connected
  if (!isConnected || connectedRoomCode !== roomCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Connecting to game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      <MultiplayerGameBridge />
      <div className="max-w-7xl mx-auto">
        {currentScreen === GAME_SCREENS.START && <StartScreen />}
        {currentScreen === GAME_SCREENS.DRAFT && <DraftScreen />}
        {currentScreen === GAME_SCREENS.RESULT && <ResultScreen />}
      </div>
    </div>
  );
};

export default MultiplayerGameScreen;
