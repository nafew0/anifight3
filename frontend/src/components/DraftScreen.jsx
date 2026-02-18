import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import CharacterCard from './CharacterCard';
import RoleSlot from './RoleSlot';
import DrawButton from './DrawButton';
import RatingBanner from './RatingBanner';
import useWindowDimensions from '../hooks/useWindowDimensions';

const DraftScreen = () => {
  const location = useLocation();

  // Single-device game context
  const gameContext = useGame();

  // Multiplayer context
  const multiplayerContext = useMultiplayer();
  const { ws, playerRole, gameState: mpGameState, opponentConnected, isReconnecting, isMultiplayerGame } = multiplayerContext;

  // Use isMultiplayerGame from context instead of checking pathname
  const isMultiplayer = isMultiplayerGame;

  // Use appropriate context based on mode
  const {
    selectedTemplate,
    player1Name,
    player2Name,
    currentTurn,
    player1Assignments,
    player2Assignments,
    remainingCharacterIds,
    characterPool,
    drawnCharacter,
    drawnCharacterRating,
    isDrawing,
    drawCharacter: gameDrawCharacter,
    assignCharacter: gameAssignCharacter,
    showResults,
    resetGame,
    muted,
    audioUnlocked,
    toggleMute,
    unlockAudio,
    playTierSound,
    playDrawSound,
  } = gameContext;

  const [showRatingBanner, setShowRatingBanner] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // For mobile tap-to-place and keyboard navigation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const [keyboardSlotIndex, setKeyboardSlotIndex] = useState(0); // Track selected slot via keyboard

  // Multiplayer-specific state
  const [disconnectCountdown, setDisconnectCountdown] = useState(null);
  const [opponentWasConnected, setOpponentWasConnected] = useState(false);

  // Multiplayer: Wrap draw and assign functions
  const drawCharacter = async () => {
    if (isMultiplayer) {
      // Check if it's this player's turn
      const myTurn = (playerRole === 'host' && currentTurn === 1) || (playerRole === 'guest' && currentTurn === 2);
      console.log('[DraftScreen] Draw attempt - Role:', playerRole, 'Turn:', currentTurn, 'MyTurn:', myTurn);
      if (!myTurn) {
        console.log('[DraftScreen] Not your turn!');
        return;
      }
    }

    // Call the original draw function
    console.log('[DraftScreen] Drawing character...');
    const character = await gameDrawCharacter();

    // If multiplayer, broadcast the drawn character
    if (isMultiplayer && ws && character) {
      console.log('[DraftScreen] Broadcasting drawn character:', character.name);
      ws.drawCharacter(character);
    }

    return character;
  };

  const assignCharacter = (playerNum, roleKey, character) => {
    if (isMultiplayer) {
      // Check if it's this player's turn
      const myTurn = (playerRole === 'host' && playerNum === 1) || (playerRole === 'guest' && playerNum === 2);
      console.log('[DraftScreen] Assign attempt - Role:', playerRole, 'PlayerNum:', playerNum, 'MyTurn:', myTurn);
      if (!myTurn) {
        console.log('[DraftScreen] Not your turn!');
        return;
      }
    }

    // Call the original assign function
    console.log('[DraftScreen] Assigning character:', character.name, 'to', roleKey);
    gameAssignCharacter(playerNum, roleKey, character);

    // If multiplayer, broadcast the placement
    if (isMultiplayer && ws) {
      console.log('[DraftScreen] Broadcasting placement:', character.id, roleKey);
      ws.placeCharacter(character.id, roleKey);
    }
  };

  // Multiplayer: Track if opponent was ever connected
  useEffect(() => {
    if (isMultiplayer && opponentConnected) {
      setOpponentWasConnected(true);
    }
  }, [isMultiplayer, opponentConnected]);

  // Multiplayer: Handle opponent disconnect countdown
  useEffect(() => {
    if (!isMultiplayer) return;

    // Only show disconnect warning if opponent WAS connected before
    if (!opponentConnected && opponentWasConnected && disconnectCountdown === null) {
      console.log('[DraftScreen] Opponent disconnected, starting countdown...');
      // Start 10-second countdown
      setDisconnectCountdown(10);

      const interval = setInterval(() => {
        setDisconnectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            console.log('[DraftScreen] Countdown complete, showing results...');
            // Show results after countdown
            showResults();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (opponentConnected && disconnectCountdown !== null) {
      // Opponent reconnected, cancel countdown
      console.log('[DraftScreen] Opponent reconnected, canceling countdown');
      setDisconnectCountdown(null);
    }
  }, [isMultiplayer, opponentConnected, opponentWasConnected, disconnectCountdown, showResults]);

  // Multiplayer: Sync WebSocket events to GameContext
  useEffect(() => {
    if (!isMultiplayer || !mpGameState) return;

    console.log('[DraftScreen] Multiplayer game state updated:', mpGameState);

    // Sync host placements to Player 1
    if (mpGameState.host_placements) {
      Object.entries(mpGameState.host_placements).forEach(([roleKey, characterId]) => {
        if (!player1Assignments[roleKey]) {
          // Find character in pool
          const character = characterPool.find(c => c.id === characterId);
          if (character) {
            console.log('[DraftScreen] Syncing host placement:', roleKey, character.name);
            gameAssignCharacter(1, roleKey, character);
          }
        }
      });
    }

    // Sync guest placements to Player 2
    if (mpGameState.guest_placements) {
      Object.entries(mpGameState.guest_placements).forEach(([roleKey, characterId]) => {
        if (!player2Assignments[roleKey]) {
          // Find character in pool
          const character = characterPool.find(c => c.id === characterId);
          if (character) {
            console.log('[DraftScreen] Syncing guest placement:', roleKey, character.name);
            gameAssignCharacter(2, roleKey, character);
          }
        }
      });
    }

    // Check if game is complete
    if (mpGameState.is_complete) {
      console.log('[DraftScreen] Game complete, showing results');
      showResults();
    }
  }, [isMultiplayer, mpGameState, playerRole, player1Assignments, player2Assignments, characterPool, gameAssignCharacter, showResults]);

  // Get window dimensions for dynamic sizing
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Calculate dynamic slot dimensions to fit all 6 slots on screen
  const { slotHeight, slotWidth, middleColumnWidth, playerColumnWidth } = useMemo(() => {
    const FOOTER_HEIGHT = 32;
    const CONTAINER_PADDING_TOP_BOTTOM = 8; // p-1 = 4px top + 4px bottom
    const PLAYER_BOX_PADDING_TOP_BOTTOM = 8; // p-1 = 4px top + 4px bottom
    const PLAYER_BOX_PADDING_LEFT_RIGHT = 8; // p-1 = 4px left + 4px right
    const PLAYER_HEADER_HEIGHT = 32; // Approximate height of header with name and progress
    const PLAYER_HEADER_MARGIN = 4; // mb-1
    const GAP_HEIGHT = 4; // gap between slots (space-y-1)
    const NUMBER_OF_SLOTS = selectedTemplate?.roles.length || 6;
    const HORIZONTAL_GAP = 4; // gap between columns
    const SAFETY_MARGIN = 20; // Increased safety margin

    // Calculate height (slots need to be square)
    // Account for: footer, container padding, player box padding, header height, header margin, gaps between slots, and safety margin
    const availableHeight = windowHeight
      - FOOTER_HEIGHT
      - CONTAINER_PADDING_TOP_BOTTOM
      - PLAYER_BOX_PADDING_TOP_BOTTOM
      - PLAYER_HEADER_HEIGHT
      - PLAYER_HEADER_MARGIN
      - ((NUMBER_OF_SLOTS - 1) * GAP_HEIGHT)
      - SAFETY_MARGIN;

    const calculatedHeight = Math.floor(availableHeight / NUMBER_OF_SLOTS);
    const finalHeight = Math.max(calculatedHeight, 60);

    // Slot width = height (square slots)
    const slotWidth = finalHeight;

    // Player column width = slot width + padding on both sides
    const playerColumnWidth = slotWidth + PLAYER_BOX_PADDING_LEFT_RIGHT;

    // Middle column max width is 2x slot width
    const finalMiddleWidth = 2 * finalHeight;

    return {
      slotHeight: finalHeight,
      slotWidth: slotWidth,
      middleColumnWidth: finalMiddleWidth,
      playerColumnWidth: playerColumnWidth
    };
  }, [windowHeight, windowWidth, selectedTemplate]);

  // Calculate if game is complete
  const isGameComplete = useMemo(() => {
    if (!selectedTemplate) return false;
    return (
      Object.keys(player1Assignments).length === selectedTemplate.roles.length &&
      Object.keys(player2Assignments).length === selectedTemplate.roles.length
    );
  }, [player1Assignments, player2Assignments, selectedTemplate]);

  // Show rating banner and play sound when character is drawn
  useEffect(() => {
    if (drawnCharacter && drawnCharacterRating) {
      setShowRatingBanner(true);

      // Play tier sound
      playTierSound(drawnCharacterRating.tier);

      // Hide banner after 3 seconds
      const timer = setTimeout(() => {
        setShowRatingBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowRatingBanner(false);
    }
  }, [drawnCharacter, drawnCharacterRating, playTierSound]);

  // Check if game is complete
  useEffect(() => {
    if (!selectedTemplate) return;

    const rolesCount = selectedTemplate.roles.length;
    const p1Complete = Object.keys(player1Assignments).length === rolesCount;
    const p2Complete = Object.keys(player2Assignments).length === rolesCount;

    if (p1Complete && p2Complete) {
      // Auto-navigate to results after 1 second
      const timer = setTimeout(() => {
        showResults();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [player1Assignments, player2Assignments, selectedTemplate, showResults]);

  // DnD sensor configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || !drawnCharacter) return;

    const { roleKey, playerNumber } = over.data.current;

    // Only allow placement on current player's slots
    if (playerNumber !== currentTurn) return;

    // Assign character to role
    assignCharacter(currentTurn, roleKey, drawnCharacter);
    setSelectedSlot(null);
  };

  // Handle slot click for mobile tap-to-place
  const handleSlotClick = (roleKey, playerNumber) => {
    if (!drawnCharacter) return;
    if (playerNumber !== currentTurn) return;

    // Check if slot is empty
    const assignments = playerNumber === 1 ? player1Assignments : player2Assignments;
    if (assignments[roleKey]) return;

    // Assign character to role
    assignCharacter(currentTurn, roleKey, drawnCharacter);
    setSelectedSlot(null);
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = () => {
    resetGame();
    setShowResetConfirm(false);
  };

  const handleResetCancel = () => {
    setShowResetConfirm(false);
  };

  const handleMuteToggle = () => {
    toggleMute();
  };

  const handleEnableAudio = async () => {
    await unlockAudio();
    setShowAudioPrompt(false);
  };

  const handleMuteAudio = () => {
    toggleMute(); // Mute the audio
    setShowAudioPrompt(false);
  };

  // Show audio unlock prompt on first draw if not unlocked
  useEffect(() => {
    if (drawnCharacter && !audioUnlocked && !muted) {
      setShowAudioPrompt(true);
    }
  }, [drawnCharacter, audioUnlocked, muted]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle keyboard if modal is open
      if (showResetConfirm || showAudioPrompt) return;

      // Don't handle if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (!selectedTemplate) return;

      const rolesCount = selectedTemplate.roles.length;
      const currentPlayerAssignments = currentTurn === 1 ? player1Assignments : player2Assignments;

      // Get available slot indices for current player
      const availableSlotIndices = selectedTemplate.roles
        .map((role, index) => {
          const roleKey = `${role}-${index}`;
          return currentPlayerAssignments[roleKey] ? null : index;
        })
        .filter(index => index !== null);

      switch (e.key) {
        case 'ArrowUp':
          if (drawnCharacter && availableSlotIndices.length > 0) {
            e.preventDefault();
            setKeyboardSlotIndex(prev => {
              const currentIndexInAvailable = availableSlotIndices.indexOf(prev);
              if (currentIndexInAvailable === -1 || currentIndexInAvailable === 0) {
                return availableSlotIndices[availableSlotIndices.length - 1];
              }
              return availableSlotIndices[currentIndexInAvailable - 1];
            });
          }
          break;

        case 'ArrowDown':
          if (drawnCharacter && availableSlotIndices.length > 0) {
            e.preventDefault();
            setKeyboardSlotIndex(prev => {
              const currentIndexInAvailable = availableSlotIndices.indexOf(prev);
              if (currentIndexInAvailable === -1 || currentIndexInAvailable === availableSlotIndices.length - 1) {
                return availableSlotIndices[0];
              }
              return availableSlotIndices[currentIndexInAvailable + 1];
            });
          }
          break;

        case 'Enter':
        case ' ':
          if (drawnCharacter && availableSlotIndices.length > 0) {
            // Place character in selected slot
            e.preventDefault();
            const role = selectedTemplate.roles[keyboardSlotIndex];
            const roleKey = `${role}-${keyboardSlotIndex}`;
            if (!currentPlayerAssignments[roleKey]) {
              assignCharacter(currentTurn, roleKey, drawnCharacter);
              setKeyboardSlotIndex(0);
            }
          } else if (!drawnCharacter && remainingCharacterIds.length > 0 && !isGameComplete && !isDrawing) {
            // Draw character
            e.preventDefault();
            drawCharacter();
          }
          break;

        case 'Escape':
          if (drawnCharacter) {
            e.preventDefault();
            setKeyboardSlotIndex(0);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    drawnCharacter,
    selectedTemplate,
    currentTurn,
    player1Assignments,
    player2Assignments,
    remainingCharacterIds,
    isDrawing,
    isGameComplete,
    keyboardSlotIndex,
    assignCharacter,
    drawCharacter,
    showResetConfirm,
    showAudioPrompt,
  ]);

  // Reset keyboard slot index when character is placed
  useEffect(() => {
    if (!drawnCharacter) {
      setKeyboardSlotIndex(0);
    }
  }, [drawnCharacter]);

  if (!selectedTemplate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-400 mb-4">No template selected</p>
          <button
            onClick={resetGame}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center overflow-hidden"
        role="main"
        aria-label="Draft screen"
      >
        {/* Multiplayer Status Banners */}
        {isMultiplayer && (
          <>
            {/* Connection Status Banner */}
            {isReconnecting && (
              <div className="absolute top-0 left-0 right-0 bg-yellow-600 text-white px-4 py-2 text-center z-50 text-sm">
                Reconnecting...
              </div>
            )}

            {/* Opponent Disconnect Banner */}
            {disconnectCountdown !== null && (
              <div className="absolute top-0 left-0 right-0 bg-orange-600 text-white px-4 py-2 text-center z-50 text-sm">
                Opponent disconnected. Auto-ending game in {disconnectCountdown}s...
              </div>
            )}

            {/* Turn Indicator */}
            {!isReconnecting && !disconnectCountdown && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-40">
                {((playerRole === 'host' && currentTurn === 1) || (playerRole === 'guest' && currentTurn === 2)) ? (
                  <div className="bg-green-600 text-white px-6 py-2 rounded-full shadow-lg font-semibold text-sm">
                    Your Turn
                  </div>
                ) : (
                  <div className="bg-gray-600 text-gray-300 px-6 py-2 rounded-full shadow-lg font-semibold text-sm">
                    Opponent's Turn
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="w-full h-full flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-row gap-1 p-1 overflow-hidden justify-center items-center">
          {/* Main Game Area - 3 Column Layout - Always Horizontal */}
          {/* Left Column - Player 1 */}
          <div className="flex flex-col" style={{ width: `${playerColumnWidth}px` }}>
            <motion.div
              animate={{
                scale: currentTurn === 1 ? 1.02 : 1,
                opacity: currentTurn === 1 ? 1 : 0.7,
              }}
              transition={{ duration: 0.3 }}
              className={`bg-neutral-800 rounded-lg shadow-lg p-1 flex flex-col h-full border transition-all duration-300 ${
                currentTurn === 1 ? 'border-green-500 shadow-green-500/20' : 'border-gray-700'
              }`}
              role="region"
              aria-label={`${player1Name}'s team`}
            >
              <div className="flex flex-col items-center mb-1">
                <h3 className="text-[10px] font-bold text-indigo-400" aria-label={`Player 1: ${player1Name}`}>{player1Name}</h3>
                <span className="text-[9px] text-neutral-400" aria-label={`${Object.keys(player1Assignments).length} of ${selectedTemplate.roles.length} slots filled`}>
                  {Object.keys(player1Assignments).length}/{selectedTemplate.roles.length}
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-between space-y-1">
                {selectedTemplate.roles.map((role, index) => {
                  const roleKey = `${role}-${index}`;
                  const isKeyboardSelected = currentTurn === 1 && drawnCharacter && keyboardSlotIndex === index && !player1Assignments[roleKey];
                  return (
                    <RoleSlot
                      key={`p1-${roleKey}`}
                      roleKey={roleKey}
                      roleName={role}
                      character={player1Assignments[roleKey]}
                      isActive={currentTurn === 1 && !!drawnCharacter}
                      isHighlighted={currentTurn === 1 && !!drawnCharacter && !player1Assignments[roleKey]}
                      isKeyboardSelected={isKeyboardSelected}
                      onClick={() => handleSlotClick(roleKey, 1)}
                      playerNumber={1}
                      slotHeight={slotHeight}
                      slotWidth={slotWidth}
                    />
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Center Column - Draw Area */}
          <div className="flex flex-col justify-center items-center relative" style={{ width: `${middleColumnWidth}px` }}>
            {/* Role Labels - Absolutely positioned, aligned with slots - Hidden when character is drawn */}
            {!drawnCharacter && (
              <div className="absolute inset-0 flex flex-col justify-center pointer-events-none">
                <div className="flex flex-col justify-between" style={{ height: `${slotHeight * selectedTemplate.roles.length + (selectedTemplate.roles.length - 1) * 4}px` }}>
                  {selectedTemplate.roles.map((role, index) => (
                    <div
                      key={`role-${index}`}
                      className="flex items-center justify-center"
                      style={{ height: `${slotHeight}px` }}
                    >
                      <p className="text-2xl font-bold text-neutral-400 opacity-30 text-center leading-tight">
                        {role}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Draw Button Area - Centered */}
            <div className={`transition-all duration-300 z-10 ${drawnCharacter ? 'w-full px-4' : 'w-32'}`}>
              {/* Rating Banner */}
              <div className="min-h-[30px] flex items-center justify-center mb-2">
                <AnimatePresence mode="wait">
                  {showRatingBanner && drawnCharacterRating && (
                    <RatingBanner
                      tier={drawnCharacterRating.tier}
                      show={showRatingBanner}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Drawn Character or Draw Button */}
              <div className="bg-neutral-800 rounded-lg shadow-lg p-2 border border-gray-700">
                {drawnCharacter ? (
                  <div>
                    <CharacterCard
                      character={drawnCharacter}
                      isDraggable={true}
                      showSpecialties={false}
                    />
                    <p className="text-center text-[8px] text-neutral-600 mt-1">
                      Tap slot
                    </p>
                  </div>
                ) : (
                  <div>
                    <DrawButton
                      onClick={drawCharacter}
                      disabled={isDrawing || remainingCharacterIds.length === 0 || isGameComplete}
                      isShuffling={isDrawing}
                      characterPool={characterPool}
                      remainingCount={remainingCharacterIds.length}
                      playDrawSound={playDrawSound}
                    />
                  </div>
                )}

                {/* Turn Indicator */}
                <motion.div
                  key={currentTurn}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded p-1 text-center border border-indigo-700/50 mt-2"
                  role="status"
                  aria-live="polite"
                  aria-label={`Current turn: ${currentTurn === 1 ? player1Name : player2Name}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${currentTurn === 1 ? 'bg-success animate-pulse' : 'bg-neutral-600'}`} aria-hidden="true" />
                    <p className="text-[9px] font-bold text-indigo-300 leading-tight">
                      {currentTurn === 1 ? player1Name : player2Name}'s Turn
                    </p>
                    <div className={`w-1.5 h-1.5 rounded-full ${currentTurn === 2 ? 'bg-success animate-pulse' : 'bg-neutral-600'}`} aria-hidden="true" />
                  </div>
                </motion.div>

                <div
                  className="text-center text-[8px] text-neutral-400 leading-tight mt-1"
                  role="status"
                  aria-label={`${remainingCharacterIds.length} characters remaining`}
                >
                  {remainingCharacterIds.length} left
                </div>

                {/* Game Complete Message */}
                {isGameComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-900/30 border border-green-500 rounded p-1 text-center mt-2"
                  >
                    <svg className="w-4 h-4 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-green-400 font-bold text-[9px]">Complete!</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Player 2 */}
          <div className="flex flex-col" style={{ width: `${playerColumnWidth}px` }}>
            <motion.div
              animate={{
                scale: currentTurn === 2 ? 1.02 : 1,
                opacity: currentTurn === 2 ? 1 : 0.7,
              }}
              transition={{ duration: 0.3 }}
              className={`bg-neutral-800 rounded-lg shadow-lg p-1 flex flex-col h-full border transition-all duration-300 ${
                currentTurn === 2 ? 'border-green-500 shadow-green-500/20' : 'border-gray-700'
              }`}
              role="region"
              aria-label={`${player2Name}'s team`}
            >
              <div className="flex flex-col items-center mb-1">
                <h3 className="text-[10px] font-bold text-indigo-400" aria-label={`Player 2: ${player2Name}`}>{player2Name}</h3>
                <span className="text-[9px] text-neutral-400" aria-label={`${Object.keys(player2Assignments).length} of ${selectedTemplate.roles.length} slots filled`}>
                  {Object.keys(player2Assignments).length}/{selectedTemplate.roles.length}
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-between space-y-1">
                {selectedTemplate.roles.map((role, index) => {
                  const roleKey = `${role}-${index}`;
                  const isKeyboardSelected = currentTurn === 2 && drawnCharacter && keyboardSlotIndex === index && !player2Assignments[roleKey];
                  return (
                    <RoleSlot
                      key={`p2-${roleKey}`}
                      roleKey={roleKey}
                      roleName={role}
                      character={player2Assignments[roleKey]}
                      isActive={currentTurn === 2 && !!drawnCharacter}
                      isHighlighted={currentTurn === 2 && !!drawnCharacter && !player2Assignments[roleKey]}
                      isKeyboardSelected={isKeyboardSelected}
                      onClick={() => handleSlotClick(roleKey, 2)}
                      playerNumber={2}
                      slotHeight={slotHeight}
                      slotWidth={slotWidth}
                    />
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex-none flex items-center justify-between bg-neutral-800 shadow-lg px-2 py-1 border-t border-gray-700">
          <button
            onClick={handleMuteToggle}
            className="p-1 hover:bg-neutral-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            title={muted ? 'Unmute' : 'Mute'}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          >
            {muted ? (
              <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <button
            onClick={handleResetClick}
            className="px-2 py-1 bg-danger hover:bg-danger-dark text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            aria-label="Reset game"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Reset
          </button>
        </div>
      </div>
      </div>

      {/* Audio Unlock Prompt */}
      <AnimatePresence>
        {showAudioPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-2xl p-4 border border-indigo-400">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-sm mb-1">Enable Sound?</h3>
                  <p className="text-indigo-100 text-xs mb-3">
                    Tap to enable sound effects for character draws!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnableAudio}
                      className="flex-1 px-3 py-2 bg-white text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors"
                    >
                      Enable Sound
                    </button>
                    <button
                      onClick={handleMuteAudio}
                      className="px-3 py-2 bg-indigo-700 text-white rounded-lg text-xs font-medium hover:bg-indigo-800 transition-colors"
                    >
                      Mute
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleResetCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-800 border border-gray-700 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            >
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-red-900/30 rounded-full mb-4">
                  <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Reset Match?</h3>
                <p className="text-neutral-400">
                  This will clear all assignments and return to the start screen. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleResetCancel}
                  className="flex-1 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetConfirm}
                  className="flex-1 px-4 py-3 bg-danger hover:bg-danger-dark text-white rounded-lg font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DndContext>
  );
};

export default DraftScreen;
