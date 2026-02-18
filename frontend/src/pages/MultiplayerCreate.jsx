import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import apiClient from '../services/api';

const MultiplayerCreate = () => {
  const navigate = useNavigate();
  const { ws, connect, isConnected, opponentConnected, gameState } = useMultiplayer();

  const [roomCode, setRoomCode] = useState(null);
  const [joinUrl, setJoinUrl] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hostNickname, setHostNickname] = useState('Player 1');
  const [guestNickname, setGuestNickname] = useState(null);

  // Get game config from localStorage (set by StartScreen)
  const [gameConfig, setGameConfig] = useState(null);

  useEffect(() => {
    const config = localStorage.getItem('multiplayer_game_config');
    if (config) {
      setGameConfig(JSON.parse(config));
    } else {
      // No config, redirect back
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (gameConfig && !roomCode) {
      createRoom();
    }
  }, [gameConfig, roomCode]);

  const createRoom = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/multiplayer/rooms/create_room/', {
        host_nickname: gameConfig.hostNickname || hostNickname,
        template_id: gameConfig.templateId,
        anime_pool_ids: gameConfig.animePoolIds,
      });

      setRoomCode(response.data.room_code);
      setJoinUrl(response.data.join_url);
      setQrCode(response.data.qr_code);

      // Connect to WebSocket
      connect(response.data.room_code);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
      console.error('Failed to create room:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyJoinLink = () => {
    navigator.clipboard.writeText(joinUrl);
    alert('Join link copied to clipboard!');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    alert('Room code copied to clipboard!');
  };

  const handleStartGame = () => {
    if (opponentConnected) {
      // Start the game via WebSocket
      if (gameConfig) {
        ws.startGame(gameConfig.templateId, gameConfig.animePoolIds);
      }
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  // Listen for guest joining and game start
  useEffect(() => {
    if (gameState) {
      console.log('[MultiplayerCreate] Game state updated:', gameState);
      console.log('[MultiplayerCreate] Current roomCode:', roomCode);

      // Update guest nickname if available
      if (gameState.guest_nickname) {
        setGuestNickname(gameState.guest_nickname);
      }

      // Navigate to multiplayer game screen when game starts
      if (gameState.status === 'in_progress' && roomCode) {
        console.log('[MultiplayerCreate] ✓ Game started, navigating to:', `/multiplayer/game/${roomCode}`);
        navigate(`/multiplayer/game/${roomCode}`);
      } else if (gameState.status === 'in_progress' && !roomCode) {
        console.error('[MultiplayerCreate] ✗ Game started but roomCode is missing!');
      }
    }
  }, [gameState, roomCode, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Creating room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-gray-800 rounded-xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Online Multiplayer
        </h1>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {roomCode && (
          <>
            {/* Room Code Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Room Code</h2>
              <div className="bg-gray-700 rounded-lg p-6 flex items-center justify-between">
                <div className="text-5xl font-mono font-bold text-indigo-400 tracking-widest">
                  {roomCode}
                </div>
                <button
                  onClick={copyRoomCode}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Copy Code
                </button>
              </div>
            </div>

            {/* Join Link Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Join Link</h2>
              <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div className="text-sm text-gray-300 truncate flex-1 mr-4">
                  {joinUrl}
                </div>
                <button
                  onClick={copyJoinLink}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4 text-center">
                Scan QR Code
              </h2>
              <div className="flex justify-center bg-white rounded-lg p-6">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                ) : (
                  <QRCodeSVG value={joinUrl || ''} size={256} />
                )}
              </div>
            </div>

            {/* Waiting/Player Status */}
            <div className="mb-8">
              <AnimatePresence mode="wait">
                {!opponentConnected ? (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="text-xl text-gray-300 mb-4">
                      Waiting for other player to join
                      <span className="animate-pulse">...</span>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ready"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-green-600 rounded-lg p-6"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-white">
                        <div className="font-semibold text-lg">{guestNickname || 'Player 2'} has joined!</div>
                        <div className="text-sm text-green-100">Ready to start the game</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartGame}
                disabled={!opponentConnected}
                className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                  opponentConnected
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                }`}
              >
                Start Game
              </button>
            </div>

            {/* Connection Status */}
            <div className="mt-6 text-center text-sm text-gray-400">
              {isConnected ? (
                <span className="text-green-400">● Connected</span>
              ) : (
                <span className="text-red-400">● Disconnected</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MultiplayerCreate;
