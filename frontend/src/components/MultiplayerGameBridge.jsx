import { useEffect, useState, useRef } from 'react';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import { useGame } from '../context/GameContext';
import { api } from '../services/api';

/**
 * Bridge component to connect Multiplayer context with Game context
 * Initializes the game when multiplayer game starts
 */
const MultiplayerGameBridge = () => {
  const { gameState, playerRole, isMultiplayerGame } = useMultiplayer();
  const { startGame, currentScreen } = useGame();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const initializingRef = useRef(false);

  useEffect(() => {
    // Reset when multiplayer game ends
    if (!isMultiplayerGame) {
      setHasInitialized(false);
      initializingRef.current = false;
    }
  }, [isMultiplayerGame]);

  useEffect(() => {
    // Check if multiplayer game is starting
    if (
      gameState &&
      gameState.status === 'in_progress' &&
      gameState.template_id &&
      gameState.anime_pool_ids &&
      !hasInitialized &&
      !isLoading &&
      !initializingRef.current &&
      currentScreen === 'start' // Only initialize if still on start screen
    ) {
      initializeMultiplayerGame();
    }
  }, [gameState, hasInitialized, isLoading, currentScreen]);

  const initializeMultiplayerGame = async () => {
    if (initializingRef.current) {
      console.log('[MultiplayerBridge] Already initializing, skipping...');
      return;
    }

    initializingRef.current = true;
    console.log('[MultiplayerBridge] Initializing multiplayer game...', gameState);
    setIsLoading(true);

    try {
      // Fetch template data
      console.log('[MultiplayerBridge] Fetching template...', gameState.template_id);
      const templateResponse = await api.getTemplates();
      const template = templateResponse.data.find(t => t.id === gameState.template_id);

      if (!template) {
        throw new Error(`Template ${gameState.template_id} not found`);
      }

      // Fetch characters for the anime pool
      console.log('[MultiplayerBridge] Fetching characters...', gameState.anime_pool_ids);
      const charactersResponse = await api.getCharacters(gameState.anime_pool_ids);
      const characters = charactersResponse.data;

      if (!characters || characters.length === 0) {
        throw new Error('No characters found for selected anime');
      }

      console.log('[MultiplayerBridge] Starting game with:', {
        template: template.name,
        characters: characters.length,
        playerRole
      });

      // Determine player names based on role
      const player1Name = playerRole === 'host' ? 'You (Host)' : 'Host';
      const player2Name = playerRole === 'guest' ? 'You (Guest)' : 'Guest';

      // Start the game
      startGame(
        template,
        gameState.anime_pool_ids,
        characters,
        player1Name,
        player2Name
      );

      setHasInitialized(true);
      console.log('[MultiplayerBridge] Game initialized successfully!');
    } catch (error) {
      console.error('[MultiplayerBridge] Failed to initialize game:', error);
      alert(`Failed to start multiplayer game: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // This component doesn't render anything
  return null;
};

export default MultiplayerGameBridge;
