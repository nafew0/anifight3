import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import soundManager from '../utils/soundManager';

const GameContext = createContext();

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;

export const GAME_SCREENS = {
  START: 'start',
  DRAFT: 'draft',
  RESULT: 'result',
};

export const GameProvider = ({ children }) => {
  // Current screen
  const [currentScreen, setCurrentScreen] = useState(GAME_SCREENS.START);

  // Game configuration
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAnimeIds, setSelectedAnimeIds] = useState([]);
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');

  // Character pool (filtered based on selected anime)
  const [characterPool, setCharacterPool] = useState([]);
  const [remainingCharacterIds, setRemainingCharacterIds] = useState([]);

  // Draft state
  const [drawnCharacter, setDrawnCharacter] = useState(null);
  const [drawnCharacterRating, setDrawnCharacterRating] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Game state
  const [currentTurn, setCurrentTurn] = useState(1); // 1 or 2
  const [player1Assignments, setPlayer1Assignments] = useState({});
  const [player2Assignments, setPlayer2Assignments] = useState({});

  // Sound state
  const [muted, setMuted] = useState(soundManager.isMuted());
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('anifight_game_state');
      if (saved) {
        const state = JSON.parse(saved);

        // Restore state
        if (state.currentScreen) setCurrentScreen(state.currentScreen);
        if (state.selectedTemplate) setSelectedTemplate(state.selectedTemplate);
        if (state.selectedAnimeIds) setSelectedAnimeIds(state.selectedAnimeIds);
        if (state.player1Name) setPlayer1Name(state.player1Name);
        if (state.player2Name) setPlayer2Name(state.player2Name);
        if (state.characterPool) setCharacterPool(state.characterPool);
        if (state.remainingCharacterIds) setRemainingCharacterIds(state.remainingCharacterIds);
        if (state.drawnCharacter) setDrawnCharacter(state.drawnCharacter);
        if (state.drawnCharacterRating) setDrawnCharacterRating(state.drawnCharacterRating);
        if (state.currentTurn) setCurrentTurn(state.currentTurn);
        if (state.player1Assignments) setPlayer1Assignments(state.player1Assignments);
        if (state.player2Assignments) setPlayer2Assignments(state.player2Assignments);
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
      // Clear corrupted data
      localStorage.removeItem('anifight_game_state');
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const state = {
        currentScreen,
        selectedTemplate,
        selectedAnimeIds,
        player1Name,
        player2Name,
        characterPool,
        remainingCharacterIds,
        drawnCharacter,
        drawnCharacterRating,
        currentTurn,
        player1Assignments,
        player2Assignments,
      };
      localStorage.setItem('anifight_game_state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }, [
    currentScreen,
    selectedTemplate,
    selectedAnimeIds,
    player1Name,
    player2Name,
    characterPool,
    remainingCharacterIds,
    drawnCharacter,
    drawnCharacterRating,
    currentTurn,
    player1Assignments,
    player2Assignments,
  ]);

  // Start a new game
  const startGame = (template, animeIds, characters, p1Name, p2Name) => {
    setSelectedTemplate(template);
    setSelectedAnimeIds(animeIds);
    setCharacterPool(characters);
    setRemainingCharacterIds(characters.map(c => c.id));
    setPlayer1Name(p1Name || 'Player 1');
    setPlayer2Name(p2Name || 'Player 2');
    setCurrentTurn(1);
    setPlayer1Assignments({});
    setPlayer2Assignments({});
    setCurrentScreen(GAME_SCREENS.DRAFT);

    // Initialize sound manager
    soundManager.init();
  };

  // Reset game (go back to start)
  const resetGame = () => {
    setCurrentScreen(GAME_SCREENS.START);
    setSelectedTemplate(null);
    setSelectedAnimeIds([]);
    setPlayer1Name('');
    setPlayer2Name('');
    setCharacterPool([]);
    setRemainingCharacterIds([]);
    setDrawnCharacter(null);
    setDrawnCharacterRating(null);
    setCurrentTurn(1);
    setPlayer1Assignments({});
    setPlayer2Assignments({});
    localStorage.removeItem('anifight_game_state');
  };

  // Play again (keep template and anime selection)
  const playAgain = () => {
    setRemainingCharacterIds(characterPool.map(c => c.id));
    setDrawnCharacter(null);
    setDrawnCharacterRating(null);
    setCurrentTurn(1);
    setPlayer1Assignments({});
    setPlayer2Assignments({});
    setCurrentScreen(GAME_SCREENS.DRAFT);
  };

  // Assign character to role (roleKey should be "ROLE-index" for duplicate roles)
  const assignCharacter = (player, roleKey, character) => {
    if (player === 1) {
      setPlayer1Assignments(prev => ({ ...prev, [roleKey]: character }));
    } else {
      setPlayer2Assignments(prev => ({ ...prev, [roleKey]: character }));
    }

    // Remove character from remaining pool
    setRemainingCharacterIds(prev => prev.filter(id => id !== character.id));

    // Clear drawn character
    setDrawnCharacter(null);
    setDrawnCharacterRating(null);

    // Switch turn
    setCurrentTurn(currentTurn === 1 ? 2 : 1);
  };

  // Navigate to result screen
  const showResults = () => {
    setCurrentScreen(GAME_SCREENS.RESULT);
  };

  // Calculate rating tier based on character's draw score percentile in pool
  const calculateRating = (character) => {
    // Convert to numbers explicitly to handle string values from API
    const charPower = parseFloat(character.character_power) || 0;
    const animePower = parseFloat(character.anime_power_scale) || 0;
    const drawScore = charPower * animePower;

    // Safety check: if no character pool, default to C tier
    if (!characterPool || characterPool.length === 0) {
      console.warn('Character pool is empty, defaulting to C tier');
      return { tier: 'C', percentile: '50.0' };
    }

    // Calculate all draw scores in pool
    const allScores = characterPool.map(char => {
      const cp = parseFloat(char.character_power) || 0;
      const ap = parseFloat(char.anime_power_scale) || 0;
      return cp * ap;
    }).filter(score => score > 0).sort((a, b) => a - b);

    // Safety check: if no valid scores, default to C tier
    if (allScores.length === 0) {
      console.warn('No valid scores in pool, defaulting to C tier');
      return { tier: 'C', percentile: '50.0' };
    }

    // Find percentile
    const rank = allScores.filter(score => score < drawScore).length;
    const percentile = (rank / allScores.length) * 100;

    // Map to tier
    let tier;
    if (percentile >= 90) tier = 'S';
    else if (percentile >= 70) tier = 'A';
    else if (percentile >= 40) tier = 'B';
    else if (percentile >= 10) tier = 'C';
    else tier = 'D';

    return { tier, percentile: percentile.toFixed(1) };
  };

  // Draw a random character from the pool
  const drawCharacter = async () => {
    if (isDrawing || remainingCharacterIds.length === 0) return;

    setIsDrawing(true);

    try {
      // Wait 4 seconds for shuffle animation
      await new Promise(resolve => setTimeout(resolve, 4000));

      const response = await axios.post(`${API_BASE_URL}/draw/`, {
        remainingCharacterIds: remainingCharacterIds,
      });

      const character = response.data.character;

      // Validate character data
      if (!character) {
        throw new Error('No character data received from API');
      }

      console.log('Drew character:', character.name, {
        power: character.character_power,
        scale: character.anime_power_scale,
        drawScore: (parseFloat(character.character_power) || 0) * (parseFloat(character.anime_power_scale) || 0)
      });

      const rating = calculateRating(character);

      setDrawnCharacter(character);
      setDrawnCharacterRating(rating);
    } catch (error) {
      console.error('Failed to draw character:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Failed to draw character: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsDrawing(false);
    }
  };

  // Clear drawn character (after placing)
  const clearDrawnCharacter = () => {
    setDrawnCharacter(null);
    setDrawnCharacterRating(null);
  };

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = soundManager.toggleMute();
    setMuted(newMutedState);
    return newMutedState;
  };

  // Unlock audio (for autoplay restrictions)
  const unlockAudio = async () => {
    if (audioUnlocked) return;
    await soundManager.unlockAudio();
    setAudioUnlocked(true);
  };

  // Play tier sound
  const playTierSound = (tier) => {
    soundManager.playTierSound(tier);
  };

  // Play victory sound
  const playVictorySound = () => {
    soundManager.playVictory();
  };

  // Play defeat sound
  const playDefeatSound = () => {
    soundManager.playDefeat();
  };

  // Play draw sound
  const playDrawSound = () => {
    soundManager.playDraw();
  };

  // Calculate final scores by calling the API
  const calculateFinalScore = async () => {
    if (!selectedTemplate) {
      throw new Error('No template selected');
    }

    try {
      // Transform assignments from {roleKey: character} to API format
      // roleKey format: "ROLE-index" e.g., "CAPTAIN-0"
      const transformAssignments = (assignments) => {
        return Object.entries(assignments).map(([roleKey, character]) => {
          // Extract role name from roleKey (remove the "-index" suffix)
          const role = roleKey.split('-').slice(0, -1).join('-');
          return {
            role: role,
            characterId: character.id
          };
        });
      };

      const requestData = {
        templateId: selectedTemplate.id,
        leftTeam: {
          assignments: transformAssignments(player1Assignments)
        },
        rightTeam: {
          assignments: transformAssignments(player2Assignments)
        }
      };

      console.log('Calculating final score with data:', requestData);

      const response = await axios.post(`${API_BASE_URL}/score/`, requestData);

      console.log('Score calculation response:', response.data);

      return response.data;
    } catch (error) {
      console.error('Failed to calculate final score:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };

  const value = {
    // Screen state
    currentScreen,
    setCurrentScreen,

    // Game configuration
    selectedTemplate,
    setSelectedTemplate,
    selectedAnimeIds,
    setSelectedAnimeIds,
    player1Name,
    setPlayer1Name,
    player2Name,
    setPlayer2Name,

    // Character pool
    characterPool,
    setCharacterPool,
    remainingCharacterIds,
    setRemainingCharacterIds,

    // Draft state
    drawnCharacter,
    setDrawnCharacter,
    drawnCharacterRating,
    setDrawnCharacterRating,
    isDrawing,
    setIsDrawing,

    // Game state
    currentTurn,
    setCurrentTurn,
    player1Assignments,
    setPlayer1Assignments,
    player2Assignments,
    setPlayer2Assignments,

    // Actions
    startGame,
    resetGame,
    playAgain,
    assignCharacter,
    showResults,
    drawCharacter,
    clearDrawnCharacter,
    calculateRating,
    calculateFinalScore,

    // Sound
    muted,
    audioUnlocked,
    toggleMute,
    unlockAudio,
    playTierSound,
    playVictorySound,
    playDefeatSound,
    playDrawSound,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
